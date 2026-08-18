import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BAND_OUTLINE, BAND_TONE } from "@/components/consensus-chip";
import { FixtureList } from "@/components/fixture-list";
import { BoardState, LiveBar } from "@/components/live-bar";
import { Button } from "@/components/ui/button";
import { isBoardMatch } from "@/lib/board-match";
import { BAND_META, bandOf, consensusByFixture, fixturesWithConsensus, pickBoardTip, presentBoardTip, type ConsensusBand } from "@/lib/consensus";
import { fixtureIsToday, sortBoardGames } from "@/lib/format";
import { useLeagueRates } from "@/lib/league-rates";
import { useSlate } from "@/lib/live/use-live";
import { loadBoardSnapshot } from "@/lib/live/snapshot";
import { SettleFilterBar, matchesSettle, type SettleFilter } from "@/components/settle-filter";
import { settleBoardTip, type SettleStatus } from "@/lib/settle";
import { useTodayOnly } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ConsensusItem, Fixture } from "@/lib/types";

export const Route = createFileRoute("/fixtures/")({
  loader: async () => {
    try {
      return await loadBoardSnapshot();
    } catch {
      return null;
    }
  },
  component: FixturesPage,
});

type BandFilter = ConsensusBand | "all";
type StatusFilter = "upcoming" | "live" | "all";

function topPick(rows: ConsensusItem[] | undefined, rates?: Parameters<typeof pickBoardTip>[1]) {
  return pickBoardTip(rows, rates);
}

function settleOf(
  fixture: Fixture,
  byFixture: Map<string, ConsensusItem[]>,
  rates?: Parameters<typeof pickBoardTip>[1],
): SettleStatus {
  const tip = topPick(byFixture.get(fixture.id), rates);
  if (!tip) return "pending";
  return settleBoardTip(presentBoardTip(tip), fixture);
}

function FixturesPage() {
  const initial = Route.useLoaderData();
  const { data, error, loading, reload } = useSlate(initial);
  const [league, setLeague] = useState("all");
  const [band, setBand] = useState<BandFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [settle, setSettle] = useState<SettleFilter>("pending");
  const todayOnly = useTodayOnly();
  const rates = useLeagueRates(data?.fixtures);

  const allFixtures = data?.fixtures ?? [];
  const byFixture = useMemo(() => consensusByFixture(data?.consensus ?? []), [data]);

  const todayBoard = useMemo(() => {
    const list = todayOnly ? allFixtures.filter((f) => fixtureIsToday(f)) : allFixtures;
    const sorted = todayOnly ? sortBoardGames(list) : list;
    return fixturesWithConsensus(sorted, byFixture);
  }, [allFixtures, todayOnly, byFixture]);

  const bandCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0, all: todayBoard.length };
    for (const f of todayBoard) {
      const top = topPick(byFixture.get(f.id), rates);
      if (!top) continue;
      counts[bandOf(top)] += 1;
    }
    return counts;
  }, [todayBoard, byFixture, rates]);

  const settleCounts = useMemo(() => {
    const counts: Record<SettleFilter, number> = { won: 0, lost: 0, pending: 0, settled: 0, all: todayBoard.length };
    for (const f of todayBoard) {
      const status = settleOf(f, byFixture, rates);
      counts[status] += 1;
      if (status === "won" || status === "lost") counts.settled += 1;
    }
    return counts;
  }, [todayBoard, byFixture, rates]);

  const fixtures = useMemo(() => {
    return todayBoard.filter((f) => {
      if (league !== "all" && f.league !== league) return false;
      if (status === "live" && !f.live) return false;
      if (status === "live" && !isBoardMatch(f)) return false;
      if (status === "upcoming" && f.status === "post") return false;
      if (band !== "all") {
        const top = topPick(byFixture.get(f.id), rates);
        if (!top || bandOf(top) !== band) return false;
      }
      if (settle !== "all" && !matchesSettle(settleOf(f, byFixture, rates), settle)) return false;
      return true;
    });
  }, [todayBoard, league, status, band, settle, byFixture, rates]);

  const leagues = [...new Set(todayBoard.map((f) => f.league))];

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <LiveBar fetchedAt={data?.fetchedAt} liveCount={todayBoard.filter((f) => f.live).length} />
        <h1 className="font-display mt-2 text-3xl fold:text-4xl">Today's fixtures</h1>
      </header>

      <SettleFilterBar value={settle} onChange={setSettle} counts={settleCounts} />

      <div className="chip-row" role="group" aria-label="Consensus strength">
        <Button
          type="button"
          size="sm"
          variant={band === "all" ? "default" : "outline"}
          onClick={() => setBand("all")}
          aria-pressed={band === "all"}
        >
          All
          <span className="tabular opacity-70">{bandCounts.all}</span>
        </Button>
        {(["high", "medium", "low"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setBand(id)}
            aria-pressed={band === id}
            className={cn(
              "inline-flex h-9 min-h-9 shrink-0 items-center gap-2 rounded-full px-4 text-xs font-semibold",
              band === id ? BAND_TONE[id] : BAND_OUTLINE[id],
            )}
          >
            {BAND_META[id].label}
            <span className="tabular opacity-80">{bandCounts[id]}</span>
          </button>
        ))}
      </div>

      <SettleFilterBar value={settle} onChange={setSettle} counts={settleCounts} />

      <div className="chip-row" aria-label="Kickoff status">
        {(
          [
            ["upcoming", "Open"],
            ["live", "Live"],
            ["all", "All kickoffs"],
          ] as const
        ).map(([id, label]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={status === id ? "default" : "outline"}
            onClick={() => setStatus(id)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="chip-row">
        <Button type="button" size="sm" variant={league === "all" ? "default" : "outline"} onClick={() => setLeague("all")}>
          All leagues
        </Button>
        {leagues.map((l) => (
          <Button
            key={l}
            type="button"
            size="sm"
            variant={league === l ? "default" : "outline"}
            onClick={() => setLeague(l)}
          >
            {l}
          </Button>
        ))}
      </div>

      <BoardState
        loading={loading && !data}
        error={error}
        empty={!loading && !error && fixtures.length === 0}
        emptyLabel={emptyCopy(band, status, settle, todayOnly)}
        onRetry={reload}
      />
      {fixtures.length ? <FixtureList fixtures={fixtures} byFixture={byFixture} /> : null}
    </div>
  );
}

function emptyCopy(band: BandFilter, status: StatusFilter, settle: SettleFilter, todayOnly: boolean) {
  if (todayOnly) return "Nobody with consensus is playing today.";
  if (settle === "pending") return "No pending tips — everything on this filter is settled.";
  if (settle === "settled") return "No settled tips yet.";
  if (settle === "won") return "No winning tips on this filter.";
  if (settle === "lost") return "No losing tips on this filter.";
  if (band !== "all") return `No ${band} picks on this filter.`;
  if (status === "live") return "No live games with a consensus pick.";
  return "No consensus picks on this board.";
}
