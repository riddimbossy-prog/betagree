import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Crest } from "@/components/crest";
import { BoardState, LiveBar } from "@/components/live-bar";
import { TimeChip } from "@/components/trend-card";
import { usePickSheet } from "@/components/pick-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fixtureIsToday } from "@/lib/format";
import { bandTeams, DEFAULT_BAND, fixturesInBand, type BandSide } from "@/lib/odds-band";
import { formatDecimal, toDecimal } from "@/lib/odds";
import { useSlate } from "@/lib/live/use-live";
import { loadBoardSnapshot } from "@/lib/live/snapshot";
import { useTodayOnly } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/odds")({
  loader: async () => {
    try {
      return await loadBoardSnapshot();
    } catch {
      return null;
    }
  },
  component: OddsFilterPage,
});

function OddsFilterPage() {
  const initial = Route.useLoaderData();
  const { data, error, loading } = useSlate(initial);
  const sheet = usePickSheet();
  const [from, setFrom] = useState(String(DEFAULT_BAND.from));
  const [to, setTo] = useState(String(DEFAULT_BAND.to));
  const [side, setSide] = useState<BandSide>("any");
  const todayOnly = useTodayOnly();

  const fromN = Number(from) || DEFAULT_BAND.from;
  const toN = Number(to) || DEFAULT_BAND.to;

  const hits = useMemo(() => {
    const list = fixturesInBand(data?.fixtures ?? [], fromN, toN, side);
    return todayOnly ? list.filter((hit) => fixtureIsToday(hit.fixture)) : list;
  }, [data, fromN, toN, side, todayOnly]);
  const { best, worst } = useMemo(() => bandTeams(hits), [hits]);

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <LiveBar fetchedAt={data?.fetchedAt} liveCount={data?.fixtures.filter((f) => f.live).length} />
        <h1 className="mt-2 text-4xl font-semibold">
          Odds <span className="font-serif italic font-normal">filter</span>
        </h1>
      </header>

      <form
        className="grid gap-3 rounded-3xl bg-card p-4 fold:grid-cols-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="text-sm">
          <span className="mb-1 block text-xs text-subtle">From</span>
          <Input
            type="number"
            min={1.01}
            max={20}
            step={0.01}
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-full"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-subtle">To</span>
          <Input
            type="number"
            min={1.01}
            max={20}
            step={0.01}
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-full"
          />
        </label>
        <div className="fold:col-span-2">
          <p className="mb-1 text-xs text-subtle">Side</p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["any", "Any"],
                ["home", "Home fav"],
                ["away", "Away fav"],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={side === id ? "default" : "outline"}
                onClick={() => setSide(id)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </form>

      <BoardState
        loading={loading && !data}
        error={error}
        empty={!loading && !error && hits.length === 0}
        emptyLabel={todayOnly ? "Nobody in this band is playing today." : undefined}
      />

      {hits.length ? (
        <>
          <section>
            <h2 className="text-2xl font-semibold">
              Best <span className="font-serif italic font-normal">teams</span>
            </h2>
            <ul className="mt-4 grid gap-3 fold:grid-cols-2">
              {best.map((row) => (
                <TeamTile key={`${row.team.id}-${row.fixture.id}`} row={row} />
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">
              Worst <span className="font-serif italic font-normal">teams</span>
            </h2>
            <ul className="mt-4 grid gap-3 fold:grid-cols-2">
              {worst.map((row) => (
                <TeamTile key={`${row.team.id}-${row.fixture.id}`} row={row} />
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">
              Matches <span className="font-serif italic font-normal">in range</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{hits.length} on the live slate</p>
            <ul className="mt-4 flex flex-col gap-3">
              {hits.map((hit) => (
                <li key={`${hit.fixture.id}-${hit.side}`}>
                  <button
                    type="button"
                    onClick={() =>
                      sheet.open({
                        id: `${hit.fixture.id}-${hit.side}`,
                        home: hit.fixture.home.name,
                        away: hit.fixture.away.name,
                        homeLogo: hit.fixture.home.logo,
                        awayLogo: hit.fixture.away.logo,
                        league: hit.fixture.league,
                        kickoffIso: hit.fixture.start,
                        label: `${hit.favorite.name} @ ${hit.price.toFixed(2)}`,
                        odds: hit.price,
                        sources: ["odds"],
                        why: `${hit.favorite.name} is the short price at ${hit.price.toFixed(2)} in the 1.20–1.55 band. This is the Odds desk read, kept on Betagree.`,
                      })
                    }
                    className="glass block w-full rounded-3xl p-4 text-left"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      {hit.fixture.live ? (
                        <span className="rounded-full bg-gules px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-hot-foreground uppercase">
                          {hit.fixture.detail || "Live"}
                        </span>
                      ) : (
                        <TimeChip raw={null} iso={hit.fixture.start} />
                      )}
                      <span className="truncate text-xs text-subtle">{hit.fixture.league}</span>
                    </div>
                    <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <Crest name={hit.fixture.away.name} logo={hit.fixture.away.logo} size="sm" />
                        <span className="truncate text-sm font-medium">{hit.fixture.away.name}</span>
                      </span>
                      <span className="text-lg font-bold tabular">
                        {hit.fixture.away.score ?? "–"} : {hit.fixture.home.score ?? "–"}
                      </span>
                      <span className="flex min-w-0 items-center justify-end gap-2">
                        <span className="truncate text-right text-sm font-medium">{hit.fixture.home.name}</span>
                        <Crest name={hit.fixture.home.name} logo={hit.fixture.home.logo} size="sm" />
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      <span
                        className={cn(
                          "odds-chip",
                          hit.side === "away" ? "bg-primary text-primary-foreground" : "bg-secondary",
                        )}
                      >
                        {formatDecimal(hit.fixture.away.ml)}
                      </span>
                      <span className="odds-chip bg-secondary">{formatDecimal(hit.fixture.drawMl)}</span>
                      <span
                        className={cn(
                          "odds-chip",
                          hit.side === "home" ? "bg-primary text-primary-foreground" : "bg-secondary",
                        )}
                      >
                        {formatDecimal(hit.fixture.home.ml)}
                      </span>
                    </div>
                    <p className="mt-3 text-center text-sm text-azure">
                      {hit.favorite.name} @ {hit.price.toFixed(2)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  );
}

function TeamTile({
  row,
}: {
  row: ReturnType<typeof bandTeams>["best"][number];
}) {
  const sheet = usePickSheet();
  const vsPrice = toDecimal(row.versus.ml);
  return (
    <li>
      <button
        type="button"
        onClick={() =>
          sheet.open({
            id: `team:${row.fixture.id}:${row.team.id}`,
            home: row.team.name,
            away: row.versus.name,
            homeLogo: row.team.logo,
            awayLogo: row.versus.logo,
            league: row.fixture.league,
            kickoffIso: row.fixture.start,
            label: `${row.team.name} @ ${row.price.toFixed(2)}`,
            odds: row.price,
            sources: ["odds"],
            why: `${row.team.name} are the short price at ${row.price.toFixed(2)} against ${row.versus.name}. Odds-desk band only — the sheet stays on Betagree.`,
          })
        }
        className="glass flex w-full items-center gap-3 rounded-3xl p-4 text-left"
      >
        <Crest name={row.team.name} logo={row.team.logo} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{row.team.name}</p>
          <p className="truncate text-xs text-subtle">
            vs {row.versus.name}
            {vsPrice ? ` · ${vsPrice.toFixed(2)}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-azure px-3 py-1 text-sm font-semibold tabular text-primary-foreground">
          {row.price.toFixed(2)}
        </span>
      </button>
    </li>
  );
}
