import type { ConsensusItem } from "@/lib/types";
import { Crest } from "@/components/crest";
import { TimeChip } from "@/components/trend-card";
import { ConsensusChip } from "@/components/consensus-chip";
import { usePickSheet } from "@/components/pick-sheet";
import { bandOf, boardWhy, marketTitle, presentBoardTip } from "@/lib/consensus";
import { formatDecimal, formatPct } from "@/lib/odds";
import { SettleChip } from "@/components/settle-chip";
import { settleBoardTip } from "@/lib/settle";
import { useOdds } from "@/lib/live/use-odds";
import { tipPrice } from "@/lib/tip-odds";
import { cn } from "@/lib/utils";

export function ConsensusCard({ item, rank }: { item: ConsensusItem; rank?: number }) {
  const f = item.fixture;
  const wash = ["glass-purpure", "glass-azure", "glass-gules", "glass-lime", "glass-amber"][(rank ?? 0) % 5];
  const sheet = usePickSheet();
  const tip = presentBoardTip(item);
  const band = bandOf(tip);
  const settled = settleBoardTip(tip, f);
  const odds = useOdds();
  const price = tipPrice(tip, f, odds);
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
          label: tip.boardLabel,
          odds: price,
          sources: ["form", "odds"],
          why: boardWhy(tip),
        })
      }
      className={cn(
        "block w-full min-w-0 overflow-hidden rounded-3xl p-4 text-left text-primary-foreground fold:p-5",
        wash,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium tracking-wide text-white/70">
          {marketTitle(tip.boardMarket)}
          {rank !== undefined ? ` · 0${rank}` : ""}
        </p>
        <ConsensusChip pct={item.pct} count={item.count} coverage={item.coverage} band={band} compact />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col items-center gap-1.5">
          <Crest name={f.away.name} logo={f.away.logo} size="sm" className="fold:h-24 fold:w-[4.75rem]" />
          <span className="max-w-20 truncate text-center text-[11px] fold:max-w-28 fold:text-xs">{f.away.name}</span>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold tabular fold:text-3xl">
            {f.away.score ?? "–"} <span className="text-white/50">:</span> {f.home.score ?? "–"}
          </p>
          <div className="mt-2 flex justify-center">
            <TimeChip raw={null} iso={f.start} invert />
          </div>
        </div>
        <div className="flex min-w-0 flex-col items-center gap-1.5">
          <Crest name={f.home.name} logo={f.home.logo} size="sm" className="fold:h-24 fold:w-[4.75rem]" />
          <span className="max-w-20 truncate text-center text-[11px] fold:max-w-28 fold:text-xs">{f.home.name}</span>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <span className="odds-chip">{formatDecimal(f.away.ml)}</span>
        <span className="odds-chip">{formatDecimal(f.drawMl)}</span>
        <span className="odds-chip">{formatDecimal(f.home.ml)}</span>
      </div>
      <p className="mt-4 text-center text-sm font-semibold">{tip.boardLabel}</p>
      <div className="mt-2 flex justify-center gap-2">
        {price != null ? <span className="odds-chip">{price.toFixed(2)}</span> : null}
        <SettleChip status={settled} />
      </div>
      {tip.downgrade !== "none" ? (
        <p className="mt-1 text-center text-xs text-white/70">From {tip.rawLabel}</p>
      ) : null}
    </button>
  );
}

export function AgreeBar({
  pct,
  className,
  band,
}: {
  pct: number;
  className?: string;
  band?: "high" | "medium" | "low";
}) {
  const fill =
    band === "high" ? "bg-band-high" : band === "medium" ? "bg-band-medium" : band === "low" ? "bg-band-low" : "bg-primary";
  return (
    <div className={cn("mt-4 w-full max-w-full", className)}>
      <div className="flex items-center justify-between text-xs text-subtle">
        <span>Agreement</span>
        <span className="tabular">{formatPct(pct)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className={cn("h-full rounded-full", fill)} style={{ width: `${Math.round(pct * 100)}%` }} />
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
