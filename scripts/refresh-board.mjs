import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const LEAGUES = [
  ["eng.1", "Premier League"],
  ["eng.2", "Championship"],
  ["eng.3", "League One"],
  ["esp.1", "La Liga"],
  ["esp.2", "La Liga 2"],
  ["ita.1", "Serie A"],
  ["ita.2", "Serie B"],
  ["ger.1", "Bundesliga"],
  ["ger.2", "2. Bundesliga"],
  ["fra.1", "Ligue 1"],
  ["fra.2", "Ligue 2"],
  ["ned.1", "Eredivisie"],
  ["por.1", "Primeira Liga"],
  ["bel.1", "Belgian Pro League"],
  ["sco.1", "Scottish Premiership"],
  ["tur.1", "Süper Lig"],
  ["usa.1", "MLS"],
  ["mex.1", "Liga MX"],
  ["bra.1", "Brasileirão"],
  ["arg.1", "Liga Profesional"],
  ["uefa.champions", "Champions League"],
  ["uefa.europa", "Europa League"],
];

const DESKS = [
  { id: "market", name: "Market", handle: "@draftkings", desk: "Price", style: "", verified: true, bio: "" },
  { id: "form", name: "Form", handle: "@form", desk: "Last five", style: "", verified: true, bio: "" },
  { id: "attack", name: "Attack", handle: "@attack", desk: "Goals", style: "", verified: true, bio: "" },
];

function ymd(d) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function parseAmerican(raw) {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace("+", "").trim());
  return Number.isFinite(n) && n !== 0 ? n : null;
}

function teamLogo(team) {
  if (typeof team.logo === "string" && team.logo.startsWith("http")) return team.logo;
  const href = team.logos?.[0]?.href;
  if (typeof href === "string" && href.startsWith("http")) return href;
  if (team.id) return `https://a.espncdn.com/i/teamlogos/soccer/500/${team.id}.png`;
  return null;
}

function closeOdds(side) {
  if (!side || typeof side !== "object") return null;
  return parseAmerican(side.close?.odds ?? side.odds ?? side.moneyLine);
}

function parseEvent(e, league, slug) {
  const comps = (e.competitions ?? [])[0];
  if (!comps) return null;
  const teams = comps.competitors ?? [];
  const home = teams.find((t) => t.homeAway === "home");
  const away = teams.find((t) => t.homeAway === "away");
  if (!home || !away) return null;
  const ht = home.team ?? {};
  const at = away.team ?? {};
  const odd0 = (comps.odds ?? [])[0] ?? {};
  const ml = odd0.moneyline ?? {};
  const tot = odd0.total ?? {};
  const status = e.status?.type ?? {};
  const state = String(status.state ?? "pre");
  const hs = home.score != null && home.score !== "" ? Number(home.score) : null;
  const as = away.score != null && away.score !== "" ? Number(away.score) : null;
  return {
    id: String(e.id),
    league,
    leagueSlug: slug,
    start: String(e.date ?? ""),
    venue: String(comps.venue?.fullName ?? ""),
    status: state,
    detail: String(status.shortDetail ?? status.detail ?? ""),
    live: state === "in",
    home: {
      id: String(ht.id ?? ""),
      name: String(ht.displayName ?? "Home"),
      abbr: String(ht.abbreviation ?? ht.shortDisplayName ?? "HOM"),
      logo: teamLogo(ht),
      ml: closeOdds(ml.home),
      score: Number.isFinite(hs) ? hs : null,
    },
    away: {
      id: String(at.id ?? ""),
      name: String(at.displayName ?? "Away"),
      abbr: String(at.abbreviation ?? at.shortDisplayName ?? "AWY"),
      logo: teamLogo(at),
      ml: closeOdds(ml.away),
      score: Number.isFinite(as) ? as : null,
    },
    drawMl: closeOdds(ml.draw) ?? parseAmerican(odd0.drawOdds?.moneyLine),
    total: typeof odd0.overUnder === "number" ? odd0.overUnder : null,
    overOdds: tot.over?.close?.odds ?? null,
    underOdds: tot.under?.close?.odds ?? null,
  };
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function scoreboard(slug, dates) {
  const data = await fetchJson(
    `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${dates}`,
  );
  return data?.events ?? [];
}

function implied(odds) {
  if (odds == null || !Number.isFinite(odds) || odds === 0) return 0;
  return odds < 0 ? -odds / (-odds + 100) : 100 / (odds + 100);
}

function favSide(f) {
  const h = implied(f.home.ml);
  const a = implied(f.away.ml);
  const d = implied(f.drawMl);
  if (h >= a && h >= d) return "home";
  if (a >= h && a >= d) return "away";
  return "draw";
}

function label1x2(f, side) {
  if (side === "home") return `${f.home.name} to win`;
  if (side === "away") return `${f.away.name} to win`;
  return "Draw";
}

function teamForm(history) {
  const games = new Map();
  for (const f of history) {
    if (f.home.score == null || f.away.score == null) continue;
    for (const id of [f.home.id, f.away.id]) {
      const arr = games.get(id) ?? [];
      arr.push(f);
      games.set(id, arr);
    }
  }
  const out = new Map();
  for (const [id, arr] of games) {
    const rec = { pts: 0, gf: 0, ga: 0, n: 0, scored: 0 };
    for (const f of arr.slice(-5)) {
      const home = f.home.id === id;
      const gf = home ? f.home.score : f.away.score;
      const ga = home ? f.away.score : f.home.score;
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

function empty() {
  return { pts: 0, gf: 0, ga: 0, n: 0, scored: 0 };
}

function buildPicks(fixtures, history) {
  const form = teamForm(history);
  const picks = [];
  for (const f of fixtures) {
    if (f.home.ml != null || f.away.ml != null) {
      const side = favSide(f);
      picks.push({
        id: `market-${f.id}-1x2`,
        tipsterId: "market",
        fixtureId: f.id,
        market: "1x2",
        selection: side,
        label: label1x2(f, side),
        confidence: "strong",
      });
    }
    const h = form.get(f.home.id) ?? empty();
    const a = form.get(f.away.id) ?? empty();
    if (h.n >= 2 || a.n >= 2) {
      const hr = h.n ? h.pts / h.n : 0;
      const ar = a.n ? a.pts / a.n : 0;
      let side = "draw";
      if (hr > ar + 0.25) side = "home";
      else if (ar > hr + 0.25) side = "away";
      picks.push({
        id: `form-${f.id}-1x2`,
        tipsterId: "form",
        fixtureId: f.id,
        market: "1x2",
        selection: side,
        label: label1x2(f, side),
        confidence: Math.abs(hr - ar) > 0.6 ? "strong" : "play",
      });
      const homeExp = (h.n ? h.gf / h.n : 1) + (a.n ? a.ga / a.n : 1);
      const awayExp = (a.n ? a.gf / a.n : 1) + (h.n ? h.ga / h.n : 1);
      const totalExp = (homeExp + awayExp) / 2;
      let att = "draw";
      if (homeExp > awayExp + 0.35) att = "home";
      else if (awayExp > homeExp + 0.35) att = "away";
      const line = f.total ?? 2.5;
      const ou = totalExp > line ? "over" : "under";
      const btts = (h.n ? h.scored / h.n : 0) >= 0.6 && (a.n ? a.scored / a.n : 0) >= 0.6 ? "yes" : "no";
      picks.push(
        {
          id: `attack-${f.id}-1x2`,
          tipsterId: "attack",
          fixtureId: f.id,
          market: "1x2",
          selection: att,
          label: label1x2(f, att),
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
      );
    }
    if (f.total != null) {
      const over = parseAmerican(f.overOdds);
      const under = parseAmerican(f.underOdds);
      const side = under != null && over != null && implied(under) > implied(over) ? "under" : "over";
      picks.push({
        id: `market-${f.id}-ou`,
        tipsterId: "market",
        fixtureId: f.id,
        market: "total",
        selection: side,
        label: `${side === "over" ? "Over" : "Under"} ${f.total}`,
        confidence: "play",
      });
    }
  }
  return picks;
}

function buildConsensus(picks, fixtures) {
  const byId = Object.fromEntries(fixtures.map((f) => [f.id, f]));
  const groups = new Map();
  const coverage = new Map();
  for (const p of picks) {
    const g = `${p.fixtureId}|${p.market}|${p.selection}`;
    groups.set(g, [...(groups.get(g) ?? []), p]);
    const c = `${p.fixtureId}|${p.market}`;
    const set = coverage.get(c) ?? new Set();
    set.add(p.tipsterId);
    coverage.set(c, set);
  }
  const deskBy = Object.fromEntries(DESKS.map((d) => [d.id, d]));
  const items = [];
  for (const [key, group] of groups) {
    const [fixtureId, market] = key.split("|");
    const fixture = byId[fixtureId];
    if (!fixture) continue;
    const cov = coverage.get(`${fixtureId}|${market}`)?.size ?? group.length;
    if (cov < 2) continue;
    const agreeIds = new Set(group.map((g) => g.tipsterId));
    if (agreeIds.size < 2) continue;
    const posted = picks.filter((p) => p.fixtureId === fixtureId && p.market === market);
    const fade = DESKS.filter((d) => posted.some((p) => p.tipsterId === d.id) && !agreeIds.has(d.id));
    const agree = [...agreeIds].map((id) => deskBy[id]).filter(Boolean);
    const pct = agree.length / cov;
    items.push({
      id: key,
      fixture,
      market,
      selection: group[0].selection,
      label: group[0].label,
      agree,
      fade,
      coverage: cov,
      count: agree.length,
      pct,
      rankScore: agree.length * 12 + pct * 50 + (agree.length === cov ? 8 : 0),
    });
  }
  const best = new Map();
  for (const item of items) {
    const k = `${item.fixture.id}|${item.market}`;
    const prev = best.get(k);
    if (!prev || item.count > prev.count || (item.count === prev.count && item.pct > prev.pct)) best.set(k, item);
  }
  return [...best.values()].sort((a, b) => b.rankScore - a.rankScore || b.pct - a.pct);
}

function emptyRec() {
  return { n: 0, won: 0, lost: 0, push: 0, hit: 0, units: 0 };
}

function add(rec, result) {
  rec.n += 1;
  if (result === "won") rec.won += 1;
  else if (result === "lost") rec.lost += 1;
  else rec.push += 1;
  const decided = rec.won + rec.lost;
  rec.hit = decided ? rec.won / decided : 0;
}

function gradePick(p, f) {
  const hs = f.home.score;
  const as = f.away.score;
  if (hs == null || as == null) return null;
  if (p.market === "1x2") {
    const out = hs > as ? "home" : as > hs ? "away" : "draw";
    return p.selection === out ? "won" : "lost";
  }
  if (p.market === "total") {
    if (f.total == null) return null;
    const goals = hs + as;
    if (goals === f.total) return "push";
    const over = goals > f.total;
    return (p.selection === "over" ? over : !over) ? "won" : "lost";
  }
  const btts = hs > 0 && as > 0;
  return (p.selection === "yes" ? btts : !btts) ? "won" : "lost";
}

function sliceOf(rows) {
  const rec = emptyRec();
  for (const r of rows) add(rec, r.result);
  return rec;
}

async function loadRange(start, end, settledOnly) {
  const range = `${ymd(start)}-${ymd(end)}`;
  const batches = await Promise.all(
    LEAGUES.map(async ([slug, name]) => {
      const events = await scoreboard(slug, range);
      return events.map((e) => parseEvent(e, name, slug)).filter(Boolean);
    }),
  );
  const seen = new Set();
  const out = [];
  for (const f of batches.flat()) {
    if (seen.has(f.id)) continue;
    if (settledOnly && (f.status !== "post" || f.home.score == null || f.away.score == null)) continue;
    seen.add(f.id);
    out.push(f);
  }
  return out.sort((a, b) => +new Date(a.start) - +new Date(b.start));
}

function labelFor(d) {
  return d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function packSlate(dayDate, dayFixtures, history) {
  const picks = buildPicks(dayFixtures, history);
  const consensus = buildConsensus(picks, dayFixtures);
  const date = dayDate.toISOString().slice(0, 10);
  return {
    date,
    dateLabel: labelFor(dayDate),
    fetchedAt: new Date().toISOString(),
    fixtures: dayFixtures,
    picks,
    consensus,
    desks,
  };
}

function writeJson(path, payload, { keepIfEmpty = false } = {}) {
  if (keepIfEmpty && payload.fixtures?.length === 0 && existsSync(path)) {
    console.log(`kept ${path} (empty pull)`);
    return false;
  }
  writeFileSync(path, JSON.stringify(payload));
  return true;
}

const now = new Date();
const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const tomorrow = new Date(day.getTime() + 86400_000);
const horizon = new Date(day.getTime() + 48 * 3600_000);
const histStart = new Date(day.getTime() - 21 * 86400_000);

const [rawSlate, history] = await Promise.all([
  loadRange(day, horizon, false),
  loadRange(histStart, day, true),
]);
const dayStr = day.toISOString().slice(0, 10);
const tomStr = tomorrow.toISOString().slice(0, 10);
const todayFix = rawSlate.filter((f) => f.start.slice(0, 10) === dayStr);
const tomFix = rawSlate.filter((f) => f.start.slice(0, 10) === tomStr);

const desks = DESKS.map((d) => ({
  ...d,
  style:
    d.id === "market"
      ? "The posted 1X2 and total — whatever the book is shortest on"
      : d.id === "form"
        ? "Points from the last five settled matches on this board"
        : "Goals for and against over the last five, used as a simple expected-goals lean",
  bio:
    d.id === "market"
      ? "Live DraftKings number from the ESPN board. Not a tipster. The price itself."
      : d.id === "form"
        ? "3 for a win, 1 for a draw. Picks the side that has been collecting more points."
        : "Compares each side's recent scoring and conceding. Also posts the total and BTTS.",
}));

const todaySlate = packSlate(day, todayFix, history);
const tomorrowSlate = packSlate(tomorrow, tomFix, history);

const histPicks = [];
for (let i = 0; i < history.length; i++) {
  histPicks.push(...buildPicks([history[i]], history.slice(0, i)));
}
const histCons = buildConsensus(histPicks, history);
const packMap = new Map(histCons.map((c) => [`${c.fixture.id}|${c.market}`, c]));
const graded = [];
for (const p of histPicks) {
  const f = history.find((x) => x.id === p.fixtureId);
  if (!f) continue;
  const result = gradePick(p, f);
  if (!result) continue;
  const pack = packMap.get(`${p.fixtureId}|${p.market}`);
  graded.push({
    ...p,
    result,
    odds: null,
    units: 0,
    withPack: pack ? pack.selection === p.selection : null,
    fixture: f,
  });
}
graded.sort((a, b) => +new Date(b.fixture.start) - +new Date(a.fixture.start));

const deskAcc = desks
  .map((tipster) => {
    const mine = graded.filter((p) => p.tipsterId === tipster.id);
    return {
      tipster,
      overall: sliceOf(mine),
      markets: {
        "1x2": sliceOf(mine.filter((p) => p.market === "1x2")),
        total: sliceOf(mine.filter((p) => p.market === "total")),
        btts: sliceOf(mine.filter((p) => p.market === "btts")),
      },
      leagues: [],
      withPack: sliceOf(mine.filter((p) => p.withPack === true)),
      fade: sliceOf(mine.filter((p) => p.withPack === false)),
      form: mine.filter((p) => p.market === "1x2").slice(0, 12).map((p) => p.result),
      recent: mine.filter((p) => p.market === "1x2").slice(0, 12),
    };
  })
  .sort((a, b) => b.overall.hit - a.overall.hit);

const pack = { overall: emptyRec(), strong: emptyRec(), lean: emptyRec() };
for (const item of histCons.filter((c) => c.market === "1x2")) {
  const result = gradePick(
    { market: "1x2", selection: item.selection },
    item.fixture,
  );
  if (!result) continue;
  add(pack.overall, result);
  if (item.pct >= 0.99) add(pack.strong, result);
  else add(pack.lean, result);
}

const first = history[0]?.start;
const last = history[history.length - 1]?.start;
const ledger = {
  windowLabel:
    first && last
      ? `${new Date(first).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })} – ${new Date(last).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`
      : "Last 21 days",
  fetchedAt: new Date().toISOString(),
  sample: history.length,
  pack,
  desks: deskAcc,
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "public", "data");
mkdirSync(dir, { recursive: true });
writeJson(join(dir, "slate.json"), todaySlate);
writeJson(join(dir, `slate-${dayStr}.json`), todaySlate);
writeJson(join(dir, `slate-${tomStr}.json`), tomorrowSlate, { keepIfEmpty: true });
writeJson(join(dir, "ledger.json"), ledger);
writeFileSync(
  join(dir, "index.json"),
  JSON.stringify({
    generatedAt: new Date().toISOString(),
    today: dayStr,
    tomorrow: tomStr,
    days: {
      [dayStr]: { fixtures: todayFix.length, consensus: todaySlate.consensus.length },
      [tomStr]: { fixtures: tomFix.length, consensus: tomorrowSlate.consensus.length },
    },
  }),
);
console.log(
  `published ${dayStr} ${todayFix.length} fixtures / ${todaySlate.consensus.length} consensus; ${tomStr} ${tomFix.length} fixtures / ${tomorrowSlate.consensus.length} consensus; ledger ${history.length}`,
);
