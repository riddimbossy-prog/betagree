import type { ConsensusItem, Fixture } from "@/lib/types";
import { formatDecimal } from "@/lib/odds";
import { Crest } from "@/components/crest";
import { TimeChip } from "@/components/trend-card";
import { ConsensusChip } from "@/components/consensus-chip";
import { usePickSheet } from "@/components/pick-sheet";
import { bandOf, decideBoardTip, hasConsensus, marketTitle, presentBoardTip } from "@/lib/consensus";
import { useLeagueRates } from "@/lib/league-rates";
import { SettleChip } from "@/components/settle-chip";
import { settleBoardTip, settleRank } from "@/lib/settle";
import { useOdds } from "@/lib/live/use-odds";
import { tipPrice } from "@/lib/tip-odds";

export function FixtureList({
  fixtures,
  byFixture,
}: {
  fixtures: Fixture[];
  byFixture: Map<string, ConsensusItem[]>;
}) {
  const sheet = usePickSheet();
  const rates = useLeagueRates(fixtures);
  const odds = useOdds();
  const ordered = [...fixtures].sort((a, b) => {
    const rowsA = byFixture.get(a.id) ?? [];
    const rowsB = byFixture.get(b.id) ?? [];
    const tipA = decideBoardTip(rowsA, rates);
    const tipB = decideBoardTip(rowsB, rates);
    const settleA = tipA ? settleBoardTip(presentBoardTip(tipA.tip), a) : "pending";
    const settleB = tipB ? settleBoardTip(presentBoardTip(tipB.tip), b) : "pending";
    const rank = settleRank(settleA) - settleRank(settleB);
    if (rank) return rank;
    if (Boolean(a.live) !== Boolean(b.live)) return a.live ? -1 : 1;
    return String(a.start ?? "").localeCompare(String(b.start ?? ""));
  });
  return (
    <ul className="flex flex-col gap-3">
      {ordered.map((f) => {
        const rows = byFixture.get(f.id) ?? [];
        if (!hasConsensus(rows)) return null;
        const decision = decideBoardTip(rows, rates);
        if (!decision) return null;
        const tip = presentBoardTip(decision.tip);
        const band = bandOf(tip);
        const settled = settleBoardTip(tip, f);
        const price = tipPrice(tip, f, odds);
        return (
          <li key={f.id}>
            <button
              type="button"
              onClick={() =>
                sheet.open({
                  id: f.id,
                  home: f.home.name,
                  away: f.away.name,
                  homeLogo: f.home.logo,
                  awayLogo: f.away.logo,
                  league: f.league,
                  kickoffIso: f.start,
                  label: tip.boardLabel,
                  odds: price,
                })
              }
              className="glass glass-lift block w-full min-w-0 overflow-hidden rounded-3xl p-3 text-left fold:p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                {f.live ? (
                  <span className="rounded-full bg-gules px-2.5 py-0.5 text-[11px] font-bold tracking-wide text-background uppercase">
                    {f.detail || "Live"}
                  </span>
                ) : (
                  <TimeChip raw={null} iso={f.start} />
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-subtle">{f.league}</span>
                <span className="shrink-0">
                  <ConsensusChip
                    pct={tip.pct}
                    count={tip.count}
                    coverage={tip.coverage}
                    band={band}
                    compact
                  />
                </span>
              </div>
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 fold:gap-3">
                <span className="flex min-w-0 items-center gap-1.5 fold:gap-2">
                  <Crest name={f.away.name} logo={f.away.logo} size="xs" className="fold:h-16 fold:w-[3.25rem]" />
                  <span className="truncate text-sm font-medium fold:text-lg">{f.away.name}</span>
                </span>
                <span className="px-1 text-base font-bold tabular fold:text-2xl">
                  {f.away.score ?? "–"} : {f.home.score ?? "–"}
                </span>
                <span className="flex min-w-0 items-center justify-end gap-1.5 fold:gap-2">
                  <span className="truncate text-right text-sm font-medium fold:text-lg">{f.home.name}</span>
                  <Crest name={f.home.name} logo={f.home.logo} size="xs" className="fold:h-16 fold:w-[3.25rem]" />
                </span>
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span className="odds-chip bg-secondary">{formatDecimal(f.away.ml)}</span>
                <span className="odds-chip bg-secondary">{formatDecimal(f.drawMl)}</span>
                <span className="odds-chip bg-secondary">{formatDecimal(f.home.ml)}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <p className="text-[11px] tracking-wide text-subtle uppercase">{marketTitle(tip.boardMarket)}</p>
                <SettleChip status={settled} compact />
                {price != null ? <span className="odds-chip">{price.toFixed(2)}</span> : null}
              </div>
              <p className="text-base text-or">{tip.boardLabel}</p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
