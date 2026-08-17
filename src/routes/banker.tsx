import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendCard } from "@/components/trend-card";
import { BoardState, LiveBar } from "@/components/live-bar";
import { isPlayingToday } from "@/lib/format";
import { useTrends } from "@/lib/live/use-live";
import { useTodayOnly } from "@/lib/store";

export const Route = createFileRoute("/banker")({ component: BankerPage });

function BankerPage() {
  const { data, error, loading, reload } = useTrends();
  const todayOnly = useTodayOnly();
  const bankers = (data?.bankers ?? []).filter(
    (pick) => !todayOnly || isPlayingToday(pick.kickoffIso, pick.kickoff, data?.date),
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <LiveBar fetchedAt={data?.fetchedAt} />
        <h1 className="mt-2 text-3xl font-semibold fold:text-4xl">
          Banker <span className="font-serif italic font-normal">desk</span>
        </h1>
      </header>

      <BoardState
        loading={loading && !data}
        error={error}
        empty={!loading && !error && bankers.length === 0}
        emptyLabel={todayOnly ? "No bankers playing today." : "No bankers listed."}
        onRetry={reload}
      />

      {bankers.length ? (
        <ul className="grid gap-3 fold:grid-cols-2">
          {bankers.map((pick) => (
            <li key={pick.id}>
              <TrendCard pick={pick} highlight />
            </li>
          ))}
        </ul>
      ) : null}

      {!loading && !bankers.length && !error ? (
        <p className="text-sm text-muted-foreground">
          See{" "}
          <Link to="/trends" className="text-primary">
            today's trends
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
