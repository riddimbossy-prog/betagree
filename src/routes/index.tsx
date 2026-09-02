import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnalysisHub } from "@/components/analysis-hub";
import { ConsensusCard } from "@/components/consensus-card";
import { FixtureList } from "@/components/fixture-list";
import { BoardState } from "@/components/live-bar";
import { TrendCard } from "@/components/trend-card";
import { isLiveBoardMatch } from "@/lib/board-match";
import { fixtureIsToday, isPlayingToday, isPlayingTomorrow, sortBoardGames } from "@/lib/format";
import { fixturesInBand } from "@/lib/odds-band";
import { useFormBoard, useSlate, useStreaks, useTrends, useBankers, useSportyScan } from "@/lib/live/use-live";
import { BankerCard } from "@/components/banker-card";
import { ScanCard } from "@/components/scan-card";
import { loadBoardSnapshot } from "@/lib/live/snapshot";
import { FormRowCard } from "@/components/form-row";
import { StreakCard } from "@/components/streak-card";
import { useTodayOnly } from "@/lib/store";
import { CATEGORY_META } from "@/lib/trend-meta";
import { bandOf, consensusByFixture, fixturesWithConsensus, pickBoardTip } from "@/lib/consensus";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      return await loadBoardSnapshot();
    } catch {
      return null;
    }
  },
  component: Home,
});

function Home() {
  const initial = Route.useLoaderData();
  const { data, error, loading, reload } = useSlate(initial);
  const [secondary, setSecondary] = useState(false);
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const id = w.requestIdleCallback
      ? w.requestIdleCallback(() => setSecondary(true), { timeout: 2200 })
      : window.setTimeout(() => setSecondary(true), 1800);
    return () => {
      if (w.cancelIdleCallback && typeof id === "number") w.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, []);
  const trends = useTrends(90_000, secondary);
  const bankersBoard = useBankers(90_000, secondary);
  const sportyScan = useSportyScan();
  const form = useFormBoard(90_000, secondary, true);
  const streaks = useStreaks(90_000, secondary);
  const todayOnly = useTodayOnly();
  const consensus = (data?.consensus ?? []).filter((c) => !todayOnly || fixtureIsToday(c.fixture));
  const byFixture = consensusByFixture(consensus);
  const fixtures = fixturesWithConsensus(
    sortBoardGames((data?.fixtures ?? []).filter((f) => !todayOnly || fixtureIsToday(f))),
    byFixture,
  );
  const high = [...byFixture.values()]
    .map((rows) => pickBoardTip(rows))
    .filter((tip): tip is NonNullable<typeof tip> => Boolean(tip) && bandOf(tip as NonNullable<typeof tip>) === "high");
  const top = high.slice(0, 4);
  const upcoming = fixtures.filter((f) => f.status !== "post" && !f.live);
  const liveGames = fixtures.filter(isLiveBoardMatch);
  const band = fixturesInBand(fixtures);
  const liveCount = liveGames.length;
  const highUpcoming = upcoming.filter((f) => {
    const pick = pickBoardTip(byFixture.get(f.id));
    return pick ? bandOf(pick) === "high" : false;
  });
  const bankers = (bankersBoard.data?.picks ?? []).filter(
    (pick) => !todayOnly || isPlayingToday(pick.kickoff),
  );
  const scanPicks = (sportyScan.data?.picks ?? []).filter(
    (pick) => !todayOnly || pick.when === "today" || isPlayingToday(pick.kickoff),
  );
  const trendCats = trends.data?.categories;
  const trendTotal = trendCats
    ? Object.values(trendCats).reduce(
        (sum, list) =>
          sum + list.filter((pick) => !todayOnly || isPlayingToday(pick.kickoffIso, pick.kickoff, trends.data?.date)).length,
        0,
      )
    : 0;
  const formBest = (trendCats?.wins ?? []).filter((pick) =>
    isPlayingToday(pick.kickoffIso, pick.kickoff, trends.data?.date),
  );
  const formHot = (form.data?.boards["most-wins"]?.overall ?? [])
    .filter((r) => r.playingToday && isPlayingToday(r.kickoff))
    .slice(0, 4);
  const streakAll = [...(streaks.data?.twoYes ?? []), ...(streaks.data?.threeNo ?? [])];
  const streakToday = streakAll.filter((pick) => pick.when === "today" || isPlayingToday(pick.kickoff));
  const streakTomorrow = streakAll.filter((pick) => pick.when === "tomorrow" || isPlayingTomorrow(pick.kickoff));
  const streakPreview = (streakToday.length ? streakToday : streakTomorrow).slice(0, 4);
  const streakTotal = streakToday.length || streakTomorrow.length;

  return (
    <div className="flex flex-col gap-8">
      <AnalysisHub
        tiles={[
          {
            id: "high",
            eyebrow: "Primary consensus board",
            title: "High agreement",
            body: "The strongest board tips for today.",
            badge: loading ? "—" : String(highUpcoming.length || high.length),
            badgeHint: "final board",
            to: "/fixtures",
            icon: "crown",
            size: "lg",
            tone: "high",
          },
          {
            id: "live",
            eyebrow: "Live matches only",
            title: liveCount ? "In play now" : "In play board",
            body: "Matches that are on now.",
            badge: String(liveCount),
            badgeHint: liveCount ? "live" : "waiting",
            to: "/live",
            icon: "live",
            size: "lg",
            tone: liveCount ? "live" : "plain",
          },
          {
            id: "bankers",
            eyebrow: "The short list",
            title: "Bankers",
            body: "The desk's strongest picks.",
            badge: String(bankers.length || "—"),
            badgeHint: "bankers",
            to: "/banker",
            icon: "spark",
            size: "lg",
            tone: "or",
          },
          {
            id: "scan",
            eyebrow: "SportyBet board",
            title: "Sporty scan",
            body: sportyScan.data?.when?.today
              ? `Scanned ${sportyScan.data.when.today} today matches. Favourite wins, GG, unders, 2+ and DNB.`
              : "Favourite wins, GG, unders, 2+ and DNB from the live book.",
            badge: String(scanPicks.length || "—"),
            badgeHint: "scan hits",
            to: "/scan",
            icon: "scan",
            size: "lg",
            tone: "azure",
          },
          {
            id: "form",
            eyebrow: "Current form",
            title: "Form",
            body: "Best sides to back. Worst sides to fade.",
            badge: String(formBest.length || formHot.length || "—"),
            badgeHint: "specialist",
            to: "/form",
            icon: "flame",
            size: "md",
            tone: "or",
          },
          {
            id: "streaks",
            eyebrow: "Goals profile",
            title: "Streaks",
            body: "Goal runs worth backing.",
            badge: String(streakTotal || "—"),
            badgeHint: "goals",
            to: "/streaks",
            icon: "zap",
            size: "md",
            tone: "purpure",
          },
          {
            id: "trends",
            eyebrow: "Qualified markets",
            title: "Trends 70%+",
            body: "Hot markets on today's board.",
            badge: String(trendTotal || "—"),
            badgeHint: "qualified",
            to: "/trends",
            icon: "gg",
            size: "md",
            tone: "azure",
          },
        ]}
      />

      <BoardState
        loading={loading && !data}
        error={error}
        empty={!loading && !error && fixtures.length === 0}
        emptyLabel={todayOnly ? "Nobody with consensus is playing today." : "No consensus picks on the board."}
        onRetry={reload}
      />

      {liveGames.length ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-semibold">
              In <span className="font-serif italic font-normal">play</span>
            </h2>
            <Link to="/live" className="text-sm text-muted-foreground">
              In play
            </Link>
          </div>
          <FixtureList fixtures={liveGames} byFixture={byFixture} />
        </section>
      ) : null}

      {highUpcoming.length ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-semibold">
              High <span className="font-serif italic font-normal">consensus</span>
            </h2>
            <Link to="/fixtures" className="text-sm text-muted-foreground">
              Filter the board
            </Link>
          </div>
          <FixtureList fixtures={highUpcoming.slice(0, 6)} byFixture={byFixture} />
        </section>
      ) : null}

      {scanPicks.length ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-semibold">
              Sporty <span className="font-serif italic font-normal">scan</span>
            </h2>
            <Link to="/scan" className="text-sm text-muted-foreground">
              Full scan
            </Link>
          </div>
          <div className="grid gap-3 fold:grid-cols-2">
            {scanPicks.slice(0, 4).map((pick) => (
              <ScanCard key={`${pick.fixtureId}-${pick.rule}-${pick.selection}`} pick={pick} />
            ))}
          </div>
        </section>
      ) : null}

      {formBest.length || formHot.length ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-semibold">
              Current <span className="font-serif italic font-normal">form</span>
            </h2>
            <Link to="/form" className="text-sm text-muted-foreground">
              Full table
            </Link>
          </div>
          {formBest.length ? (
            <div className="grid gap-3 fold:grid-cols-2">
              {formBest.slice(0, 4).map((pick) => (
                <TrendCard key={pick.id} pick={pick} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {formHot.map((row) => (
                <FormRowCard key={`${row.team}-${row.league}`} row={row} unit="Wins" highlight={row.rank === 1} />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {streakPreview.length ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-semibold">
              Goal <span className="font-serif italic font-normal">streaks</span>
            </h2>
            <Link to="/streaks" className="text-sm text-muted-foreground">
              Full list
            </Link>
          </div>
          <div className="grid gap-3 fold:grid-cols-2">
            {streakPreview.map((pick) => (
              <StreakCard key={pick.id} pick={pick} />
            ))}
          </div>
        </section>
      ) : null}

      {bankers.length ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-semibold">
              Banker <span className="font-serif italic font-normal">picks</span>
            </h2>
            <Link to="/banker" className="text-sm text-muted-foreground">
              Banker desk
            </Link>
          </div>
          <div className="grid gap-3 fold:grid-cols-2">
            {bankers.slice(0, 4).map((pick) => (
              <BankerCard key={`${pick.fixtureId}-${pick.selection}`} pick={pick} />
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
              const n = (trendCats?.[c.id] ?? []).filter(
                (pick) => !todayOnly || isPlayingToday(pick.kickoffIso, pick.kickoff, trends.data?.date),
              ).length;
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
          <div className="grid gap-3 fold:grid-cols-2 xl:grid-cols-3">
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
          <FixtureList fixtures={upcoming.slice(0, 6)} byFixture={byFixture} />
        </section>
      ) : null}
    </div>
  );
}
