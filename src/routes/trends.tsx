import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendCard } from "@/components/trend-card";
import { BoardState, LiveBar } from "@/components/live-bar";
import { isPlayingToday } from "@/lib/format";
import { useTrends } from "@/lib/live/use-live";
import { useTodayOnly } from "@/lib/store";
import { CATEGORY_META } from "@/lib/trend-meta";
import type { TrendCategory, TrendPick } from "@/lib/types";

export const Route = createFileRoute("/trends")({ component: TrendsPage });

function TrendsPage() {
  const { data, error, loading, reload } = useTrends();
  const todayOnly = useTodayOnly();
  const cats = useMemo(() => {
    const source = data?.categories;
    if (!source) return undefined;
    if (!todayOnly) return source;
    return Object.fromEntries(
      Object.entries(source).map(([key, list]) => [
        key,
        list.filter((pick) => isPlayingToday(pick.kickoffIso, pick.kickoff, data.date)),
      ]),
    ) as Record<TrendCategory, TrendPick[]>;
  }, [data, todayOnly]);
  const total = cats ? Object.values(cats).reduce((a, b) => a + b.length, 0) : 0;
  const bankers = (data?.bankers ?? []).filter(
    (pick) => !todayOnly || isPlayingToday(pick.kickoffIso, pick.kickoff, data?.date),
  );
  const visible = CATEGORY_META.filter((c) => (cats?.[c.id]?.length ?? 0) > 0);

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <LiveBar fetchedAt={data?.fetchedAt} />
        <h1 className="mt-2 text-3xl font-semibold fold:text-4xl">
          Today <span className="font-serif italic font-normal">trends</span>
        </h1>
        <p className="mt-2 text-sm text-subtle">
          {loading ? "Loading…" : `${total} picks · ${bankers.length} bankers`}
        </p>
      </header>

      <BoardState
        loading={loading && !data}
        error={error}
        empty={!loading && !error && total === 0}
        emptyLabel={todayOnly ? "Nobody on this list is playing today." : "No trends listed."}
        onRetry={reload}
      />

      {total > 0 ? (
        <div className="chip-row">
          {CATEGORY_META.map((c) => {
            const n = cats?.[c.id]?.length ?? 0;
            if (!n) return null;
            return (
              <a key={c.id} href={`#${c.id}`} className="glass inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm">
                {c.label}
                <span className="ml-2 tabular text-muted-foreground">{n}</span>
              </a>
            );
          })}
          <Link to="/banker" className="glass-purpure inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm font-semibold text-primary-foreground">
            Bankers {bankers.length}
          </Link>
        </div>
      ) : null}

      {visible.map((c) => (
        <section key={c.id} id={c.id}>
          <h2 className="text-2xl font-semibold">
            {c.label.split(" ")[0]}{" "}
            <span className="font-serif italic font-normal">{c.label.split(" ").slice(1).join(" ") || "run"}</span>
          </h2>
          <ul className="mt-4 grid gap-3 fold:grid-cols-2">
            {cats?.[c.id].map((pick) => (
              <li key={pick.id}>
                <TrendCard pick={pick} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
