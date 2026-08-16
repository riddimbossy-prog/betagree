import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendCard } from "@/components/trend-card";
import { BoardState, LiveBar } from "@/components/live-bar";
import { useTrends } from "@/lib/live/use-live";
import { CATEGORY_META } from "@/lib/trend-meta";

export const Route = createFileRoute("/banker")({ component: BankerPage });

function BankerPage() {
  const { data, error, loading } = useTrends();
  const bankers = data?.bankers ?? [];

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <LiveBar fetchedAt={data?.fetchedAt} />
        <h1 className="mt-2 text-4xl font-semibold">
          Banker <span className="font-serif italic font-normal">desk</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Matches where both desks posted the same side, the stat is 70% or higher,
          and the decimal price is between 1.20 and 1.55. If they do not both clear that bar, the
          match is not listed.
        </p>
      </header>

      <BoardState
        loading={loading}
        error={error}
        empty={!loading && !error && bankers.length === 0}
        emptyLabel="No bankers today — the desks did not agree on a 70% / 1.20–1.55 pick."
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
          Check{" "}
          <Link to="/trends" className="text-primary">
            today's trends
          </Link>{" "}
          for single-desk rows that still meet the 70% / 1.20–1.55 cut.
        </p>
      ) : null}

      <section className="rounded-3xl bg-card p-5">
        <h2 className="text-lg font-semibold">How a banker is made</h2>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {CATEGORY_META.map((c) => (
            <li key={c.id}>
              <span className="font-medium text-foreground">{c.label}.</span> {c.blurb}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}