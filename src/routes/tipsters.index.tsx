import { createFileRoute, Link } from "@tanstack/react-router";
import { BoardState } from "@/components/live-bar";
import { FormDots, RecordLine, Units } from "@/components/record-line";
import { Badge } from "@/components/ui/badge";
import { useLedger } from "@/lib/live/use-live";
import { formatPct } from "@/lib/odds";

export const Route = createFileRoute("/tipsters/")({ component: TipstersPage });

function TipstersPage() {
  const { data, error, loading } = useLedger();
  const rows = data?.desks ?? [];

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <p className="text-xs tracking-widest text-subtle uppercase">{data?.windowLabel ?? "Live book"}</p>
        <h1 className="font-display mt-2 text-4xl">Desks</h1>
        <p className="mt-3 text-muted-foreground">
          Three live reads — the posted market, last-five form, and a goals lean. Graded on settled
          matches from this board.{" "}
          <Link to="/accuracy" className="text-foreground underline-offset-2 hover:underline">
            Accuracy
          </Link>
        </p>
      </header>

      <BoardState loading={loading} error={error} empty={!loading && !error && rows.length === 0} />

      {rows.length ? (
        <>
        <div className="flex flex-col gap-3 lg:hidden">
          {rows.map((a) => (
            <Link
              key={a.tipster.id}
              to="/tipsters/$id"
              params={{ id: a.tipster.id }}
              className="rounded-3xl bg-card p-4"
            >
              <p className="text-xs text-subtle">{a.tipster.desk}</p>
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
        <div className="hidden overflow-x-auto rounded-3xl bg-card lg:block">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs tracking-wide text-subtle uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Desk</th>
                <th className="px-4 py-3 text-right font-medium">Record</th>
                <th className="px-4 py-3 text-right font-medium">Hit</th>
                <th className="px-4 py-3 text-right font-medium">Units</th>
                <th className="px-4 py-3 font-medium">Form</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.tipster.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <Link to="/tipsters/$id" params={{ id: a.tipster.id }} className="font-medium hover:underline">
                      {a.tipster.name}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="text-xs text-subtle">{a.tipster.desk}</span>
                      {a.tipster.verified ? <Badge variant="info">Live</Badge> : null}
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
        </>
      ) : null}
    </div>
  );
}
