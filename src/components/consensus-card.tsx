import { Link } from "@tanstack/react-router";
import type { ConsensusItem } from "@/lib/types";
import { formatKickoff } from "@/lib/format";
import { formatDecimal, formatPct } from "@/lib/odds";
import { cn } from "@/lib/utils";

export function ConsensusCard({ item, rank }: { item: ConsensusItem; rank?: number }) {
  const f = item.fixture;
  return (
    <Link
      to="/fixtures/$id"
      params={{ id: f.id }}
      className="block w-full min-w-0 border-2 border-ink bg-card p-4 transition-[box-shadow] duration-150 hover:shadow-border-hover"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-xs tracking-wider uppercase">
            {rank !== undefined ? `${String(rank).padStart(2, "0")} · ` : ""}
            {item.market === "1x2" ? "Match result" : item.market === "total" ? "Total" : "BTTS"}
          </p>
          <h3 className="mt-1 text-2xl normal-case">{item.label}</h3>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {f.away.name} at {f.home.name} · {f.league} · {formatKickoff(f.start)}
          </p>
        </div>
        <span className="font-display shrink-0 border-2 border-ink px-2 py-1 text-sm tabular">
          {item.count}/{item.coverage}
        </span>
      </div>
      <AgreeBar pct={item.pct} />
      <p className="mt-3 text-sm text-subtle">
        With: {item.agree.map((t) => t.name).join(", ")}
        {item.fade.length ? (
          <span className="mt-1 block">Against: {item.fade.map((t) => t.name).join(", ")}</span>
        ) : (
          <span className="mt-1 block text-win">Unanimous</span>
        )}
      </p>
    </Link>
  );
}

export function AgreeBar({ pct, className }: { pct: number; className?: string }) {
  return (
    <div className={cn("mt-4 w-full max-w-full", className)}>
      <div className="flex items-center justify-between font-display text-xs tracking-wider uppercase">
        <span>Agreement</span>
        <span className="tabular">{formatPct(pct)}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden border-2 border-ink bg-secondary">
        <div
          className="h-full bg-primary"
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
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
    <span className="font-mono text-xs tabular">
      {formatDecimal(away)} / {formatDecimal(draw)} / {formatDecimal(home)}
    </span>
  );
}
