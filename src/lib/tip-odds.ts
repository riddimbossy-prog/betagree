import { parseTotalSelection, type PresentedTip } from "@/lib/consensus";
import { parseAmerican, toDecimal } from "@/lib/odds";
import type { Fixture } from "@/lib/types";

export type OuLine = { over: number | null; under: number | null };

export type FixtureBook = {
  fixtureId?: string;
  homeWin?: number | null;
  draw?: number | null;
  awayWin?: number | null;
  dnbHome?: number | null;
  dnbAway?: number | null;
  dc1x?: number | null;
  dc12?: number | null;
  dcx2?: number | null;
  ou?: Record<string, OuLine>;
  bttsYes?: number | null;
  bttsNo?: number | null;
};

export type OddsFile = {
  fetchedAt?: string;
  source?: string;
  byFixture?: Record<string, FixtureBook>;
};

function impliedFromAmerican(american: number | null | undefined) {
  const dec = toDecimal(american);
  return dec && dec > 1 ? 1 / dec : 0;
}

function fair(parts: number[]) {
  const sum = parts.reduce((s, p) => s + p, 0);
  return sum > 0 ? 1 / sum : null;
}

function deriveFromEspn(fixture: Fixture): FixtureBook {
  const pH = impliedFromAmerican(fixture.home.ml);
  const pD = impliedFromAmerican(fixture.drawMl);
  const pA = impliedFromAmerican(fixture.away.ml);
  const over = toDecimal(parseAmerican(fixture.overOdds));
  const under = toDecimal(parseAmerican(fixture.underOdds));
  const line = fixture.total != null ? String(fixture.total) : null;
  return {
    homeWin: toDecimal(fixture.home.ml),
    draw: toDecimal(fixture.drawMl),
    awayWin: toDecimal(fixture.away.ml),
    dnbHome: pH && pA ? 1 / (pH / (pH + pA)) : null,
    dnbAway: pH && pA ? 1 / (pA / (pH + pA)) : null,
    dc1x: pH && pD ? fair([pH, pD]) : null,
    dc12: pH && pA ? fair([pH, pA]) : null,
    dcx2: pD && pA ? fair([pD, pA]) : null,
    ou: line && (over || under) ? { [line]: { over: over ?? null, under: under ?? null } } : {},
    bttsYes: null,
    bttsNo: null,
  };
}

function pick(book: FixtureBook | null | undefined, espn: FixtureBook, key: keyof FixtureBook) {
  const live = book?.[key];
  if (typeof live === "number" && Number.isFinite(live) && live > 1) return live;
  const fallback = espn[key];
  return typeof fallback === "number" && Number.isFinite(fallback) && fallback > 1 ? fallback : null;
}

export function bookForFixture(fixture: Fixture, file?: OddsFile | null): FixtureBook {
  return file?.byFixture?.[fixture.id] ?? {};
}

export function tipPrice(
  tip: Pick<PresentedTip, "boardMarket" | "boardSelection">,
  fixture: Fixture,
  file?: OddsFile | null,
): number | null {
  const book = bookForFixture(fixture, file);
  const espn = deriveFromEspn(fixture);
  const market = tip.boardMarket;
  const sel = String(tip.boardSelection);

  if (market === "1x2") {
    if (sel === "home") return pick(book, espn, "homeWin");
    if (sel === "away") return pick(book, espn, "awayWin");
    return pick(book, espn, "draw");
  }
  if (market === "dnb") {
    return sel === "away" ? pick(book, espn, "dnbAway") : pick(book, espn, "dnbHome");
  }
  if (market === "dc") {
    if (sel === "1X") return pick(book, espn, "dc1x");
    if (sel === "X2") return pick(book, espn, "dcx2");
    return pick(book, espn, "dc12");
  }
  if (market === "total") {
    const { side, line } = parseTotalSelection(sel, fixture.total ?? 2.5);
    const key = String(line);
    const live = book.ou?.[key]?.[side];
    if (typeof live === "number" && live > 1) return live;
    const fb = espn.ou?.[key]?.[side];
    return typeof fb === "number" && fb > 1 ? fb : null;
  }
  if (market === "btts") {
    return sel === "no" ? pick(book, espn, "bttsNo") : pick(book, espn, "bttsYes");
  }
  return null;
}
