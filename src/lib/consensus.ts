import type { ConsensusItem, Fixture } from "@/lib/types";
import { formatHitPct, getLeagueRates, leagueHitRate, type LeagueRatesFile } from "@/lib/league-rates";

export type ConsensusBand = "high" | "medium" | "low";

export const SITE_COUNT = 22;

export const BAND_META: Record<
  ConsensusBand,
  { id: ConsensusBand; label: string; blurb: string; floor: string }
> = {
  high: { id: "high", label: "High", blurb: "70%+ of tip sites on the same pick", floor: "70%+" },
  medium: { id: "medium", label: "Medium", blurb: "50–69% of tip sites — shown as DNB / safer line", floor: "50–69%" },
  low: { id: "low", label: "Low", blurb: "Split board — shown as double chance / safer line", floor: "<50%" },
};

const BAND_RANK: Record<ConsensusBand, number> = { high: 2, medium: 1, low: 0 };

export function consensusBand(pct: number): ConsensusBand {
  if (pct >= 0.7) return "high";
  if (pct >= 0.5) return "medium";
  return "low";
}

export function bandOf(item: { band?: ConsensusBand | null; pct: number }): ConsensusBand {
  return item.band ?? consensusBand(item.pct);
}

export function consensusByFixture(items: ConsensusItem[]): Map<string, ConsensusItem[]> {
  const map = new Map<string, ConsensusItem[]>();
  for (const item of items) {
    const id = item.fixture?.id;
    if (!id) continue;
    const rows = map.get(id) ?? [];
    rows.push(item);
    map.set(id, rows);
  }
  return map;
}

export function hasConsensus(rows: ConsensusItem[] | undefined): boolean {
  return Boolean(rows?.length);
}

export function fixturesWithConsensus<T extends Pick<Fixture, "id">>(
  fixtures: T[],
  byFixture: Map<string, ConsensusItem[]>,
): T[] {
  return fixtures.filter((fixture) => hasConsensus(byFixture.get(fixture.id)));
}

/** One candidate per match: high band first, never a medium if a high exists. */
export function pickBoardTip(rows: ConsensusItem[] | undefined, rates?: LeagueRatesFile | null): ConsensusItem | null {
  return decideBoardTip(rows, rates)?.tip ?? null;
}

export const TIE_RULES = [
  { id: "band", label: "Higher band" },
  { id: "pct", label: "Higher agreement %" },
  { id: "count", label: "More desks on that side" },
  { id: "coverage", label: "More desks posted the market" },
  { id: "safer", label: "Safer in that league" },
  { id: "price", label: "Shorter posted price" },
  { id: "label", label: "Alphabetical label" },
] as const;

export type TieRuleId = (typeof TIE_RULES)[number]["id"] | "sole";

export type BoardDecision = {
  tip: ConsensusItem;
  rule: TieRuleId;
  tied: boolean;
  rival: ConsensusItem | null;
  leagueNote: string | null;
};

function roundedPct(item: ConsensusItem) {
  return Math.round(item.pct * 100);
}

/** Higher = safer in this league (hit rate). Falls back to a generic ladder. */
export function marketSafety(item: ConsensusItem, rates?: LeagueRatesFile | null): number {
  const hit = leagueHitRate(rates ?? getLeagueRates(), item);
  if (hit != null) return hit * 100;
  if (item.market === "total") {
    const { side, line } = parseTotalSelection(item.selection, item.fixture.total ?? 2.5);
    if (side === "over") return 110 - line * 12;
    return 40 + line * 12;
  }
  if (item.market === "dc") return 88;
  if (item.market === "dnb") return 82;
  if (item.market === "btts") return item.selection === "no" ? 72 : 58;
  if (item.market === "1x2") return item.selection === "draw" ? 54 : 48;
  return 40;
}

function impliedPrice(item: ConsensusItem): number {
  const f = item.fixture;
  if (!f) return 0;
  if (item.market === "1x2" || item.market === "dnb") {
    const odds = item.selection === "home" ? f.home.ml : item.selection === "away" ? f.away.ml : f.drawMl;
    if (odds == null || !Number.isFinite(odds) || odds === 0) return 0;
    return odds < 0 ? -odds / (-odds + 100) : 100 / (odds + 100);
  }
  return 0;
}

function splitPair(a: ConsensusItem, b: ConsensusItem, rates?: LeagueRatesFile | null): { winner: ConsensusItem; rule: TieRuleId } {
  const bandA = BAND_RANK[bandOf(a)];
  const bandB = BAND_RANK[bandOf(b)];
  if (bandA !== bandB) return { winner: bandA > bandB ? a : b, rule: "band" };

  const pctA = roundedPct(a);
  const pctB = roundedPct(b);
  if (pctA !== pctB) return { winner: pctA > pctB ? a : b, rule: "pct" };

  if (a.count !== b.count) return { winner: a.count > b.count ? a : b, rule: "count" };
  if (a.coverage !== b.coverage) return { winner: a.coverage > b.coverage ? a : b, rule: "coverage" };

  const safeA = marketSafety(a, rates);
  const safeB = marketSafety(b, rates);
  if (safeA !== safeB) return { winner: safeA > safeB ? a : b, rule: "safer" };

  const priceA = impliedPrice(a);
  const priceB = impliedPrice(b);
  if (priceA !== priceB) return { winner: priceA > priceB ? a : b, rule: "price" };

  const label = String(a.label).localeCompare(String(b.label));
  if (label !== 0) return { winner: label < 0 ? a : b, rule: "label" };
  return { winner: a, rule: "label" };
}

export function decideBoardTip(rows: ConsensusItem[] | undefined, rates?: LeagueRatesFile | null): BoardDecision | null {
  const book = rates ?? getLeagueRates();
  if (!rows?.length) return null;
  if (rows.length === 1) return { tip: rows[0], rule: "sole", tied: false, rival: null, leagueNote: null };

  const ranked = [...rows].sort((a, b) => (splitPair(a, b, book).winner === a ? -1 : 1));
  const tip = ranked[0];
  const rival = ranked[1];
  const split = splitPair(tip, rival, book);
  const sameStrength = bandOf(tip) === bandOf(rival) && roundedPct(tip) === roundedPct(rival);
  const leagueNote =
    sameStrength && split.rule === "safer"
      ? leagueTieNote(split.winner, rival, book)
      : null;
  return {
    tip: split.winner,
    rule: split.rule,
    tied: sameStrength && split.rule !== "pct" && split.rule !== "band",
    rival: sameStrength ? rival : null,
    leagueNote,
  };
}

function leagueTieNote(winner: ConsensusItem, rival: ConsensusItem, rates?: LeagueRatesFile | null) {
  const league = winner.fixture?.league || "This league";
  const winRate = leagueHitRate(rates, winner);
  const loseRate = leagueHitRate(rates, rival);
  if (winRate == null || loseRate == null) return `${league} — safer market`;
  return `${league} hits ${winner.label} ${formatHitPct(winRate)} vs ${rival.label} ${formatHitPct(loseRate)}`;
}

export function tieRuleLabel(id: TieRuleId) {
  if (id === "sole") return "Only market on the card";
  return TIE_RULES.find((rule) => rule.id === id)?.label ?? "Tie-break";
}

export type PresentedTip = ConsensusItem & {
  boardLabel: string;
  boardMarket: string;
  boardSelection: string;
  rawLabel: string;
  downgrade: "none" | "dnb" | "dc" | "safer-line";
};

function teamName(item: ConsensusItem, side: string) {
  return side === "away" ? item.fixture.away.name : item.fixture.home.name;
}

export function parseTotalSelection(selection: string, fallbackLine = 2.5) {
  const match = String(selection).match(/^(over|under)(?::(\d+(?:\.\d+)?))?$/i);
  if (!match) return { side: "over" as const, line: fallbackLine };
  return {
    side: match[1].toLowerCase() as "over" | "under",
    line: match[2] ? Number(match[2]) : fallbackLine,
  };
}

function saferTotal(side: "over" | "under", line: number, steps: number) {
  const next = side === "over" ? Math.max(0.5, line - steps) : line + steps;
  return { side, line: next };
}

function totalLabel(side: "over" | "under", line: number) {
  return `${side === "over" ? "Over" : "Under"} ${line}`;
}

export function presentBoardTip(item: ConsensusItem): PresentedTip {
  const band = bandOf(item);
  const raw = {
    ...item,
    boardLabel: item.label,
    boardMarket: item.market,
    boardSelection: item.selection,
    rawLabel: item.label,
    downgrade: "none" as const,
  };
  if (band === "high") return raw;

  const steps = band === "medium" ? 1 : 2;

  if (item.market === "1x2") {
    if (item.selection === "home" || item.selection === "away") {
      const name = teamName(item, item.selection);
      if (band === "medium") {
        return {
          ...item,
          boardLabel: `${name} DNB`,
          boardMarket: "dnb",
          boardSelection: item.selection,
          rawLabel: item.label,
          downgrade: "dnb",
        };
      }
      return {
        ...item,
        boardLabel: `${name} or draw`,
        boardMarket: "dc",
        boardSelection: item.selection === "home" ? "1X" : "X2",
        rawLabel: item.label,
        downgrade: "dc",
      };
    }
    if (band === "medium") {
      return {
        ...item,
        boardLabel: "Home or away",
        boardMarket: "dc",
        boardSelection: "12",
        rawLabel: item.label,
        downgrade: "dc",
      };
    }
    return {
      ...item,
      boardLabel: "Under 3.5",
      boardMarket: "total",
      boardSelection: "under:3.5",
      rawLabel: item.label,
      downgrade: "safer-line",
    };
  }

  if (item.market === "total") {
    const parsed = parseTotalSelection(item.selection, item.fixture.total ?? 2.5);
    const next = saferTotal(parsed.side, parsed.line, steps);
    return {
      ...item,
      boardLabel: totalLabel(next.side, next.line),
      boardMarket: "total",
      boardSelection: `${next.side}:${next.line}`,
      rawLabel: item.label,
      downgrade: "safer-line",
    };
  }

  if (item.market === "btts") {
    if (item.selection === "yes") {
      const line = band === "medium" ? 1.5 : 0.5;
      return {
        ...item,
        boardLabel: `Over ${line}`,
        boardMarket: "total",
        boardSelection: `over:${line}`,
        rawLabel: item.label,
        downgrade: "safer-line",
      };
    }
    const line = band === "medium" ? 3.5 : 4.5;
    return {
      ...item,
      boardLabel: `Under ${line}`,
      boardMarket: "total",
      boardSelection: `under:${line}`,
      rawLabel: item.label,
      downgrade: "safer-line",
    };
  }

  return raw;
}

export function boardWhy(tip: PresentedTip, decision?: BoardDecision | null) {
  const strength =
    tip.band === "high" ? "High consensus." : tip.band === "medium" ? "Medium consensus." : "Low consensus — the sites are split.";
  const pct = `${Math.round(tip.pct * 100)}%`;
  const base = `${tip.rawLabel}. ${tip.count} of ${tip.coverage} desks land here (${pct}). ${strength}`;
  const tie =
    decision?.tied && decision.rival
      ? ` Tied with ${decision.rival.label} at ${pct} — ${decision.leagueNote ?? tieRuleLabel(decision.rule).toLowerCase()}.`
      : "";
  if (tip.downgrade === "dnb") return `${base}${tie} Straight win is too sharp at this band — the board takes ${tip.boardLabel}.`;
  if (tip.downgrade === "dc") return `${base}${tie} We step down to ${tip.boardLabel}.`;
  if (tip.downgrade === "safer-line") return `${base}${tie} Safer line on the board: ${tip.boardLabel}.`;
  return `${base}${tie} The sheet stays here.`;
}

export function marketTitle(market: string) {
  if (market === "1x2") return "Match result";
  if (market === "dnb") return "Draw no bet";
  if (market === "dc") return "Double chance";
  if (market === "total") return "Total";
  if (market === "btts") return "BTTS";
  return market;
}
