import { createFileRoute, Link } from "@tanstack/react-router";
import { AgreeBar } from "@/components/consensus-card";
import { BoardState, LiveBar } from "@/components/live-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatKickoffLong, marketLabel } from "@/lib/format";
import { useSlate } from "@/lib/live/use-live";
import { formatDecimal } from "@/lib/odds";

export const Route = createFileRoute("/fixtures/$id")({
  component: FixturePage,
});

function FixturePage() {
  const { id } = Route.useParams();
  const { data, error, loading } = useSlate();
  const fixture = data?.fixtures.find((f) => f.id === id);
  const picks = (data?.picks ?? []).filter((p) => p.fixtureId === id);
  const consensus = (data?.consensus ?? []).filter((c) => c.fixture.id === id);
  const onDesk = (data?.desks ?? []).filter((t) => picks.some((p) => p.tipsterId === t.id));

  if (loading || error) {
    return <BoardState loading={loading} error={error} />;
  }
  if (!fixture) {
    return (
      <p className="text-sm text-muted-foreground">
        That match is not on today's board.{" "}
        <Link to="/fixtures" className="underline">
          Back to fixtures
        </Link>
      </p>
    );
  }

  const resultPicks = picks.filter((p) => p.market === "1x2");
  const totalPicks = picks.filter((p) => p.market === "total");
  const bttsPicks = picks.filter((p) => p.market === "btts");

  return (
    <div className="flex flex-col gap-8">
      <p className="text-xs tracking-widest text-subtle uppercase">
        <Link to="/fixtures" className="hover:text-foreground">
          Fixtures
        </Link>
        <span className="mx-2">/</span>
        {fixture.league}
      </p>

      <header className="rounded-3xl bg-card p-5">
        <LiveBar fetchedAt={data?.fetchedAt} liveCount={fixture.live ? 1 : 0} />
        <p className="mt-3 text-xs text-subtle">
          {fixture.live || fixture.status === "post" ? fixture.detail : formatKickoffLong(fixture.start)}
          {" · "}
          {fixture.league}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="grid size-14 place-items-center rounded-full bg-secondary text-sm font-bold">
              {fixture.away.abbr.slice(0, 3)}
            </span>
            <span className="text-center text-sm font-medium">{fixture.away.name}</span>
          </div>
          <p className="text-4xl font-bold tabular">
            {fixture.away.score ?? "–"} <span className="text-subtle">:</span> {fixture.home.score ?? "–"}
          </p>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="grid size-14 place-items-center rounded-full bg-secondary text-sm font-bold">
              {fixture.home.abbr.slice(0, 3)}
            </span>
            <span className="text-center text-sm font-medium">{fixture.home.name}</span>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-2">
          <OddCell k="1" v={formatDecimal(fixture.away.ml)} />
          <OddCell k="X" v={formatDecimal(fixture.drawMl)} />
          <OddCell k="2" v={formatDecimal(fixture.home.ml)} />
        </dl>
      </header>

      {consensus.length ? (
        <section className="grid gap-3 md:grid-cols-2">
          {consensus.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-5">
                <p className="text-xs tracking-widest text-subtle uppercase">{marketLabel(c.market)}</p>
                <h2 className="font-display mt-1 text-2xl">{c.label}</h2>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant={c.pct >= 0.7 ? "win" : "info"}>
                    {c.count}/{c.coverage}
                  </Badge>
                  {c.fade.length === 0 ? <Badge variant="win">Unanimous</Badge> : null}
                </div>
                <AgreeBar pct={c.pct} />
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      <section>
        <h2 className="font-display text-2xl">Desks</h2>
        <p className="mt-1 text-sm text-muted-foreground">{onDesk.length} live reads on this match.</p>
        <div className="mt-4 overflow-x-auto bg-card shadow-border">
          <table className="w-full min-w-3xl text-sm">
            <thead className="border-b border-border text-left text-xs tracking-wide text-subtle uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Desk</th>
                <th className="px-4 py-3 font-medium">1X2</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">BTTS</th>
              </tr>
            </thead>
            <tbody>
              {onDesk.map((t) => {
                const r = resultPicks.find((p) => p.tipsterId === t.id);
                const o = totalPicks.find((p) => p.tipsterId === t.id);
                const b = bttsPicks.find((p) => p.tipsterId === t.id);
                const top = consensus.find((c) => c.market === "1x2");
                const withPack = r && top && r.selection === top.selection;
                return (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <Link to="/tipsters/$id" params={{ id: t.id }} className="font-medium hover:underline">
                        {t.name}
                      </Link>
                      <p className="text-xs text-subtle">{t.desk}</p>
                    </td>
                    <td className="px-4 py-3">
                      {r ? (
                        <span className={withPack ? "text-foreground" : "text-muted-foreground"}>
                          {r.label}
                          {withPack ? (
                            <span className="ml-2 text-xs text-win">pack</span>
                          ) : (
                            <span className="ml-2 text-xs text-subtle">fade</span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{o?.label ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{b?.label ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function OddCell({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl bg-secondary px-3 py-3 text-center">
      <dt className="text-xs text-subtle">{k}</dt>
      <dd className="mt-1 font-mono text-lg tabular">{v}</dd>
    </div>
  );
}
