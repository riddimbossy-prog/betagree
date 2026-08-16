import { createFileRoute, Link } from "@tanstack/react-router";
import { ConsensusCard } from "@/components/consensus-card";
import { FixtureList } from "@/components/fixture-list";
import { BoardState, LiveBar } from "@/components/live-bar";
import { useSlate } from "@/lib/live/use-live";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { data, error, loading } = useSlate();
  const fixtures = data?.fixtures ?? [];
  const consensus = data?.consensus ?? [];
  const top = consensus.filter((c) => c.market === "1x2" || c.pct >= 0.65).slice(0, 6);
  const byFixture = new Map(fixtures.map((f) => [f.id, consensus.filter((c) => c.fixture.id === f.id)]));
  const upcoming = fixtures.filter((f) => f.status !== "post").slice(0, 10);
  const liveCount = fixtures.filter((f) => f.live).length;
  const leagues = new Set(fixtures.map((f) => f.league)).size;
  const pack = consensus.filter((c) => c.pct >= 0.66).length;

  return (
    <div className="flex flex-col gap-10">
      <header>
        <LiveBar fetchedAt={data?.fetchedAt} liveCount={liveCount} />
        <h1 className="mt-3 text-5xl sm:text-7xl">Where the desks agree</h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Today's soccer slate. Market, form, and attack. The card is the picks that land on more
          than one desk.
        </p>
        <dl className="mt-6 grid grid-cols-2 border-2 border-ink sm:grid-cols-4">
          <Stat k="Fixtures" v={loading ? "—" : String(fixtures.length)} />
          <Stat k="Leagues" v={loading ? "—" : String(leagues)} />
          <Stat k="In play" v={loading ? "—" : String(liveCount)} />
          <Stat k="Consensus" v={loading ? "—" : String(pack)} />
        </dl>
      </header>

      <BoardState loading={loading} error={error} empty={!loading && !error && fixtures.length === 0} />

      {top.length ? (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3 border-b-2 border-ink pb-2">
            <h2 className="text-3xl">The card</h2>
            <Link to="/fixtures" className="font-display text-sm tracking-wider uppercase underline">
              Full slate
            </Link>
          </div>
          <div className="grid gap-0 md:grid-cols-2">
            {top.map((item, i) => (
              <ConsensusCard key={item.id} item={item} rank={i + 1} />
            ))}
          </div>
        </section>
      ) : null}

      {upcoming.length ? (
        <section>
          <h2 className="mb-4 border-b-2 border-ink pb-2 text-3xl">Next kickoff</h2>
          <FixtureList fixtures={upcoming} byFixture={byFixture} />
        </section>
      ) : null}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-ink px-4 py-3 not-last:border-b-2 sm:border-b-0 sm:not-last:border-r-2">
      <dt className="font-display text-xs tracking-wider uppercase">{k}</dt>
      <dd className="font-display mt-1 text-3xl tabular">{v}</dd>
    </div>
  );
}
