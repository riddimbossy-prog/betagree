import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BankerCard, RULE_LABEL, RULE_ORDER } from "@/components/banker-card";
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

  const dated = useMemo(() => {
    return picks.filter((p) => {
      if (when === "today") return isPlayingToday(p.kickoff);
      if (when === "tomorrow") return isPlayingTomorrow(p.kickoff);
      return true;
    });
  }, [picks, when]);

  const visible = useMemo(() => (rule === "all" ? dated : dated.filter((p) => p.rule === rule)), [dated, rule]);

  const grouped = useMemo(() => {
    const by = new Map<string, typeof visible>();
    for (const pick of visible) {
      const list = by.get(pick.rule) ?? [];
      list.push(pick);
      by.set(pick.rule, list);
    }
    const keys = [
      ...RULE_ORDER.filter((id) => by.has(id)),
      ...[...by.keys()].filter((id) => !RULE_ORDER.includes(id as (typeof RULE_ORDER)[number])),
    ];
    return keys.map((id) => ({ id, label: RULE_LABEL[id] ?? id, picks: by.get(id) ?? [] }));
  }, [visible]);

  const rules = RULE_ORDER.filter((id) => dated.some((p) => p.rule === id));
  const skips = data?.meta?.skips ?? {};

  return (
    <div className="flex flex-col gap-5 fold:gap-8">
      <header className="max-w-2xl">
        <LiveBar fetchedAt={data?.fetchedAt} />
        <h1 className="mt-2 text-3xl font-semibold fold:text-5xl">
          Banker <span className="font-serif italic font-normal">desk</span>
        </h1>
        <p className="mt-2 text-sm text-subtle">
          {loading ? "Loading…" : `${visible.length} signal${visible.length === 1 ? "" : "s"} · last 5 home vs last 5 away`}
        </p>
      </header>

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
      </div>

      {rules.length ? (
        <div className="chip-row" role="group" aria-label="Rule">
          <button
            type="button"
            onClick={() => setRule("all")}
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm",
              rule === "all" ? "glass-purpure font-semibold text-primary-foreground" : "glass text-muted-foreground",
            )}
          >
            All rules
          </button>
          {rules.map((id) => {
            const n = dated.filter((p) => p.rule === id).length;
            return (
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
                <span className="ml-2 tabular">{n}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Qualified", picks.length],
          ["Early season", skips["early-season"] ?? 0],
          ["Home under 1 PPG", skips["home-under-1-ppg"] ?? 0],
          ["Split top 5", skips["both-top-five"] ?? 0],
        ].map(([label, n]) => (
          <div key={String(label)} className="glass rounded-2xl px-3 py-2.5">
            <small className="block text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</small>
            <b className="tabular text-xl">{n}</b>
          </div>
        ))}
      </div>

      <BoardState
        loading={loading && !data}
        error={error}
        empty={!loading && !error && visible.length === 0}
        emptyLabel={when === "today" ? "No banker passed for today." : "No fixture passed the banker rules."}
        onRetry={reload}
      />

      {grouped.map((section) => (
        <section key={section.id}>
          <h2 className="text-2xl font-semibold">
            {section.label.split(" ")[0]}{" "}
            <span className="font-serif italic font-normal">{section.label.split(" ").slice(1).join(" ") || "rule"}</span>
            <span className="ml-2 text-base font-medium text-muted-foreground tabular">{section.picks.length}</span>
          </h2>
          <ul className="mt-3 grid gap-3 fold:grid-cols-2">
            {section.picks.map((pick) => (
              <li key={`${pick.fixtureId}-${pick.rule}`}>
                <BankerCard pick={pick} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
