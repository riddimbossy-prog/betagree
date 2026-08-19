import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { StreakCard } from "@/components/streak-card";
import { BoardState, LiveBar } from "@/components/live-bar";
import { StreakAccuracyBoard } from "@/components/streak-accuracy";
import { isPlayingToday, isPlayingTomorrow } from "@/lib/format";
import { useStreakAccuracy, useStreaks } from "@/lib/live/use-live";
import type { StreakPick } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/streaks")({ component: StreaksPage });

type WhenFilter = "today" | "tomorrow" | "week" | "all";

function inWhen(pick: StreakPick, when: WhenFilter) {
  if (when === "all") return true;
  if (when === "today") return pick.when === "today" || isPlayingToday(pick.kickoff);
  if (when === "tomorrow") return pick.when === "tomorrow" || isPlayingTomorrow(pick.kickoff);
  return false;
}

function Section({
  id,
  title,
  italic,
  picks,
}: {
  id: string;
  title: string;
  italic: string;
  picks: StreakPick[];
}) {
  if (!picks.length) return null;
  return (
    <section id={id}>
      <h2 className="text-2xl font-semibold">
        {title} <span className="font-serif italic font-normal">{italic}</span>
      </h2>
      <ul className="mt-3 grid gap-3 fold:grid-cols-2 xl:grid-cols-3">
        {picks.map((pick) => (
          <li key={pick.id}>
            <StreakCard pick={pick} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function StreaksPage() {
  const { data, error, loading, reload } = useStreaks();
  const accuracy = useStreakAccuracy();
  const [when, setWhen] = useState<WhenFilter>("tomorrow");

  useEffect(() => {
    if (!data) return;
    if ((data.counts?.today ?? 0) > 0 && (data.counts?.tomorrow ?? 0) === 0) setWhen("today");
  }, [data?.fetchedAt]);

  const twoAll = data?.twoYes ?? [];
  const threeAll = data?.threeNo ?? [];
  const weekly = data?.weekly ?? [];

  const two = useMemo(() => twoAll.filter((pick) => inWhen(pick, when)), [twoAll, when]);
  const three = useMemo(() => threeAll.filter((pick) => inWhen(pick, when)), [threeAll, when]);
  const listed = when === "week" ? weekly : [...two, ...three];

  return (
    <div className="flex flex-col gap-5 fold:gap-8">
      <header className="max-w-2xl">
        <LiveBar fetchedAt={data?.fetchedAt} />
        <h1 className="mt-2 text-3xl font-semibold fold:text-5xl">
          Goal <span className="font-serif italic font-normal">streaks</span>
        </h1>
        <p className="mt-2 text-base text-subtle">
          {loading ? "Loading…" : `${listed.length} in this view`}
        </p>
        <p className="mt-3">
          <Link to="/banker" className="text-sm text-muted-foreground">
            Bankers
          </Link>
        </p>
      </header>

      <div className="chip-row" role="group" aria-label="When">
        {(
          [
            ["today", "Today", data?.counts?.today ?? 0],
            ["tomorrow", "Tomorrow", data?.counts?.tomorrow ?? 0],
            ["week", "Top weekly", weekly.length],
            ["all", "All", twoAll.length + threeAll.length],
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

      <BoardState
        loading={loading && !data}
        error={error}
        empty={!loading && !error && listed.length === 0}
        emptyLabel="No streaks listed."
        onRetry={reload}
      />

      {when === "week" ? (
        <Section id="weekly" title="Top" italic="weekly" picks={weekly} />
      ) : (
        <>
          <Section id="two" title="2+ streak" italic="Yes" picks={two} />
          <Section id="three" title="Over" italic="2.5" picks={three} />
        </>
      )}

      <StreakAccuracyBoard data={accuracy} />

      <p className="text-sm text-subtle">
        <Link to="/odds" className="text-or">
          Odds filter
        </Link>
      </p>
    </div>
  );
}
