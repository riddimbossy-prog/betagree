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

  return (
    <div className="flex flex-col gap-12">
      <header className="max-w-3xl">
        <LiveBar fetchedAt={data?.fetchedAt} liveCount={liveCount} />
        <h1 className="font-display mt-4 text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
          Where the desks agree.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          Today's live soccer slate. Market price, recent form, and attack lean — the card is
          the picks that show up on more than one sheet.
        </p>
        <dl className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <Stat k="Fixtures" v={loading ? "—" : String(fixtures.length)} />
          <Stat k="Leagues" v={loading ? "—" : String(leagues)} />
          <Stat k="In play" v={loading ? "—" : String(liveCount)} />
          <Stat k="Consensus" v={loading ? "—" : String(consensus.filter((c) => c.pct >= 0.66).length)} />
        </dl>
      </header>

      <BoardState loading={loading} error={error} empty={!loading && !error && fixtures.length === 0} />

      {top.length ? (
        <section>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs tracking-widest text-subtle uppercase">The card</p>
              <h2 className="font-display mt-1 text-2xl">Strongest agreement</h2>
            </div>
            <Link to="/fixtures" className="text-sm text-muted-foreground hover:text-foreground">
              Full slate
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {top.map((item, i) => (
              <ConsensusCard key={item.id} item={item} rank={i + 1} />
            ))}
          </div>
        </section>
      ) : null}

      {upcoming.length ? (
        <section>
          <p className="text-xs tracking-widest text-subtle uppercase">Kickoff order</p>
          <h2 className="font-display mt-1 text-2xl">Next on the sheet</h2>
          <div className="mt-5">
            <FixtureList fixtures={upcoming} byFixture={byFixture} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-card px-4 py-3 shadow-border">
      <dt className="text-xs tracking-wide text-subtle uppercase">{k}</dt>
      <dd className="font-display mt-1 text-2xl font-semibold tabular">{v}</dd>
    </div>
  );
}
