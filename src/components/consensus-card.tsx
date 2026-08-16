import { Link } from "@tanstack/react-router";
import type { ConsensusItem } from "@/lib/types";
import { Crest } from "@/components/crest";
import { formatKickoff } from "@/lib/format";
import { formatDecimal, formatPct } from "@/lib/odds";
import { cn } from "@/lib/utils";

export function ConsensusCard({ item, rank }: { item: ConsensusItem; rank?: number }) {
  const f = item.fixture;
  const hot = (rank ?? 0) % 2 === 0;
  return (
    <Link
      to="/fixtures/$id"
      params={{ id: f.id }}
      className={cn(
        "block w-full min-w-0 overflow-hidden rounded-3xl p-5 text-primary-foreground",
        hot ? "bg-hot" : "bg-primary",
      )}
    >
      <p className="text-xs font-medium tracking-wide text-white/70">
        {item.market === "1x2" ? "Match result" : item.market === "total" ? "Total" : "BTTS"}
        {rank !== undefined ? ` · 0${rank}` : ""}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col items-center gap-1.5">
          <Crest logo={f.away.logo} abbr={f.away.abbr} />
          <span className="max-w-20 truncate text-center text-xs">{f.away.name}</span>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold tabular">
            {f.away.score ?? "–"} <span className="text-white/50">:</span> {f.home.score ?? "–"}
          </p>
          <p className="mt-1 text-xs text-white/70">
            {f.live ? f.detail || "Live" : formatKickoff(f.start)}
          </p>
        </div>
        <div className="flex min-w-0 flex-col items-center gap-1.5">
          <Crest logo={f.home.logo} abbr={f.home.abbr} />
          <span className="max-w-20 truncate text-center text-xs">{f.home.name}</span>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span className="odds-chip">{formatDecimal(f.away.ml)}</span>
        <span className="odds-chip">{formatDecimal(f.drawMl)}</span>
        <span className="odds-chip">{formatDecimal(f.home.ml)}</span>
      </div>
      <p className="mt-4 text-center text-sm font-semibold">{item.label}</p>
      <p className="mt-1 text-center text-xs text-white/70">
        {item.count}/{item.coverage} desks · {formatPct(item.pct)}
      </p>
    </Link>
  );
}

export function AgreeBar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className={cn("mt-4 w-full max-w-full", className)}>
      <div className="flex items-center justify-between text-xs text-subtle">
        <span>Agreement</span>
        <span className="tabular">{formatPct(pct)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(pct * 100)}%` }} />
      </div>
    </div>
  );
}

export function OddsTriple({
  away,
  draw,
  home,
}: {
  away: number | null;
  draw: number | null;
  home: number | null;
}) {
  return (
    <span className="font-mono text-xs text-muted-foreground tabular">
      {formatDecimal(away)} / {formatDecimal(draw)} / {formatDecimal(home)}
    </span>
  );
}
