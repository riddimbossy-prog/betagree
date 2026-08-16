import { createFileRoute, Link } from "@tanstack/react-router";
import { BoardState } from "@/components/live-bar";
import { FormDots, RecordLine, Units, formatRecord } from "@/components/record-line";
import type { RecordSlice } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { useLedger } from "@/lib/live/use-live";
import { formatPct } from "@/lib/odds";

export const Route = createFileRoute("/accuracy")({ component: AccuracyPage });

function AccuracyPage() {
  const { data, error, loading } = useLedger();
  if (loading || error || !data) {
    return (
      <div className="flex flex-col gap-8">
        <h1 className="font-display text-4xl">Accuracy</h1>
        <BoardState loading={loading} error={error} />
      </div>
    );
  }

  const rows = data.desks;
  const best = rows[0];
  const worst = [...rows].sort((a, b) => a.overall.units - b.overall.units)[0];

  return (
    <div className="flex flex-col gap-12">
      <header className="max-w-2xl">
        <p className="text-xs tracking-widest text-subtle uppercase">{data.windowLabel}</p>
        <h1 className="font-display mt-2 text-4xl">Accuracy</h1>
        <p className="mt-3 text-muted-foreground">
          Same desks, graded against {data.sample} settled matches. One unit a pick at the posted
          number. Form never uses the game being graded.
        </p>
      </header>

      <section>
        <p className="text-xs tracking-widest text-subtle uppercase">The pack</p>
        <h2 className="font-display mt-1 text-2xl">When the desks agreed</h2>
        <div className="mt-5 grid gap-3 fold:grid-cols-3">
          <PackStat k="All consensus 1X2" rec={data.pack.overall} note="Two or more desks on the same side" />
          <PackStat k="Unanimous" rec={data.pack.strong} note="Every desk that posted" />
          <PackStat k="Split lean" rec={data.pack.lean} note="Majority, not all" />
        </div>
      </section>

      {best && worst ? (
        <section className="grid gap-3 md:grid-cols-2">
          <Link
            to="/tipsters/$id"
            params={{ id: best.tipster.id }}
            className="block rounded-3xl bg-card p-5"
          >
            <p className="text-xs tracking-widest text-subtle uppercase">Best book</p>
            <h3 className="font-display mt-1 text-xl">{best.tipster.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatRecord(best.overall)} · {formatPct(best.overall.hit)} · {best.overall.units.toFixed(1)}u
            </p>
          </Link>
          <Link
            to="/tipsters/$id"
            params={{ id: worst.tipster.id }}
            className="block rounded-3xl bg-card p-5"
          >
            <p className="text-xs tracking-widest text-subtle uppercase">Worst book</p>
            <h3 className="font-display mt-1 text-xl">{worst.tipster.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatRecord(worst.overall)} · {worst.overall.units.toFixed(1)}u
            </p>
          </Link>
        </section>
      ) : null}

      <section>
        <h2 className="font-display text-2xl">Leaderboard</h2>
        <div className="mt-5 flex flex-col gap-3 lg:hidden">
          {rows.map((a, i) => (
            <Link
              key={a.tipster.id}
              to="/tipsters/$id"
              params={{ id: a.tipster.id }}
              className="rounded-3xl bg-card p-4"
            >
              <p className="text-xs text-subtle">
                #{i + 1} · {a.tipster.desk}
              </p>
              <p className="mt-1 font-semibold">{a.tipster.name}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <RecordLine rec={a.overall} />
                <span className="font-mono tabular">{formatPct(a.overall.hit)}</span>
                <Units n={a.overall.units} />
              </div>
              <div className="mt-3">
                <FormDots form={a.form} />
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-5 hidden overflow-x-auto rounded-3xl bg-card lg:block">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs tracking-wide text-subtle uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Desk</th>
                <th className="px-4 py-3 text-right font-medium">Record</th>
                <th className="px-4 py-3 text-right font-medium">Hit</th>
                <th className="px-4 py-3 text-right font-medium">Units</th>
                <th className="px-4 py-3 font-medium">Form</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a, i) => (
                <tr key={a.tipster.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-subtle tabular">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link to="/tipsters/$id" params={{ id: a.tipster.id }} className="font-medium hover:underline">
                      {a.tipster.name}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs text-subtle">{a.tipster.desk}</span>
                      <Badge variant="info">Live</Badge>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RecordLine rec={a.overall} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular">{formatPct(a.overall.hit)}</td>
                  <td className="px-4 py-3 text-right">
                    <Units n={a.overall.units} />
                  </td>
                  <td className="px-4 py-3">
                    <FormDots form={a.form} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function PackStat({ k, rec, note }: { k: string; rec: RecordSlice; note: string }) {
  return (
    <div className="rounded-3xl bg-card p-5">
      <p className="text-xs text-subtle">{k}</p>
      <p className="font-display mt-2 text-3xl">{rec.n ? formatPct(rec.hit) : "—"}</p>
      <p className="mt-1 font-mono text-sm tabular">{rec.n ? formatRecord(rec) : "No sample"}</p>
      <p className="mt-3 text-xs text-subtle">{note}</p>
    </div>
  );
}
