import type { ConsensusItem } from "@/lib/types";
import { Crest } from "@/components/crest";
import { TimeChip } from "@/components/trend-card";
import { usePickSheet } from "@/components/pick-sheet";
import { formatDecimal, formatPct } from "@/lib/odds";
import { cn } from "@/lib/utils";

export function ConsensusCard({ item, rank }: { item: ConsensusItem; rank?: number }) {
  const f = item.fixture;
  const hot = (rank ?? 0) % 2 === 0;
  const sheet = usePickSheet();
  return (
    <button
      type="button"
      onClick={() =>
        sheet.open({
          id: item.id,
          home: f.home.name,
          away: f.away.name,
          homeLogo: f.home.logo,
          awayLogo: f.away.logo,
          league: f.league,
          kickoffIso: f.start,
          label: item.label,
          odds: item.market === "1x2" ? (item.selection === "home" ? f.home.ml : item.selection === "away" ? f.away.ml : f.drawMl) : null,
          sources: ["form", "odds"],
          why: `${item.label}. ${item.count} of ${item.coverage} desks land here (${formatPct(item.pct)}). This is our read — the sheet stays on Betagree.`,
        })
      }
      className={cn(
        "block w-full min-w-0 overflow-hidden rounded-3xl p-5 text-left text-primary-foreground",
        hot ? "bg-hot" : "bg-primary",
      )}
    >
      <p className="text-xs font-medium tracking-wide text-white/70">
        {item.market === "1x2" ? "Match result" : item.market === "total" ? "Total" : "BTTS"}
        {rank !== undefined ? ` · 0${rank}` : ""}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col items-center gap-1.5">
          <Crest name={f.away.name} logo={f.away.logo} size="lg" />
          <span className="max-w-24 truncate text-center text-xs">{f.away.name}</span>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold tabular">
            {f.away.score ?? "–"} <span className="text-white/50">:</span> {f.home.score ?? "–"}
          </p>
          <div className="mt-2 flex justify-center">
            <TimeChip raw={null} iso={f.start} invert />
          </div>
        </div>
        <div className="flex min-w-0 flex-col items-center gap-1.5">
          <Crest name={f.home.name} logo={f.home.logo} size="lg" />
          <span className="max-w-24 truncate text-center text-xs">{f.home.name}</span>
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
    </button>
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
