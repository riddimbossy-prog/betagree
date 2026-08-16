import { Link } from "@tanstack/react-router";
import type { ConsensusItem, Fixture } from "@/lib/types";
import { formatKickoff } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { OddsTriple } from "@/components/consensus-card";

export function FixtureList({
  fixtures,
  byFixture,
}: {
  fixtures: Fixture[];
  byFixture: Map<string, ConsensusItem[]>;
}) {
  return (
    <ul className="divide-y-2 divide-ink border-2 border-ink bg-card">
      {fixtures.map((f) => {
        const top = (byFixture.get(f.id) ?? []).find((c) => c.market === "1x2");
        return (
          <li key={f.id}>
            <Link
              to="/fixtures/$id"
              params={{ id: f.id }}
              className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-xs text-subtle">
                  {f.live ? (
                    <span className="text-primary">{f.detail || "Live"}</span>
                  ) : (
                    formatKickoff(f.start)
                  )}{" "}
                  · {f.league}
                </p>
                <p className="mt-0.5 truncate text-sm font-medium">
                  {f.away.name}
                  {f.away.score != null ? ` ${f.away.score}` : ""}{" "}
                  <span className="text-subtle">at</span>{" "}
                  {f.home.score != null ? `${f.home.score} ` : ""}
                  {f.home.name}
                </p>
                <OddsTriple away={f.away.ml} draw={f.drawMl} home={f.home.ml} />
              </div>
              {top ? (
                <div className="flex items-center gap-2 sm:text-right">
                  <span className="text-sm">{top.label}</span>
                  <Badge variant={top.pct >= 0.7 ? "win" : "outline"}>
                    {top.count}/{top.coverage}
                  </Badge>
                </div>
              ) : (
                <span className="text-xs text-subtle">No consensus</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
