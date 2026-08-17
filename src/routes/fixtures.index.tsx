import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FixtureList } from "@/components/fixture-list";
import { BoardState, LiveBar } from "@/components/live-bar";
import { Button } from "@/components/ui/button";
import { fixtureIsToday } from "@/lib/format";
import { useSlate } from "@/lib/live/use-live";
import { loadBoardSnapshot } from "@/lib/live/snapshot";
import { useTodayOnly } from "@/lib/store";

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

function FixturesPage() {
  const initial = Route.useLoaderData();
  const { data, error, loading } = useSlate(initial);
  const [league, setLeague] = useState("all");
  const todayOnly = useTodayOnly();
  const fixtures = useMemo(() => {
    const list = data?.fixtures ?? [];
    return list.filter((f) => {
      if (league !== "all" && f.league !== league) return false;
      if (todayOnly && !fixtureIsToday(f)) return false;
      return true;
    });
  }, [data, league, todayOnly]);
  const leagues = [...new Set((data?.fixtures ?? []).map((f) => f.league))];
  const byFixture = useMemo(() => {
    const m = new Map();
    for (const c of data?.consensus ?? []) {
      const arr = m.get(c.fixture.id) ?? [];
      arr.push(c);
      m.set(c.fixture.id, arr);
    }
    return m;
  }, [data]);

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <LiveBar fetchedAt={data?.fetchedAt} liveCount={fixtures.filter((f) => f.live).length} />
        <h1 className="font-display mt-2 text-4xl">Fixtures</h1>
        <p className="mt-3 text-muted-foreground">
          Live slate. Scores and prices refresh on their own. Open a row to see each desk.
        </p>
        <Link to="/odds" className="mt-3 inline-block text-sm text-primary">
          Filter 1.20–1.55
        </Link>
      </header>

      <div className="chip-row">
        <Button type="button" size="sm" variant={league === "all" ? "default" : "outline"} onClick={() => setLeague("all")}>
          All
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
        emptyLabel={todayOnly ? "Nobody on this list is playing today." : undefined}
      />
      {fixtures.length ? <FixtureList fixtures={fixtures} byFixture={byFixture} /> : null}
    </div>
  );
}
