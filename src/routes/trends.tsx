import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendCard } from "@/components/trend-card";
import { BoardState, LiveBar } from "@/components/live-bar";
import { useTrends } from "@/lib/live/use-live";
import { CATEGORY_META } from "@/lib/trend-meta";

export const Route = createFileRoute("/trends")({ component: TrendsPage });

function TrendsPage() {
  const { data, error, loading } = useTrends();
  const cats = data?.categories;
  const total = data ? Object.values(data.counts).reduce((a, b) => a + b, 0) : 0;
  const visible = CATEGORY_META.filter((c) => (cats?.[c.id]?.length ?? 0) > 0);

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <LiveBar fetchedAt={data?.fetchedAt} />
        <h1 className="mt-2 text-4xl font-semibold">
          Today <span className="font-serif italic font-normal">trends</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Today only. A row appears when the stat is 70% or higher and the
          price sits between 1.20 and 1.55. Nothing is padded in.
        </p>
        <p className="mt-2 text-sm text-subtle">
          {loading ? "Reading desks…" : `${total} picks · ${data?.bankers.length ?? 0} bankers`}
        </p>
      </header>

      <BoardState
        loading={loading && !data}
        error={error}
        empty={!loading && !error && total === 0}
        emptyLabel="Nothing today cleared 70% with odds 1.20–1.55."
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
            Bankers {data?.bankers.length ?? 0}
          </Link>
        </div>
      ) : null}

      {visible.map((c) => (
        <section key={c.id} id={c.id}>
          <h2 className="text-2xl font-semibold">
            {c.label.split(" ")[0]}{" "}
            <span className="font-serif italic font-normal">{c.label.split(" ").slice(1).join(" ") || "run"}</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{c.blurb}</p>
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
