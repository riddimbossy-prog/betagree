import { createFileRoute, Link } from "@tanstack/react-router";
import { HeroTabs } from "@/components/hero-tabs";
import { ConsensusCard } from "@/components/consensus-card";
import { FixtureList } from "@/components/fixture-list";
import { BoardState } from "@/components/live-bar";
import { TrendCard } from "@/components/trend-card";
import { fixturesInBand } from "@/lib/odds-band";
import { useFormBoard, useSlate, useTrends } from "@/lib/live/use-live";
import { FormRowCard } from "@/components/form-row";
import { CATEGORY_META } from "@/lib/trend-meta";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const { data, error, loading } = useSlate();
  const trends = useTrends();
  const form = useFormBoard();
  const fixtures = data?.fixtures ?? [];
  const consensus = data?.consensus ?? [];
  const top = consensus.filter((c) => c.market === "1x2" || c.pct >= 0.65).slice(0, 4);
  const byFixture = new Map(fixtures.map((f) => [f.id, consensus.filter((c) => c.fixture.id === f.id)]));
  const upcoming = fixtures.filter((f) => f.status !== "post").slice(0, 6);
  const band = fixturesInBand(fixtures);
  const liveCount = fixtures.filter((f) => f.live).length;
  const bankers = trends.data?.bankers ?? [];
  const trendTotal = trends.data ? Object.values(trends.data.counts).reduce((a, b) => a + b, 0) : 0;
  const formHot = (form.data?.boards["most-wins"]?.overall ?? []).filter((r) => r.playingToday).slice(0, 4);

  return (
    <div className="flex flex-col gap-8">
      <HeroTabs
        sport="Football"
        sportNote="Today's board"
        tabs={[
          { id: "fixtures", label: "fixtures", value: loading ? "—" : fixtures.length, to: "/fixtures" },
          { id: "live", label: "live", value: liveCount, to: "/fixtures", tone: liveCount ? "live" : "plain" },
          { id: "form", label: "form", value: formHot.length || "—", to: "/form" },
          { id: "trends", label: "at 70%+", value: trendTotal, to: "/trends", tone: "or" },
          { id: "bankers", label: "bankers", value: bankers.length, to: "/banker" },
          { id: "band", label: "1.20–1.55", value: band.length, to: "/odds", tone: "azure" },
        ]}
      />

      <BoardState loading={loading} error={error} empty={!loading && !error && fixtures.length === 0} />

      {formHot.length ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-semibold">
              Current <span className="font-serif italic font-normal">form</span>
            </h2>
            <Link to="/form" className="text-sm text-muted-foreground">
              Full table
            </Link>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Highest league win rates among sides kicking off today.
          </p>
          <div className="flex flex-col gap-3">
            {formHot.map((row) => (
              <FormRowCard key={`${row.team}-${row.league}`} row={row} unit="Wins" highlight={row.rank === 1} />
            ))}
          </div>
        </section>
      ) : null}

      {bankers.length ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-semibold">
              Dual <span className="font-serif italic font-normal">bankers</span>
            </h2>
            <Link to="/banker" className="text-sm text-muted-foreground">
              Banker desk
            </Link>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Both desks posted this side at 70%+ / 1.20–1.55.
          </p>
          <div className="grid gap-3 fold:grid-cols-2">
            {bankers.slice(0, 4).map((pick) => (
              <TrendCard key={pick.id} pick={pick} highlight />
            ))}
          </div>
        </section>
      ) : null}

      {trendTotal ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-semibold">
              Filtered <span className="font-serif italic font-normal">trends</span>
            </h2>
            <Link to="/trends" className="text-sm text-muted-foreground">
              All trends
            </Link>
          </div>
          <div className="chip-row">
            {CATEGORY_META.map((c) => {
              const n = trends.data?.counts[c.id] ?? 0;
              if (!n) return null;
              return (
                <Link
                  key={c.id}
                  to="/trends"
                  hash={c.id}
                  className="inline-flex shrink-0 items-center rounded-full bg-card px-4 py-2 text-sm"
                >
                  {c.label}
                  <span className="ml-2 tabular text-muted-foreground">{n}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

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
          <div className="grid gap-4 fold:grid-cols-2">
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