import {
  bandOf,
  boardWhy,
  decideBoardTip,
  presentBoardTip,
  type ConsensusBand,
} from "@/lib/consensus";
import { fixtureIsToday } from "@/lib/format";
import type { LeagueRatesFile } from "@/lib/league-rates";
import { settleBoardTip, type SettleStatus } from "@/lib/settle";
import type { ConsensusItem, Fixture, FormRow } from "@/lib/types";

const STOP = new Set([
  "fc", "cf", "sc", "afc", "cfc", "fk", "sk", "ac", "the", "de", "do", "da", "club", "united", "city",
]);

function norm(s: string) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(s: string) {
  return norm(s)
    .split(" ")
    .filter((w) => w.length > 1 && !STOP.has(w));
}

export function sameTeam(a: string, b: string) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb || na.replace(/\s+/g, "") === nb.replace(/\s+/g, "")) return true;
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return false;
  const hit = ta.filter((x) => tb.some((y) => x === y || (x.length > 3 && y.length > 3 && (x.includes(y) || y.includes(x)))));
  if (!hit.length) return false;
  const aInB = ta.every((x) => tb.some((y) => x === y || x.includes(y) || y.includes(x)));
  const bInA = tb.every((y) => ta.some((x) => x === y || x.includes(y) || y.includes(x)));
  return aInB || bInA || hit.length / Math.max(ta.length, tb.length) >= 0.67;
}

export function findTeamFixture(fixtures: Fixture[], team: string): Fixture | null {
  let best: Fixture | null = null;
  let score = 0;
  for (const f of fixtures) {
    const home = sameTeam(f.home.name, team);
    const away = sameTeam(f.away.name, team);
    const s = home || away ? 1 : 0;
    if (s > score) {
      best = f;
      score = s;
    }
  }
  return best;
}

export function findFormRow(rows: FormRow[], team: string) {
  return rows.find((row) => sameTeam(row.team, team)) ?? null;
}

export type FormBoardRow = FormRow & {
  kickoff?: string | null;
  boardLabel?: string | null;
  boardMarket?: string | null;
  boardSelection?: string | null;
  band?: ConsensusBand | null;
  pct?: number | null;
  tipCount?: number | null;
  coverage?: number | null;
  settle?: SettleStatus | null;
  homeLogo?: string | null;
  awayLogo?: string | null;
  homeForm?: string | null;
  awayForm?: string | null;
  why?: string | null;
  price?: number | null;
};

export function attachFormTip(
  row: FormRow,
  fixtures: Fixture[],
  byFixture: Map<string, ConsensusItem[]>,
  rates?: LeagueRatesFile | null,
): FormBoardRow {
  const fixture =
    (row.fixtureId ? fixtures.find((f) => f.id === row.fixtureId) : null) ?? findTeamFixture(fixtures, row.team);
  if (!fixture) return row;
  const home = sameTeam(fixture.home.name, row.team);
  const decision = decideBoardTip(byFixture.get(fixture.id), rates);
  const tip = decision ? presentBoardTip(decision.tip) : null;
  return {
    ...row,
    fixtureId: fixture.id,
    opponent: home ? fixture.away.name : fixture.home.name,
    home: fixture.home.name,
    away: fixture.away.name,
    logo: home ? fixture.home.logo : fixture.away.logo,
    playingToday: row.playingToday || fixtureIsToday(fixture) || fixture.live,
    kickoff: fixture.start,
    homeLogo: fixture.home.logo,
    awayLogo: fixture.away.logo,
    boardLabel: tip?.boardLabel ?? null,
    boardMarket: tip?.boardMarket ?? null,
    boardSelection: tip?.boardSelection ?? null,
    band: tip ? bandOf(tip) : null,
    pct: tip?.pct ?? null,
    tipCount: tip?.count ?? null,
    coverage: tip?.coverage ?? null,
    settle: tip ? settleBoardTip(tip, fixture) : null,
    why: tip ? boardWhy(tip, decision) : null,
  };
}

export function boardFormRows(
  fixtures: Fixture[],
  byFixture: Map<string, ConsensusItem[]>,
  formRows: FormRow[],
  rates?: LeagueRatesFile | null,
): FormBoardRow[] {
  const out: FormBoardRow[] = [];
  for (const fixture of fixtures) {
    const decision = decideBoardTip(byFixture.get(fixture.id), rates);
    if (!decision) continue;
    const tip = presentBoardTip(decision.tip);
    const homeForm = findFormRow(formRows, fixture.home.name);
    const awayForm = findFormRow(formRows, fixture.away.name);
    out.push({
      rank: out.length + 1,
      team: fixture.home.name,
      league: fixture.league,
      count: homeForm?.count ?? 0,
      matches: homeForm?.matches ?? 0,
      rate: homeForm?.rate ?? null,
      display: homeForm?.display ?? "—",
      valueKind: homeForm?.valueKind ?? "pct",
      playingToday: fixtureIsToday(fixture) || Boolean(fixture.live),
      tipPath: null,
      teamPath: null,
      logo: fixture.home.logo,
      fixtureId: fixture.id,
      opponent: fixture.away.name,
      home: fixture.home.name,
      away: fixture.away.name,
      kickoff: fixture.start,
      boardLabel: tip.boardLabel,
      boardMarket: tip.boardMarket,
      boardSelection: tip.boardSelection,
      band: bandOf(tip),
      pct: tip.pct,
      tipCount: tip.count,
      coverage: tip.coverage,
      settle: settleBoardTip(tip, fixture),
      homeLogo: fixture.home.logo,
      awayLogo: fixture.away.logo,
      homeForm: homeForm?.display ?? "—",
      awayForm: awayForm?.display ?? "—",
      why: boardWhy(tip, decision),
    });
  }
  return out;
}
