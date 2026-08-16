import type { ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BoardState } from "@/components/live-bar";
import { FormDots, RecordLine, Units, formatRecord } from "@/components/record-line";
import { Badge } from "@/components/ui/badge";
import { formatKickoff, initials } from "@/lib/format";
import { useLedger, useSlate } from "@/lib/live/use-live";
import { formatPct } from "@/lib/odds";
import type { RecordSlice } from "@/lib/types";

export const Route = createFileRoute("/tipsters/$id")({
  component: TipsterPage,
});

function TipsterPage() {
  const { id } = Route.useParams();
  const ledger = useLedger();
  const slate = useSlate();
  const acc = ledger.data?.desks.find((d) => d.tipster.id === id);
  const tipster = acc?.tipster ?? slate.data?.desks.find((d) => d.id === id);
  const today = (slate.data?.picks ?? []).filter((p) => p.tipsterId === id && p.market === "1x2");

  if (ledger.loading || slate.loading) return <BoardState loading error={null} />;
  if (!tipster) {
    return (
      <p className="text-sm text-muted-foreground">
        Unknown desk.{" "}
        <Link to="/tipsters" className="underline">
          All desks
        </Link>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="font-display grid size-14 place-items-center bg-secondary text-xl shadow-border">
            {initials(tipster.name)}
          </div>
          <div>
            <p className="text-xs tracking-widest text-subtle uppercase">{tipster.handle}</p>
            <h1 className="font-display mt-1 text-4xl">{tipster.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="info">Live</Badge>
              <span className="text-sm text-muted-foreground">{tipster.desk}</span>
              {acc ? <FormDots form={acc.form} /> : null}
            </div>
          </div>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{tipster.bio}</p>
      </header>

      {acc ? (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat k="Last 21 days" v={formatPct(acc.overall.hit)} s={formatRecord(acc.overall)} />
            <Stat k="Units" v={<Units n={acc.overall.units} />} s="1u a pick" />
            <Stat k="Today" v={`${today.length}`} s="open matches" />
          </dl>
          <section className="grid gap-3 md:grid-cols-3">
            <Slice k="1X2" rec={acc.markets["1x2"]} />
            <Slice k="Totals" rec={acc.markets.total} />
            <Slice k="BTTS" rec={acc.markets.btts} />
          </section>
          <section>
            <h2 className="font-display text-2xl">Recent 1X2</h2>
            <ul className="mt-4 divide-y divide-border bg-card shadow-border">
              {acc.recent.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-subtle">
                      {formatKickoff(p.fixture.start)} · {p.fixture.league}
                    </p>
                    <p className="text-sm font-medium">{p.label}</p>
                    <p className="truncate text-xs text-subtle">
                      {p.fixture.away.abbr} {p.fixture.away.score}–{p.fixture.home.score} {p.fixture.home.abbr}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={p.result === "won" ? "win" : p.result === "lost" ? "loss" : "warn"}>
                      {p.result}
                    </Badge>
                    <Units n={p.units} />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <BoardState loading={false} error={ledger.error} />
      )}

      <section>
        <h2 className="font-display text-2xl">Today's card</h2>
        <ul className="mt-4 divide-y divide-border bg-card shadow-border">
          {today.map((p) => {
            const f = slate.data?.fixtures.find((x) => x.id === p.fixtureId);
            if (!f) return null;
            const top = slate.data?.consensus.find((c) => c.fixture.id === f.id && c.market === "1x2");
            const withPack = top && top.selection === p.selection;
            return (
              <li key={p.id}>
                <Link
                  to="/fixtures/$id"
                  params={{ id: f.id }}
                  className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-subtle">
                      {formatKickoff(f.start)} · {f.league}
                    </p>
                    <p className="text-sm font-medium">{p.label}</p>
                  </div>
                  {top ? (
                    <Badge variant={withPack ? "win" : "outline"}>{withPack ? "With pack" : "Fade"}</Badge>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Stat({ k, v, s }: { k: string; v: ReactNode; s: string }) {
  return (
    <div className="rounded-sm bg-card px-4 py-4 shadow-border">
      <dt className="text-xs text-subtle">{k}</dt>
      <dd className="mt-1 font-mono text-lg tabular">{v}</dd>
      <dd className="mt-1 text-xs text-subtle">{s}</dd>
    </div>
  );
}

function Slice({ k, rec }: { k: string; rec: RecordSlice }) {
  return (
    <div className="bg-card p-5 shadow-border">
      <p className="text-xs text-subtle">{k}</p>
      <p className="font-display mt-2 text-2xl">{rec.n ? formatPct(rec.hit) : "—"}</p>
      <p className="mt-1 text-sm">
        <RecordLine rec={rec} />
        {rec.n ? (
          <>
            {" · "}
            <Units n={rec.units} />
          </>
        ) : null}
      </p>
    </div>
  );
}
