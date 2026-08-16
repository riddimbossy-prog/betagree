import { Link } from "@tanstack/react-router";
import type { ConsensusItem, Fixture } from "@/lib/types";
import { formatKickoff } from "@/lib/format";
import { formatDecimal } from "@/lib/odds";

export function FixtureList({
  fixtures,
  byFixture,
}: {
  fixtures: Fixture[];
  byFixture: Map<string, ConsensusItem[]>;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {fixtures.map((f) => {
        const top = (byFixture.get(f.id) ?? []).find((c) => c.market === "1x2");
        return (
          <li key={f.id}>
            <Link
              to="/fixtures/$id"
              params={{ id: f.id }}
              className="block rounded-3xl bg-card p-4 shadow-border"
            >
              <p className="text-xs text-subtle">
                {f.live ? <span className="text-hot">{f.detail || "Live"}</span> : formatKickoff(f.start)}
                {" · "}
                {f.league}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.away.name}</span>
                <span className="text-xl font-bold tabular">
                  {f.away.score ?? "–"} : {f.home.score ?? "–"}
                </span>
                <span className="min-w-0 flex-1 truncate text-right text-sm font-medium">{f.home.name}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="odds-chip bg-secondary">1 {formatDecimal(f.away.ml)}</span>
                <span className="odds-chip bg-secondary">X {formatDecimal(f.drawMl)}</span>
                <span className="odds-chip bg-secondary">2 {formatDecimal(f.home.ml)}</span>
              </div>
              {top ? (
                <p className="mt-3 text-sm text-primary">{top.label}</p>
              ) : (
                <p className="mt-3 text-xs text-subtle">No consensus</p>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
