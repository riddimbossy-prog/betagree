import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FixtureList } from "@/components/fixture-list";
import { BoardState, LiveBar } from "@/components/live-bar";
import { Button } from "@/components/ui/button";
import { useSlate } from "@/lib/live/use-live";

export const Route = createFileRoute("/fixtures/")({ component: FixturesPage });

function FixturesPage() {
  const { data, error, loading } = useSlate();
  const [league, setLeague] = useState("all");
  const fixtures = useMemo(() => {
    const list = data?.fixtures ?? [];
    return list.filter((f) => league === "all" || f.league === league);
  }, [data, league]);
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
        <LiveBar fetchedAt={data?.fetchedAt} liveCount={data?.fixtures.filter((f) => f.live).length} />
        <h1 className="font-display mt-2 text-4xl">Fixtures</h1>
        <p className="mt-3 text-muted-foreground">
          Live slate. Scores and prices refresh on their own. Open a row to see each desk.
        </p>
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

      <BoardState loading={loading} error={error} empty={!loading && !error && fixtures.length === 0} />
      {fixtures.length ? <FixtureList fixtures={fixtures} byFixture={byFixture} /> : null}
    </div>
  );
}
