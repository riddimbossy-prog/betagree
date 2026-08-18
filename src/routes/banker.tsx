import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BankerCard, RULE_LABEL } from "@/components/banker-card";
import { BoardState, LiveBar } from "@/components/live-bar";
import { isPlayingToday, isPlayingTomorrow } from "@/lib/format";
import { useBankers } from "@/lib/live/use-live";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/banker")({ component: BankerPage });

type WhenFilter = "today" | "tomorrow" | "all";

export function BankerPage() {
  const { data, error, loading, reload } = useBankers();
  const [when, setWhen] = useState<WhenFilter>("tomorrow");
  const [rule, setRule] = useState("all");

  const picks = data?.picks ?? [];
  const todayN = picks.filter((p) => isPlayingToday(p.kickoff)).length;
  const tomN = picks.filter((p) => isPlayingTomorrow(p.kickoff)).length;

  const visible = useMemo(() => {
    return picks.filter((p) => {
      if (when === "today" && !isPlayingToday(p.kickoff)) return false;
      if (when === "tomorrow" && !isPlayingTomorrow(p.kickoff)) return false;
      if (rule !== "all" && p.rule !== rule) return false;
      return true;
    });
  }, [picks, when, rule]);

  const rules = [...new Set(picks.map((p) => p.rule))];
  const skips = data?.meta?.skips ?? {};

  return (
    <div className="flex flex-col gap-6 fold:gap-8">
      <header className="max-w-3xl">
        <LiveBar fetchedAt={data?.fetchedAt} />
        <h1 className="mt-2 text-3xl font-semibold fold:text-5xl">
          Banker <span className="font-serif italic font-normal">rules</span>
        </h1>
        <p className="mt-2 text-sm text-subtle">
          Dedicated split-form desk. Last 5 at home vs last 5 away — not the consensus board.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold tracking-wide uppercase">
          <b className="rounded-full bg-destructive/15 px-3 py-1 text-destructive">{`Home <1.00 PPG = skip`}</b>
          <b className="glass rounded-full px-3 py-1">Early season = skip</b>
          <b className="glass rounded-full px-3 py-1">Both split top 5 = skip</b>
          <b className="glass rounded-full px-3 py-1">Exact last 5 home + last 5 away</b>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Qualified", picks.length],
          ["Early skips", skips["early-season"] ?? 0],
          ["Home under 1 PPG", skips["home-under-1-ppg"] ?? 0],
          ["Top-5 clashes", skips["both-top-five"] ?? 0],
        ].map(([label, n]) => (
          <div key={String(label)} className="glass rounded-2xl px-3 py-3">
            <small className="block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</small>
            <b className="tabular text-2xl">{n}</b>
          </div>
        ))}
      </div>

      <div className="chip-row" role="group" aria-label="When">
        {(
          [
            ["today", "Today", todayN],
            ["tomorrow", "Tomorrow", tomN],
            ["all", "All", picks.length],
          ] as const
        ).map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            onClick={() => setWhen(id)}
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm",
              when === id ? "glass-lime font-semibold text-primary-foreground" : "glass text-muted-foreground",
            )}
          >
            {label}
            <span className="ml-2 tabular">{n}</span>
          </button>
        ))}
        {rules.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setRule(rule === id ? "all" : id)}
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm",
              rule === id ? "glass-purpure font-semibold text-primary-foreground" : "glass text-muted-foreground",
            )}
          >
            {RULE_LABEL[id] ?? id}
          </button>
        ))}
      </div>

      <BoardState
        loading={loading && !data}
        error={error}
        empty={!loading && !error && visible.length === 0}
        emptyLabel={when === "today" ? "No banker rule passed for today." : "No fixture passed the dedicated banker rules."}
        onRetry={reload}
      />

      {visible.length ? (
        <ul className="grid gap-3 xl:grid-cols-2">
          {visible.map((pick) => (
            <li key={`${pick.fixtureId}-${pick.rule}`}>
              <BankerCard pick={pick} />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
