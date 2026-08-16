import { createFileRoute, Link } from "@tanstack/react-router";
import { CircleDot } from "lucide-react";
import { ConsensusCard } from "@/components/consensus-card";
import { FixtureList } from "@/components/fixture-list";
import { BoardState } from "@/components/live-bar";
import { useSlate } from "@/lib/live/use-live";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { data, error, loading } = useSlate();
  const fixtures = data?.fixtures ?? [];
  const consensus = data?.consensus ?? [];
  const top = consensus.filter((c) => c.market === "1x2" || c.pct >= 0.65).slice(0, 6);
  const byFixture = new Map(fixtures.map((f) => [f.id, consensus.filter((c) => c.fixture.id === f.id)]));
  const upcoming = fixtures.filter((f) => f.status !== "post").slice(0, 8);
  const liveCount = fixtures.filter((f) => f.live).length;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          <CircleDot className="size-4" />
          Football
        </span>
        <span className="inline-flex shrink-0 items-center rounded-full bg-card px-4 py-2 text-sm text-muted-foreground">
          {loading ? "—" : fixtures.length} fixtures
        </span>
        <span className="inline-flex shrink-0 items-center rounded-full bg-card px-4 py-2 text-sm text-muted-foreground">
          {liveCount} live
        </span>
        <span className="inline-flex shrink-0 items-center rounded-full bg-card px-4 py-2 text-sm text-muted-foreground">
          {consensus.filter((c) => c.pct >= 0.66).length} consensus
        </span>
      </div>

      <BoardState loading={loading} error={error} empty={!loading && !error && fixtures.length === 0} />

      {top.length ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-semibold">
              Top <span className="font-serif italic font-normal">Events</span>
            </h2>
            <Link to="/fixtures" className="text-sm text-muted-foreground">
              View all
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {top.map((item, i) => (
              <ConsensusCard key={item.id} item={item} rank={i + 1} />
            ))}
          </div>
        </section>
      ) : null}

      {upcoming.length ? (
        <section>
          <h2 className="mb-4 text-2xl font-semibold">
            Next <span className="font-serif italic font-normal">Kickoff</span>
          </h2>
          <FixtureList fixtures={upcoming} byFixture={byFixture} />
        </section>
      ) : null}
    </div>
  );
}
