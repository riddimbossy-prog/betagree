import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FixtureList } from "@/components/fixture-list";
import { BoardState, LiveBar } from "@/components/live-bar";
import { Button } from "@/components/ui/button";
import { BAND_META, SITE_COUNT, bandOf, type ConsensusBand } from "@/lib/consensus";
import { fixtureIsToday } from "@/lib/format";
import { useSlate } from "@/lib/live/use-live";
import { loadBoardSnapshot } from "@/lib/live/snapshot";
import { useTodayOnly } from "@/lib/store";
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
  const [status, setStatus] = useState<StatusFilter>("upcoming");
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
      if (status === "upcoming" && (f.live || f.status === "post")) return false;
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
        <h1 className="font-display mt-2 text-4xl">Today's fixtures</h1>
        <p className="mt-3 text-muted-foreground">
          Upcoming tips, read across {data?.desks.length ?? SITE_COUNT} tip sites. Filter by how many
          land on the same pick — high, medium, or low consensus.
        </p>
      </header>

      <div className="chip-row" role="tablist" aria-label="Consensus strength">
        {(
          [
            ["all", "All", bandCounts.all],
            ["high", BAND_META.high.label, bandCounts.high],
            ["medium", BAND_META.medium.label, bandCounts.medium],
            ["low", BAND_META.low.label, bandCounts.low],
          ] as const
        ).map(([id, label, n]) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={band === id ? "default" : "outline"}
            onClick={() => setBand(id)}
            aria-pressed={band === id}
          >
            {label}
            <span className="tabular opacity-70">{n}</span>
          </Button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {band === "all"
          ? `${SITE_COUNT} desks post a 1X2, total, or BTTS. High is 70% or more on the same side.`
          : BAND_META[band].blurb}
      </p>

      <div className="chip-row" aria-label="Kickoff status">
        {(
          [
            ["upcoming", "Upcoming"],
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
  if (status === "upcoming" && band !== "all") {
    return `No upcoming ${band} consensus picks on this slate. Try another filter.`;
  }
  if (status === "live") return "Nothing in play on this filter.";
  if (band !== "all") return `No ${band} consensus picks on this filter.`;
  return undefined;
}
