import type {
  ConsensusItem,
  Desk,
  DeskAccuracy,
  Fixture,
  GradedPick,
  LedgerPayload,
  Market,
  Pick,
  PickResult,
  RecordSlice,
  SlatePayload,
} from "../types";
import { americanProfit, americanToImplied, parseAmerican } from "../odds";
import { format, isValid } from "date-fns";

export const DESKS: Desk[] = [
  {
    id: "market",
    name: "Market",
    handle: "@draftkings",
    desk: "Price",
    style: "The posted 1X2 and total — whatever the book is shortest on",
    verified: true,
    bio: "Live DraftKings number from the ESPN board. Not a tipster. The price itself.",
  },
  {
    id: "form",
    name: "Form",
    handle: "@form",
    desk: "Last five",
    style: "Points from the last five settled matches on this board",
    verified: true,
    bio: "3 for a win, 1 for a draw. Picks the side that has been collecting more points.",
  },
  {
    id: "attack",
    name: "Attack",
    handle: "@attack",
    desk: "Goals",
    style: "Goals for and against over the last five, used as a simple expected-goals lean",
    verified: true,
    bio: "Compares each side's recent scoring and conceding. Also posts the total and BTTS.",
  },
];

const DESK_BY_ID = Object.fromEntries(DESKS.map((d) => [d.id, d])) as Record<string, Desk>;

type TeamForm = { pts: number; gf: number; ga: number; n: number; scored: number };

function emptyForm(): TeamForm {
  return { pts: 0, gf: 0, ga: 0, n: 0, scored: 0 };
}

export function buildTeamForm(history: Fixture[]): Map<string, TeamForm> {
  const games = new Map<string, Fixture[]>();
  for (const f of history) {
    if (f.home.score == null || f.away.score == null) continue;
    for (const id of [f.home.id, f.away.id]) {
      const arr = games.get(id) ?? [];
      arr.push(f);
      games.set(id, arr);
    }
  }
  const out = new Map<string, TeamForm>();
  for (const [id, arr] of games) {
    const last = arr.slice(-5);
    const rec = emptyForm();
    for (const f of last) {
      const home = f.home.id === id;
      const gf = home ? (f.home.score ?? 0) : (f.away.score ?? 0);
      const ga = home ? (f.away.score ?? 0) : (f.home.score ?? 0);
      rec.n += 1;
      rec.gf += gf;
      rec.ga += ga;
      if (gf > 0) rec.scored += 1;
      if (gf > ga) rec.pts += 3;
      else if (gf === ga) rec.pts += 1;
    }
    out.set(id, rec);
  }
  return out;
}

function implied(odds: number | null) {
  return odds == null ? 0 : americanToImplied(odds);
}

function favSide(f: Fixture): "home" | "draw" | "away" {
  const h = implied(f.home.ml);
  const a = implied(f.away.ml);
  const d = implied(f.drawMl);
  if (h >= a && h >= d) return "home";
  if (a >= h && a >= d) return "away";
  return "draw";
}

function label1x2(f: Fixture, side: string) {
  if (side === "home") return `${f.home.name} to win`;
  if (side === "away") return `${f.away.name} to win`;
  return "Draw";
}

function pickMarket(f: Fixture): Pick[] {
  const out: Pick[] = [];
  if (f.home.ml != null || f.away.ml != null) {
    const side = favSide(f);
    out.push({
      id: `market-${f.id}-1x2`,
      tipsterId: "market",
      fixtureId: f.id,
      market: "1x2",
      selection: side,
      label: label1x2(f, side),
      confidence: "strong",
    });
  }
  if (f.total != null) {
    const over = parseAmerican(f.overOdds);
    const under = parseAmerican(f.underOdds);
    const side = under != null && over != null && implied(under) > implied(over) ? "under" : "over";
    out.push({
      id: `market-${f.id}-ou`,
      tipsterId: "market",
      fixtureId: f.id,
      market: "total",
      selection: side,
      label: `${side === "over" ? "Over" : "Under"} ${f.total}`,
      confidence: "play",
    });
  }
  return out;
}

function pickForm(f: Fixture, form: Map<string, TeamForm>): Pick[] {
  const h = form.get(f.home.id) ?? emptyForm();
  const a = form.get(f.away.id) ?? emptyForm();
  if (h.n < 2 && a.n < 2) return [];
  const homeRate = h.n ? h.pts / h.n : 0;
  const awayRate = a.n ? a.pts / a.n : 0;
  let side: "home" | "draw" | "away" = "draw";
  if (homeRate > awayRate + 0.25) side = "home";
  else if (awayRate > homeRate + 0.25) side = "away";
  return [
    {
      id: `form-${f.id}-1x2`,
      tipsterId: "form",
      fixtureId: f.id,
      market: "1x2",
      selection: side,
      label: label1x2(f, side),
      confidence: Math.abs(homeRate - awayRate) > 0.6 ? "strong" : "play",
    },
  ];
}

function pickAttack(f: Fixture, form: Map<string, TeamForm>): Pick[] {
  const h = form.get(f.home.id) ?? emptyForm();
  const a = form.get(f.away.id) ?? emptyForm();
  if (h.n < 2 && a.n < 2) return [];
  const homeExp = (h.n ? h.gf / h.n : 1) + (a.n ? a.ga / a.n : 1);
  const awayExp = (a.n ? a.gf / a.n : 1) + (h.n ? h.ga / h.n : 1);
  const totalExp = (homeExp + awayExp) / 2;
  let side: "home" | "draw" | "away" = "draw";
  if (homeExp > awayExp + 0.35) side = "home";
  else if (awayExp > homeExp + 0.35) side = "away";
  const line = f.total ?? 2.5;
  const ou = totalExp > line ? "over" : "under";
  const btts =
    (h.n ? h.scored / h.n : 0) >= 0.6 && (a.n ? a.scored / a.n : 0) >= 0.6 ? "yes" : "no";
  return [
    {
      id: `attack-${f.id}-1x2`,
      tipsterId: "attack",
      fixtureId: f.id,
      market: "1x2",
      selection: side,
      label: label1x2(f, side),
      confidence: "play",
    },
    {
      id: `attack-${f.id}-ou`,
      tipsterId: "attack",
      fixtureId: f.id,
      market: "total",
      selection: ou,
      label: `${ou === "over" ? "Over" : "Under"} ${line}`,
      confidence: "play",
    },
    {
      id: `attack-${f.id}-btts`,
      tipsterId: "attack",
      fixtureId: f.id,
      market: "btts",
      selection: btts,
      label: btts === "yes" ? "Both teams to score" : "BTTS — no",
      confidence: "lean",
    },
  ];
}

export function buildPicks(fixtures: Fixture[], history: Fixture[]): Pick[] {
  const form = buildTeamForm(history);
  return fixtures.flatMap((f) => [...pickMarket(f), ...pickForm(f, form), ...pickAttack(f, form)]);
}

export function buildConsensus(picks: Pick[], fixtures: Fixture[]): ConsensusItem[] {
  const byId = Object.fromEntries(fixtures.map((f) => [f.id, f]));
  const groups = new Map<string, Pick[]>();
  const coverage = new Map<string, Set<string>>();
  for (const p of picks) {
    const g = `${p.fixtureId}|${p.market}|${p.selection}`;
    const arr = groups.get(g) ?? [];
    arr.push(p);
    groups.set(g, arr);
    const c = `${p.fixtureId}|${p.market}`;
    const set = coverage.get(c) ?? new Set();
    set.add(p.tipsterId);
    coverage.set(c, set);
  }

  const items: ConsensusItem[] = [];
  for (const [key, group] of groups) {
    const [fixtureId, market, selection] = key.split("|") as [string, Market, string];
    const fixture = byId[fixtureId];
    if (!fixture) continue;
    const cov = coverage.get(`${fixtureId}|${market}`)?.size ?? group.length;
    if (cov < 2) continue;
    const agreeIds = new Set(group.map((g) => g.tipsterId));
    if (agreeIds.size < 2) continue;
    const posted = picks.filter((p) => p.fixtureId === fixtureId && p.market === market);
    const fade = DESKS.filter(
      (d) => posted.some((p) => p.tipsterId === d.id) && !agreeIds.has(d.id),
    );
    const agree = [...agreeIds].map((id) => DESK_BY_ID[id]).filter(Boolean);
    const pct = agree.length / cov;
    items.push({
      id: key,
      fixture,
      market,
      selection,
      label: group[0].label,
      agree,
      fade,
      coverage: cov,
      count: agree.length,
      pct,
      rankScore: agree.length * 12 + pct * 50 + (agree.length === cov ? 8 : 0),
    });
  }

  const best = new Map<string, ConsensusItem>();
  for (const item of items) {
    const k = `${item.fixture.id}|${item.market}`;
    const prev = best.get(k);
    if (!prev || item.count > prev.count || (item.count === prev.count && item.pct > prev.pct)) {
      best.set(k, item);
    }
  }
  return [...best.values()].sort((a, b) => b.rankScore - a.rankScore || b.pct - a.pct);
}

function emptyRec(): RecordSlice {
  return { n: 0, won: 0, lost: 0, push: 0, hit: 0, units: 0 };
}

function add(rec: RecordSlice, result: PickResult, units: number) {
  rec.n += 1;
  if (result === "won") rec.won += 1;
  else if (result === "lost") rec.lost += 1;
  else rec.push += 1;
  rec.units += units;
  const decided = rec.won + rec.lost;
  rec.hit = decided ? rec.won / decided : 0;
}

function gradePick(p: Pick, f: Fixture): { result: PickResult; odds: number | null } | null {
  const hs = f.home.score;
  const as = f.away.score;
  if (hs == null || as == null) return null;
  if (p.market === "1x2") {
    const out = hs > as ? "home" : as > hs ? "away" : "draw";
    const odds = p.selection === "home" ? f.home.ml : p.selection === "away" ? f.away.ml : f.drawMl;
    return { result: p.selection === out ? "won" : "lost", odds: odds ?? null };
  }
  if (p.market === "total") {
    const line = f.total;
    if (line == null) return null;
    const goals = hs + as;
    const odds = p.selection === "over" ? parseAmerican(f.overOdds) : parseAmerican(f.underOdds);
    if (goals === line) return { result: "push", odds };
    const over = goals > line;
    const hit = p.selection === "over" ? over : !over;
    return { result: hit ? "won" : "lost", odds };
  }
  const btts = hs > 0 && as > 0;
  const hit = p.selection === "yes" ? btts : !btts;
  return { result: hit ? "won" : "lost", odds: -110 };
}

function sliceOf(picks: GradedPick[]): RecordSlice {
  const rec = emptyRec();
  for (const p of picks) add(rec, p.result, p.units);
  return rec;
}

export function gradeLedger(history: Fixture[]): LedgerPayload {
  const sorted = [...history].sort((a, b) => +new Date(a.start) - +new Date(b.start));
  const picks: Pick[] = [];
  for (let i = 0; i < sorted.length; i++) {
    picks.push(...buildPicks([sorted[i]], sorted.slice(0, i)));
  }
  const consensus = buildConsensus(picks, history);
  const packMap = new Map(consensus.map((c) => [`${c.fixture.id}|${c.market}`, c]));
  const byId = Object.fromEntries(history.map((f) => [f.id, f]));

  const graded: GradedPick[] = [];
  for (const p of picks) {
    const f = byId[p.fixtureId];
    if (!f) continue;
    const g = gradePick(p, f);
    if (!g) continue;
    const pack = packMap.get(`${p.fixtureId}|${p.market}`);
    const withPack = pack ? pack.selection === p.selection : null;
    const units =
      g.result === "push" || g.odds == null ? 0 : g.result === "won" ? americanProfit(g.odds) : -1;
    graded.push({ ...p, result: g.result, odds: g.odds, units, withPack, fixture: f });
  }
  graded.sort((a, b) => +new Date(b.fixture.start) - +new Date(a.fixture.start));

  const desks: DeskAccuracy[] = DESKS.map((tipster) => {
    const mine = graded.filter((p) => p.tipsterId === tipster.id);
    const byLeague = new Map<string, GradedPick[]>();
    for (const p of mine) {
      const arr = byLeague.get(p.fixture.league) ?? [];
      arr.push(p);
      byLeague.set(p.fixture.league, arr);
    }
    return {
      tipster,
      overall: sliceOf(mine),
      markets: {
        "1x2": sliceOf(mine.filter((p) => p.market === "1x2")),
        total: sliceOf(mine.filter((p) => p.market === "total")),
        btts: sliceOf(mine.filter((p) => p.market === "btts")),
      },
      leagues: [...byLeague.entries()]
        .map(([league, rows]) => ({ league, rec: sliceOf(rows) }))
        .sort((a, b) => b.rec.n - a.rec.n),
      withPack: sliceOf(mine.filter((p) => p.withPack === true)),
      fade: sliceOf(mine.filter((p) => p.withPack === false)),
      form: mine.filter((p) => p.market === "1x2").slice(0, 12).map((p) => p.result),
      recent: mine.filter((p) => p.market === "1x2").slice(0, 12),
    };
  }).sort((a, b) => b.overall.units - a.overall.units);

  const pack = { overall: emptyRec(), strong: emptyRec(), lean: emptyRec() };
  for (const item of consensus.filter((c) => c.market === "1x2")) {
    const fake: Pick = {
      id: item.id,
      tipsterId: "pack",
      fixtureId: item.fixture.id,
      market: item.market,
      selection: item.selection,
      label: item.label,
      confidence: "play",
    };
    const g = gradePick(fake, item.fixture);
    if (!g) continue;
    add(pack.overall, g.result, 0);
    if (item.pct >= 0.99) add(pack.strong, g.result, 0);
    else add(pack.lean, g.result, 0);
  }

  const first = history[0]?.start;
  const last = history[history.length - 1]?.start;
  const a = first ? new Date(first) : null;
  const b = last ? new Date(last) : null;
  const windowLabel =
    a && b && isValid(a) && isValid(b)
      ? `${format(a, "d MMM")} – ${format(b, "d MMM yyyy")}`
      : "Last 21 days";

  return {
    windowLabel,
    fetchedAt: new Date().toISOString(),
    sample: history.length,
    pack,
    desks,
  };
}

export function assembleSlate(day: Date, fixtures: Fixture[], history: Fixture[]): SlatePayload {
  const picks = buildPicks(fixtures, history);
  const consensus = buildConsensus(picks, fixtures);
  return {
    date: day.toISOString().slice(0, 10),
    dateLabel: isValid(day) ? format(day, "EEEE d MMMM yyyy") : "Today",
    fetchedAt: new Date().toISOString(),
    fixtures,
    picks,
    consensus,
    desks: DESKS,
  };
}
