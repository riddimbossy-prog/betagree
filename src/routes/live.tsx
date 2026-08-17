import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { FixtureList } from "@/components/fixture-list";
import { BoardState, LiveBar } from "@/components/live-bar";
import { Button } from "@/components/ui/button";
import { isLiveBoardMatch } from "@/lib/board-match";
import { useSlate } from "@/lib/live/use-live";
import { loadBoardSnapshot } from "@/lib/live/snapshot";
import type { ConsensusItem } from "@/lib/types";

export const Route = createFileRoute("/live")({
  loader: async () => {
    try {
      return await loadBoardSnapshot();
    } catch {
      return null;
    }
  },
  component: LivePage,
});

function LivePage() {
  const initial = Route.useLoaderData();
  const { data, error, loading, reload } = useSlate(initial);
  const [league, setLeague] = useState("all");

  const byFixture = useMemo(() => {
    const m = new Map<string, ConsensusItem[]>();
    for (const c of data?.consensus ?? []) {
      const arr = m.get(c.fixture.id) ?? [];
      arr.push(c);
      m.set(c.fixture.id, arr);
    }
    return m;
  }, [data]);

  const live = useMemo(
    () => (data?.fixtures ?? []).filter(isLiveBoardMatch),
    [data],
  );
  const fixtures = league === "all" ? live : live.filter((f) => f.league === league);
  const leagues = [...new Set(live.map((f) => f.league))];

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <LiveBar fetchedAt={data?.fetchedAt} liveCount={live.length} />
        <h1 className="font-display mt-2 text-3xl fold:text-4xl">
          In <span className="font-serif italic font-normal">play</span>
        </h1>
        <p className="mt-2 text-sm text-subtle">
          {loading ? "Loading…" : `${live.length} from today's board`}
        </p>
      </header>

      {leagues.length > 1 ? (
        <div className="chip-row">
          <Button
            type="button"
            size="sm"
            variant={league === "all" ? "default" : "outline"}
            onClick={() => setLeague("all")}
          >
            All leagues
            <span className="tabular opacity-70">{live.length}</span>
          </Button>
          {leagues.map((name) => (
            <Button
              key={name}
              type="button"
              size="sm"
              variant={league === name ? "default" : "outline"}
              onClick={() => setLeague(name)}
            >
              {name}
              <span className="tabular opacity-70">{live.filter((f) => f.league === name).length}</span>
            </Button>
          ))}
        </div>
      ) : null}

      <BoardState
        loading={loading && !data}
        error={error}
        empty={!loading && !error && fixtures.length === 0}
        emptyLabel="Nothing from today's board is in play."
        onRetry={reload}
      />
      {fixtures.length ? <FixtureList fixtures={fixtures} byFixture={byFixture} /> : null}

      <p className="text-sm text-muted-foreground">
        <Link to="/fixtures" className="underline-offset-2 hover:underline">
          Full fixture list
        </Link>
      </p>
    </div>
  );
}
