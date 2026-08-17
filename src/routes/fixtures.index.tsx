import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BAND_OUTLINE, BAND_TONE } from "@/components/consensus-chip";
import { FixtureList } from "@/components/fixture-list";
import { BoardState, LiveBar } from "@/components/live-bar";
import { Button } from "@/components/ui/button";
import { BAND_META, bandOf, type ConsensusBand } from "@/lib/consensus";
import { fixtureIsToday } from "@/lib/format";
import { useSlate } from "@/lib/live/use-live";
import { loadBoardSnapshot } from "@/lib/live/snapshot";
import { useTodayOnly } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { ConsensusItem } from "@/lib/types";

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

function topPick(rows: ConsensusItem[] | undefined) {
  if (!rows?.length) return null;
  return rows.find((c) => c.market === "1x2") ?? rows[0];
}

function FixturesPage() {
  const initial = Route.useLoaderData();
  const { data, error, loading } = useSlate(initial);
  const [league, setLeague] = useState("all");
  const [band, setBand] = useState<BandFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const todayOnly = useTodayOnly();

  const allFixtures = data?.fixtures ?? [];
  const byFixture = useMemo(() => {
    const m = new Map<string, ConsensusItem[]>();
    for (const c of data?.consensus ?? []) {
      const arr = m.get(c.fixture.id) ?? [];
      arr.push(c);
      m.set(c.fixture.id, arr);
    }
    return m;
  }, [data]);

  const todayBoard = useMemo(
    () => allFixtures.filter((f) => !todayOnly || fixtureIsToday(f)),
    [allFixtures, todayOnly],
  );

  const bandCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0, all: todayBoard.length };
    for (const f of todayBoard) {
      const top = topPick(byFixture.get(f.id));
      if (!top) {
        counts.low += 1;
        continue;
      }
      counts[bandOf(top)] += 1;
    }
    return counts;
  }, [todayBoard, byFixture]);

  const fixtures = useMemo(() => {
    return todayBoard.filter((f) => {
      if (league !== "all" && f.league !== league) return false;
      if (status === "live" && !f.live) return false;
      if (status === "upcoming" && f.status === "post") return false;
      if (band !== "all") {
        const top = topPick(byFixture.get(f.id));
        const resolved = top ? bandOf(top) : "low";
        if (resolved !== band) return false;
      }
      return true;
    });
  }, [todayBoard, league, status, band, byFixture]);

  const leagues = [...new Set(todayBoard.map((f) => f.league))];

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <LiveBar fetchedAt={data?.fetchedAt} liveCount={todayBoard.filter((f) => f.live).length} />
        <h1 className="font-display mt-2 text-3xl fold:text-4xl">Today's fixtures</h1>
      </header>

      <div className="chip-row" role="tablist" aria-label="Consensus strength">
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
        emptyLabel={emptyCopy(band, status, todayOnly)}
      />
      {fixtures.length ? <FixtureList fixtures={fixtures} byFixture={byFixture} /> : null}
    </div>
  );
}

function emptyCopy(band: BandFilter, status: StatusFilter, todayOnly: boolean) {
  if (todayOnly) return "Nobody on this list is playing today.";
  if (status === "live") return "Nothing in play on this filter.";
  if (band !== "all") return `No ${band} picks on this filter.`;
  return undefined;
}
