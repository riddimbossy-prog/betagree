import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BankerCard, PICK_LABEL, PICK_ORDER, pickKind } from "@/components/banker-card";
import { BoardState, LiveBar } from "@/components/live-bar";
import { isPlayingToday, isPlayingTomorrow } from "@/lib/format";
import { useBankers } from "@/lib/live/use-live";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/banker")({ component: BankerPage });

type WhenFilter = "today" | "tomorrow" | "all";

export function BankerPage() {
  const { data, error, loading, reload } = useBankers();
  const picks = data?.picks ?? [];
  const todayN = picks.filter((p) => isPlayingToday(p.kickoff)).length;
  const tomN = picks.filter((p) => isPlayingTomorrow(p.kickoff)).length;
  const [when, setWhen] = useState<WhenFilter>("today");
  const [kind, setKind] = useState("all");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (touched || !data) return;
    if (tomN > 0 && todayN === 0) setWhen("tomorrow");
    else if (todayN > 0) setWhen("today");
    else setWhen("all");
  }, [data, todayN, tomN, touched]);

  const dated = useMemo(() => {
    return picks.filter((p) => {
      if (when === "today") return isPlayingToday(p.kickoff);
      if (when === "tomorrow") return isPlayingTomorrow(p.kickoff);
      return true;
    });
  }, [picks, when]);

  const visible = useMemo(
    () => (kind === "all" ? dated : dated.filter((p) => pickKind(p) === kind)),
    [dated, kind],
  );

  const grouped = useMemo(() => {
    const by = new Map<string, typeof visible>();
    for (const pick of visible) {
      const key = pickKind(pick);
      const list = by.get(key) ?? [];
      list.push(pick);
      by.set(key, list);
    }
    return PICK_ORDER.filter((id) => by.has(id)).map((id) => ({
      id,
      label: PICK_LABEL[id],
      picks: by.get(id) ?? [],
    }));
  }, [visible]);

  const kinds = PICK_ORDER.filter((id) => dated.some((p) => pickKind(p) === id));

  return (
    <div className="flex flex-col gap-5 fold:gap-8">
      <header className="max-w-2xl">
        <LiveBar fetchedAt={data?.fetchedAt} />
        <h1 className="mt-2 text-3xl font-semibold fold:text-5xl">
          Banker <span className="font-serif italic font-normal">desk</span>
        </h1>
        <p className="mt-2 text-sm text-subtle">{loading ? "Loading…" : `${visible.length} on the board`}</p>
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
            onClick={() => {
              setTouched(true);
              setWhen(id);
            }}
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

      {kinds.length > 1 ? (
        <div className="chip-row" role="group" aria-label="Pick">
          {kinds.map((id) => {
            const n = dated.filter((p) => pickKind(p) === id).length;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setKind(kind === id ? "all" : id)}
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm",
                  kind === id ? "glass-purpure font-semibold text-primary-foreground" : "glass text-muted-foreground",
                )}
              >
                {PICK_LABEL[id]}
                <span className="ml-2 tabular">{n}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <BoardState
        loading={loading && !data}
        error={error}
        empty={!loading && !error && visible.length === 0}
        emptyLabel={when === "today" ? "No bankers today." : "No bankers listed."}
        onRetry={reload}
      />

      {grouped.map((section) => (
        <section key={section.id}>
          <h2 className="text-2xl font-semibold">
            {section.label.split(" ")[0]}{" "}
            <span className="font-serif italic font-normal">{section.label.split(" ").slice(1).join(" ") || "picks"}</span>
          </h2>
          <ul className="mt-3 grid gap-3 fold:grid-cols-2">
            {section.picks.map((pick) => (
              <li key={`${pick.fixtureId}-${pick.selection}`}>
                <BankerCard pick={pick} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
