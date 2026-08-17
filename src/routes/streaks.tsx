import { createFileRoute, Link } from "@tanstack/react-router";
import { StreakCard } from "@/components/streak-card";
import { BoardState, LiveBar } from "@/components/live-bar";
import { useStreaks } from "@/lib/live/use-live";

export const Route = createFileRoute("/streaks")({ component: StreaksPage });

function StreaksPage() {
  const { data, error, loading } = useStreaks();
  const two = data?.twoYes ?? [];
  const three = data?.threeNo ?? [];
  const total = two.length + three.length;
  const filters = data?.filters;

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <LiveBar fetchedAt={data?.fetchedAt} />
        <h1 className="mt-2 text-4xl font-semibold">
          Goal <span className="font-serif italic font-normal">streaks</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          SportyBet 2+ and 3+ Goals Streak prices, kept only when the favorite sits at{" "}
          {filters?.favorite.from.toFixed(2) ?? "1.19"}–{filters?.favorite.to.toFixed(2) ?? "1.55"} and one
          side is top 3 or bottom 3 in the league table.
        </p>
        <p className="mt-2 text-sm text-subtle">
          {loading
            ? "Reading SportyBet…"
            : `${total} listed · 2+ Yes ${filters?.twoYes.from.toFixed(2) ?? "1.20"}–${filters?.twoYes.to.toFixed(2) ?? "1.55"} · 3+ No ${filters?.threeNo.from.toFixed(2) ?? "1.40"}–${filters?.threeNo.to.toFixed(2) ?? "2.10"}`}
        </p>
      </header>

      <BoardState
        loading={loading}
        error={error}
        empty={!loading && !error && total === 0}
        emptyLabel="Nothing this week cleared the streak bands plus a top-3 / bottom-3 favorite."
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
            1.19–1.55 filter
          </Link>
        </div>
      ) : null}

      {two.length ? (
        <section id="two">
          <h2 className="text-2xl font-semibold">
            2+ streak <span className="font-serif italic font-normal">Yes</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Any team to score two or more in a row. Yes priced {filters?.twoYes.from.toFixed(2)}–
            {filters?.twoYes.to.toFixed(2)}.
          </p>
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
          <p className="mt-1 text-sm text-muted-foreground">
            No team scores three in a row. No priced {filters?.threeNo.from.toFixed(2)}–
            {filters?.threeNo.to.toFixed(2)}.
          </p>
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