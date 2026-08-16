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
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-card p-6 shadow-border sm:col-span-2 lg:row-span-2">
          <LiveBar fetchedAt={data?.fetchedAt} liveCount={liveCount} />
          <h1 className="font-display mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            Where the desks agree.
          </h1>
          <p className="mt-4 max-w-lg text-muted-foreground">
            Live slate. Market, form, and attack. The card is every pick that lands on more than
            one desk.
          </p>
        </div>
        <Stat k="Fixtures" v={loading ? "—" : String(fixtures.length)} />
        <Stat k="In play" v={loading ? "—" : String(liveCount)} />
        <Stat k="Leagues" v={loading ? "—" : String(leagues)} />
        <Stat k="Consensus" v={loading ? "—" : String(pack)} />
      </section>

      <BoardState loading={loading} error={error} empty={!loading && !error && fixtures.length === 0} />

      {top.length ? (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-widest text-subtle uppercase">The card</p>
              <h2 className="mt-1 text-2xl font-semibold">Strongest agreement</h2>
            </div>
            <Link to="/fixtures" className="text-sm text-primary hover:underline">
              Full slate
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {top.map((item, i) => (
              <ConsensusCard key={item.id} item={item} rank={i + 1} />
            ))}
          </div>
        </section>
      ) : null}

      {upcoming.length ? (
        <section>
          <p className="text-xs font-medium tracking-widest text-subtle uppercase">Kickoff order</p>
          <h2 className="mt-1 text-2xl font-semibold">Next up</h2>
          <div className="mt-4">
            <FixtureList fixtures={upcoming} byFixture={byFixture} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl bg-card px-5 py-5 shadow-border">
      <dt className="text-xs font-medium tracking-wide text-subtle uppercase">{k}</dt>
      <dd className="mt-2 text-3xl font-semibold tabular">{v}</dd>
    </div>
  );
}
