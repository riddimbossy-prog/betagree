import { createFileRoute, Link } from "@tanstack/react-router";
import { StreakCard } from "@/components/streak-card";
import { BoardState, LiveBar } from "@/components/live-bar";
import { isPlayingToday } from "@/lib/format";
import { useStreaks } from "@/lib/live/use-live";
import { useTodayOnly } from "@/lib/store";

export const Route = createFileRoute("/streaks")({ component: StreaksPage });

function StreaksPage() {
  const { data, error, loading, reload } = useStreaks();
  const todayOnly = useTodayOnly();
  const two = (data?.twoYes ?? []).filter((pick) => !todayOnly || isPlayingToday(pick.kickoff));
  const three = (data?.threeNo ?? []).filter((pick) => !todayOnly || isPlayingToday(pick.kickoff));
  const total = two.length + three.length;

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <LiveBar fetchedAt={data?.fetchedAt} />
        <h1 className="mt-2 text-3xl font-semibold fold:text-4xl">
          Goal <span className="font-serif italic font-normal">streaks</span>
        </h1>
        <p className="mt-2 text-sm text-subtle">
          {loading ? "Loading…" : `${total} listed${todayOnly ? " today" : ""}`}
        </p>
      </header>

      <BoardState
        loading={loading && !data}
        error={error}
        empty={!loading && !error && total === 0}
        emptyLabel={todayOnly ? "Nobody on this list is playing today." : "No streaks listed."}
        onRetry={reload}
      />

      {total > 0 ? (
        <div className="chip-row">
          {two.length ? (
            <a href="#two" className="glass inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm">
              2+ Yes
              <span className="ml-2 tabular text-muted-foreground">{two.length}</span>
            </a>
          ) : null}
          {three.length ? (
            <a href="#three" className="glass inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm">
              3+ No
              <span className="ml-2 tabular text-muted-foreground">{three.length}</span>
            </a>
          ) : null}
          <Link to="/odds" className="glass inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm">
            Odds
          </Link>
        </div>
      ) : null}

      {two.length ? (
        <section id="two">
          <h2 className="text-2xl font-semibold">
            2+ streak <span className="font-serif italic font-normal">Yes</span>
          </h2>
          <ul className="mt-4 grid gap-3 fold:grid-cols-2">
            {two.map((pick) => (
              <li key={pick.id}>
                <StreakCard pick={pick} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {three.length ? (
        <section id="three">
          <h2 className="text-2xl font-semibold">
            3+ streak <span className="font-serif italic font-normal">No</span>
          </h2>
          <ul className="mt-4 grid gap-3 fold:grid-cols-2">
            {three.map((pick) => (
              <li key={pick.id}>
                <StreakCard pick={pick} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
