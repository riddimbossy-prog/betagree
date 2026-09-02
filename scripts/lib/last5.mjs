/** Last-5 support: 80%+ form, venue splits, same-tier table skip. */

export const LAST5 = 5;
export const LAST5_FLOOR = 0.8;
export const GOAL_LINES = [1.5, 2.5, 3.5];
export const HT_LINES = [0.5, 1.5];

export const AGREE_MARKETS = [
  { id: "over15", market: "total", selection: "over:1.5", label: "Over 1.5", kind: "ftOu", line: 1.5, side: "over" },
  { id: "over25", market: "total", selection: "over:2.5", label: "Over 2.5", kind: "ftOu", line: 2.5, side: "over" },
  { id: "over35", market: "total", selection: "over:3.5", label: "Over 3.5", kind: "ftOu", line: 3.5, side: "over" },
  { id: "under15", market: "total", selection: "under:1.5", label: "Under 1.5", kind: "ftOu", line: 1.5, side: "under" },
  { id: "under25", market: "total", selection: "under:2.5", label: "Under 2.5", kind: "ftOu", line: 2.5, side: "under" },
  { id: "under35", market: "total", selection: "under:3.5", label: "Under 3.5", kind: "ftOu", line: 3.5, side: "under" },
  { id: "gg", market: "btts", selection: "yes", label: "GG", kind: "btts" },
  { id: "ng", market: "btts", selection: "no", label: "NG", kind: "ng" },
  { id: "ht_over05", market: "ht_total", selection: "over:0.5", label: "HT Over 0.5", kind: "htOu", line: 0.5, side: "over" },
  { id: "ht_under05", market: "ht_total", selection: "under:0.5", label: "HT Under 0.5", kind: "htOu", line: 0.5, side: "under" },
  { id: "ht_over15", market: "ht_total", selection: "over:1.5", label: "HT Over 1.5", kind: "htOu", line: 1.5, side: "over" },
  { id: "ht_under15", market: "ht_total", selection: "under:1.5", label: "HT Under 1.5", kind: "htOu", line: 1.5, side: "under" },
  { id: "ht_gg", market: "ht_btts", selection: "yes", label: "HT GG", kind: "htBtts" },
];

const SEARCH = "https://img.sofascore.com/api/v1/search/all";
const EVENT = "https://img.sofascore.com/api/v1/event/";
const TEAM_LAST = (id, page = 0) => `https://img.sofascore.com/api/v1/team/${id}/events/last/${page}`;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const cache = {
  search: new Map(),
  last: new Map(),
  event: new Map(),
  table: new Map(),
};

function headers() {
  return {
    "User-Agent": UA,
    Accept: "application/json",
    Origin: "https://www.sofascore.com",
    Referer: "https://www.sofascore.com/",
  };
}

async function getJson(url) {
  const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(12_000) });
  if (!res.ok) return null;
  return res.json();
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function closeName(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.includes(nb) || nb.includes(na);
}

export function ouHits(games, line, side) {
  let hits = 0;
  for (const g of games) {
    const tot = g.goals;
    if (tot == null) continue;
    if (side === "over" && tot > line) hits += 1;
    if (side === "under" && tot < line) hits += 1;
  }
  return hits;
}

export function summarizeGames(games) {
  const n = games.length;
  const wins = games.filter((g) => g.result === "W").length;
  const draws = games.filter((g) => g.result === "D").length;
  const losses = games.filter((g) => g.result === "L").length;
  const btts = games.filter((g) => g.hs > 0 && g.as > 0).length;
  const htBtts = games.filter((g) => (g.htHs ?? 0) > 0 && (g.htAs ?? 0) > 0).length;
  const htOu = {};
  for (const line of HT_LINES) {
    let over = 0;
    let under = 0;
    let counted = 0;
    for (const g of games) {
      if (g.htGoals == null) continue;
      counted += 1;
      if (g.htGoals > line) over += 1;
      else under += 1;
    }
    htOu[String(line)] = { over, under, n: counted };
  }
  const ou = {};
  for (const line of GOAL_LINES) {
    const over = ouHits(games, line, "over");
    const under = ouHits(games, line, "under");
    ou[String(line)] = { over, under, n };
  }
  return {
    n,
    results: games.map((g) => g.result),
    wins,
    draws,
    losses,
    winRate: n ? wins / n : 0,
    unbeatenRate: n ? (wins + draws) / n : 0,
    lossRate: n ? losses / n : 0,
    winlessRate: n ? (losses + draws) / n : 0,
    bttsRate: n ? btts / n : 0,
    ngRate: n ? 1 - btts / n : 0,
    htBttsRate: n ? htBtts / n : 0,
    htOu,
    ou,
    games,
  };
}

export function parsePrimaLast(scores, side = "home") {
  return (scores || []).slice(0, LAST5).map(([hs, as]) => {
    const result = hs === as ? "D" : side === "home" ? (hs > as ? "W" : "L") : as > hs ? "W" : "L";
    return { hs, as, goals: hs + as, result };
  });
}

function fromSofa(ev, teamId) {
  const hs = ev.homeScore?.current ?? ev.homeScore?.display;
  const as = ev.awayScore?.current ?? ev.awayScore?.display;
  if (typeof hs !== "number" || typeof as !== "number") return null;
  if (String(ev.status?.type || "") !== "finished" && ev.status?.code !== 100) return null;
  const home = Number(ev.homeTeam?.id) === Number(teamId);
  const result = hs === as ? "D" : home ? (hs > as ? "W" : "L") : as > hs ? "W" : "L";
  const htHs = ev.homeScore?.period1;
  const htAs = ev.awayScore?.period1;
  return {
    id: ev.id,
    hs,
    as,
    goals: hs + as,
    htHs: typeof htHs === "number" ? htHs : null,
    htAs: typeof htAs === "number" ? htAs : null,
    htGoals: typeof htHs === "number" && typeof htAs === "number" ? htHs + htAs : null,
    result,
    home: ev.homeTeam?.name,
    away: ev.awayTeam?.name,
    venue: home ? "H" : "A",
  };
}

async function searchEvent(home, away) {
  const key = `${norm(home)}|${norm(away)}`;
  if (cache.search.has(key)) return cache.search.get(key);
  const q = encodeURIComponent(`${home} ${away}`);
  const data = await getJson(`${SEARCH}?q=${q}&page=0`);
  const events = (data?.results ?? []).filter((r) => r.type === "event" && r.entity).map((r) => r.entity);
  let best = null;
  for (const ev of events) {
    const hh = closeName(home, ev.homeTeam?.name) && closeName(away, ev.awayTeam?.name);
    const ha = closeName(home, ev.awayTeam?.name) && closeName(away, ev.homeTeam?.name);
    if (hh || ha) {
      best = ev;
      break;
    }
  }
  cache.search.set(key, best);
  return best;
}

async function lastForTeam(teamId) {
  if (!teamId) return [];
  if (cache.last.has(teamId)) return cache.last.get(teamId);
  const rows = [];
  const seen = new Set();
  for (const page of [0, 1]) {
    const data = await getJson(TEAM_LAST(teamId, page));
    for (const ev of data?.events ?? []) {
      const row = fromSofa(ev, teamId);
      if (!row || seen.has(row.id)) continue;
      seen.add(row.id);
      rows.push(row);
    }
  }
  cache.last.set(teamId, rows);
  return rows;
}

function venueSlice(rows, venue) {
  return (rows || []).filter((g) => g.venue === venue).slice(0, LAST5);
}

function pickSummary(preferred, fallback) {
  return preferred?.n >= LAST5 ? preferred : fallback;
}

function slimRow(row) {
  if (!row) return null;
  const gp = row.matches ?? row.gp ?? 0;
  const pts = row.points ?? row.pts ?? 0;
  return {
    rank: row.position ?? row.rank ?? null,
    name: row.team?.name ?? row.name ?? "",
    gp,
    pts,
    ppg: gp ? pts / gp : null,
  };
}

function findRow(rows, name) {
  return (rows || []).find((r) => closeName(r.team?.name || r.name, name)) || null;
}

async function loadEvent(home, away) {
  const ev = await searchEvent(home, away);
  if (!ev?.id) return ev;
  if (ev.season?.id && ev.tournament?.uniqueTournament?.id) return ev;
  if (cache.event.has(ev.id)) return cache.event.get(ev.id);
  const full = await getJson(`${EVENT}${ev.id}`);
  const next = full?.event || ev;
  cache.event.set(ev.id, next);
  return next;
}

async function loadStandings(uniqueId, seasonId, kind = "total") {
  if (!uniqueId || !seasonId) return [];
  const key = `${uniqueId}:${seasonId}:${kind}`;
  if (cache.table.has(key)) return cache.table.get(key);
  const data = await getJson(
    `https://img.sofascore.com/api/v1/unique-tournament/${uniqueId}/season/${seasonId}/standings/${kind}`,
  );
  const rows = (data?.standings ?? []).flatMap((s) => s.rows || []);
  cache.table.set(key, rows);
  return rows;
}

async function loadTable(home, away, ev) {
  const uniqueId = ev?.tournament?.uniqueTournament?.id;
  const seasonId = ev?.season?.id;
  if (!uniqueId || !seasonId) return null;
  const [total, homeT, awayT] = await Promise.all([
    loadStandings(uniqueId, seasonId, "total"),
    loadStandings(uniqueId, seasonId, "home"),
    loadStandings(uniqueId, seasonId, "away"),
  ]);
  if (!total.length) return null;
  const homeRow = findRow(total, home);
  const awayRow = findRow(total, away);
  if (!homeRow || !awayRow) return null;
  return {
    size: total.length,
    home: slimRow(homeRow),
    away: slimRow(awayRow),
    homeHome: slimRow(findRow(homeT, home)),
    awayAway: slimRow(findRow(awayT, away)),
  };
}

/** Full home/away/total tables for a league, from one SportyBet/SofaScore matchup. */
export async function loadLeagueSplit(home, away) {
  const ev = await loadEvent(home, away);
  if (!ev) return null;
  const uniqueId = ev?.tournament?.uniqueTournament?.id;
  const seasonId = ev?.season?.id;
  if (!uniqueId || !seasonId) return null;
  const [total, homeT, awayT] = await Promise.all([
    loadStandings(uniqueId, seasonId, "total"),
    loadStandings(uniqueId, seasonId, "home"),
    loadStandings(uniqueId, seasonId, "away"),
  ]);
  if (!total.length) return null;
  return {
    size: total.length,
    total: total.map(slimRow).filter((r) => r.name),
    home: homeT.map(slimRow).filter((r) => r.name),
    away: awayT.map(slimRow).filter((r) => r.name),
  };
}

/** Even sides ignore last-5 — skip the match entirely. */
export function isSameTier(pick, pack) {
  const table = pack?.table;
  if (table?.home?.rank && table?.away?.rank) {
    const size = table.size || 20;
    const band = Math.min(5, Math.max(3, Math.ceil(size / 4)));
    const hr = table.home.rank;
    const ar = table.away.rank;
    const bothTop = hr <= band && ar <= band;
    const bothBot = hr > size - band && ar > size - band;
    const close = Math.abs(hr - ar) <= 4;
    if (bothTop || bothBot || close) return true;
    if (table.homeHome?.rank && table.awayAway?.rank) {
      if (table.homeHome.rank <= band && table.awayAway.rank <= band) return true;
    }
    return false;
  }
  if (!pack?.home || !pack?.away) return false;
  const home = pickSummary(pack.homeHome, pack.home);
  const away = pickSummary(pack.awayAway, pack.away);
  if (!home?.n || !away?.n) return false;
  const wrGap = Math.abs(home.winRate - away.winRate);
  const urGap = Math.abs((home.unbeatenRate ?? 0) - (away.unbeatenRate ?? 0));
  const weaker = Math.min(home.winRate, away.winRate);
  const stronger = Math.max(home.winRate, away.winRate);
  if (home.winRate >= 0.6 && away.winRate >= 0.6) return true;
  if (wrGap < 0.25 && urGap < 0.25 && weaker >= 0.2) return true;
  if (stronger < 0.8 && wrGap < 0.4 && weaker >= 0.4) return true;
  return false;
}

function h2hGames(homeRows, awayRows) {
  const awayIds = new Set(awayRows.map((g) => g.id).filter(Boolean));
  return homeRows.filter((g) => g.id && awayIds.has(g.id)).slice(0, LAST5);
}

export function last5Supports(pick, pack) {
  if (!pack) return false;
  const home = pack.home;
  const away = pack.away;
  if (!home || !away || home.n < LAST5 || away.n < LAST5) return false;
  const homeVenue = pickSummary(pack.homeHome, home);
  const awayVenue = pickSummary(pack.awayAway, away);
  const focusIsHome = closeName(pick.team, pick.home);
  const focus = focusIsHome ? homeVenue : awayVenue;

  if (pick.category === "wins") return focus.winRate >= LAST5_FLOOR;
  if (pick.category === "undefeated") return focus.unbeatenRate >= LAST5_FLOOR;
  if (pick.category === "losses") return focus.lossRate >= LAST5_FLOOR;
  if (pick.category === "winless") return focus.winlessRate >= LAST5_FLOOR;
  if (pick.category === "gg") return homeVenue.bttsRate >= LAST5_FLOOR && awayVenue.bttsRate >= LAST5_FLOOR;
  if (pick.category === "ng") return homeVenue.ngRate >= LAST5_FLOOR && awayVenue.ngRate >= LAST5_FLOOR;

  const def = AGREE_MARKETS.find((m) => m.id === pick.category);
  if (def) {
    const hr = marketRate(homeVenue, def);
    const ar = marketRate(awayVenue, def);
    if (hr == null || ar == null) return false;
    if (hr < LAST5_FLOOR || ar < LAST5_FLOOR) return false;
    if (def.kind === "ftOu" && pack.h2h?.n >= LAST5) {
      const hh = marketRate(pack.h2h, def);
      if (hh != null && hh < LAST5_FLOOR) return false;
    }
    return true;
  }

  if (pick.category === "over25" || pick.category === "under25" || pick.market === "total") {
    const line = Number(String(pick.selection).split(":")[1] || 2.5);
    const side = pick.category === "under25" || String(pick.selection).startsWith("under") ? "under" : "over";
    const key = String(line);
    const h = homeVenue.ou[key];
    const a = awayVenue.ou[key];
    if (!h || !a || h.n < LAST5 || a.n < LAST5) return false;
    if (h[side] / h.n < LAST5_FLOOR || a[side] / a.n < LAST5_FLOOR) return false;
    if (pack.h2h?.n >= LAST5) {
      const hh = pack.h2h.ou[key];
      if (!hh || hh[side] / hh.n < LAST5_FLOOR) return false;
    }
    return true;
  }
  return false;
}

export function marketRate(sum, def) {
  if (!sum || !def) return null;
  if (def.kind === "ftOu") {
    const row = sum.ou?.[String(def.line)];
    if (!row || !row.n) return null;
    return row[def.side] / row.n;
  }
  if (def.kind === "htOu") {
    const row = sum.htOu?.[String(def.line)];
    if (!row || !row.n) return null;
    return row[def.side] / row.n;
  }
  if (def.kind === "btts") return sum.bttsRate ?? null;
  if (def.kind === "ng") return sum.ngRate ?? null;
  if (def.kind === "htBtts") return sum.htBttsRate ?? null;
  return null;
}

export function agreedMarkets(pack) {
  if (!pack?.home || !pack?.away) return [];
  const home = pickSummary(pack.homeHome, pack.home);
  const away = pickSummary(pack.awayAway, pack.away);
  const out = [];
  for (const def of AGREE_MARKETS) {
    const hr = marketRate(home, def);
    const ar = marketRate(away, def);
    if (hr == null || ar == null) continue;
    if (hr < LAST5_FLOOR || ar < LAST5_FLOOR) continue;
    if (def.kind === "ftOu" && pack.h2h?.n >= LAST5) {
      const hh = marketRate(pack.h2h, def);
      if (hh != null && hh < LAST5_FLOOR) continue;
    }
    out.push({
      ...def,
      homeHits: hr,
      awayHits: ar,
      rate: Math.min(hr, ar),
    });
  }
  return out.sort((a, b) => b.rate - a.rate);
}

/** Venue last-5 result markets for Best to win / Fade worst. */
export function agreedResults(pack) {
  if (!pack?.home || !pack?.away) return [];
  const home = pickSummary(pack.homeHome, pack.home);
  const away = pickSummary(pack.awayAway, pack.away);
  const out = [];
  const sides = [
    { key: "home", sum: home },
    { key: "away", sum: away },
  ];
  for (const side of sides) {
    if (!side.sum || side.sum.n < LAST5) continue;
    const other = side.key === "home" ? "away" : "home";
    if (side.sum.winRate >= LAST5_FLOOR) {
      out.push({
        id: "wins",
        market: "1x2",
        selection: side.key,
        teamSide: side.key,
        rate: side.sum.winRate,
        sample: side.sum.n,
        label: "to win",
      });
    }
    if (side.sum.unbeatenRate >= LAST5_FLOOR) {
      out.push({
        id: "undefeated",
        market: "1x2",
        selection: side.key,
        teamSide: side.key,
        rate: side.sum.unbeatenRate,
        sample: side.sum.n,
        label: "undefeated",
      });
    }
    if (side.sum.lossRate >= LAST5_FLOOR) {
      out.push({
        id: "losses",
        market: "1x2",
        selection: other,
        teamSide: side.key,
        rate: side.sum.lossRate,
        sample: side.sum.n,
        label: "fade losses",
      });
    }
    if (side.sum.winlessRate >= LAST5_FLOOR) {
      out.push({
        id: "winless",
        market: "1x2",
        selection: other,
        teamSide: side.key,
        rate: side.sum.winlessRate,
        sample: side.sum.n,
        label: "fade winless",
      });
    }
  }
  return out.sort((a, b) => b.rate - a.rate);
}

export function agreedGoalTips(pack) {
  if (!pack?.home || !pack?.away) return [];
  const home = pickSummary(pack.homeHome, pack.home);
  const away = pickSummary(pack.awayAway, pack.away);
  const out = [];
  for (const line of GOAL_LINES) {
    const key = String(line);
    for (const side of ["over", "under"]) {
      const h = home.ou[key];
      const a = away.ou[key];
      if (!h || !a || h.n < LAST5 || a.n < LAST5) continue;
      if (h[side] / h.n < LAST5_FLOOR || a[side] / a.n < LAST5_FLOOR) continue;
      if (pack.h2h?.n >= LAST5 && pack.h2h.ou[key][side] / pack.h2h.n < LAST5_FLOOR) continue;
      out.push({
        line,
        side,
        home: h[side],
        away: a[side],
        h2h: pack.h2h?.ou?.[key]?.[side] ?? null,
        rate: Math.min(h[side] / h.n, a[side] / a.n),
        split: Boolean(pack.homeHome?.n >= LAST5 && pack.awayAway?.n >= LAST5),
      });
    }
  }
  return out.sort((a, b) => b.rate - a.rate);
}

export async function loadLast5(home, away, prima) {
  let homeGames = parsePrimaLast(prima?.homeLast, "home");
  let awayGames = parsePrimaLast(prima?.awayLast, "away");
  let homeHomeGames = [];
  let awayAwayGames = [];
  let h2hGamesList = [];
  let table = null;
  try {
    const ev = await loadEvent(home, away);
    if (ev?.homeTeam?.id && ev?.awayTeam?.id) {
      const [hs, as, tab] = await Promise.all([
        lastForTeam(ev.homeTeam.id),
        lastForTeam(ev.awayTeam.id),
        loadTable(home, away, ev),
      ]);
      if (hs.length >= LAST5) homeGames = hs.slice(0, LAST5);
      if (as.length >= LAST5) awayGames = as.slice(0, LAST5);
      homeHomeGames = venueSlice(hs, "H");
      awayAwayGames = venueSlice(as, "A");
      h2hGamesList = h2hGames(hs, as);
      table = tab;
    }
  } catch {
    /* Prima last-12 is enough */
  }
  return {
    home: summarizeGames(homeGames.slice(0, LAST5)),
    away: summarizeGames(awayGames.slice(0, LAST5)),
    homeHome: summarizeGames(homeHomeGames),
    awayAway: summarizeGames(awayAwayGames),
    h2h: summarizeGames(h2hGamesList.slice(0, LAST5)),
    table,
  };
}

function slimSide(side) {
  if (!side) return null;
  return {
    results: side.results,
    winRate: side.winRate,
    unbeatenRate: side.unbeatenRate,
    lossRate: side.lossRate,
    winlessRate: side.winlessRate,
    ou: side.ou,
    bttsRate: side.bttsRate,
    ngRate: side.ngRate,
    htBttsRate: side.htBttsRate,
    htOu: side.htOu,
    n: side.n,
  };
}

export function packForSheet(pack) {
  if (!pack) return null;
  return {
    home: slimSide(pack.home),
    away: slimSide(pack.away),
    homeHome: pack.homeHome?.n ? slimSide(pack.homeHome) : null,
    awayAway: pack.awayAway?.n ? slimSide(pack.awayAway) : null,
    h2h: pack.h2h.n ? slimSide(pack.h2h) : null,
    table: pack.table || null,
    agree: agreedGoalTips(pack),
  };
}

/** Last-5 home / last-5 away rows for Banker rules v2. */
export async function loadVenueForm(home, away) {
  const ev = await loadEvent(home, away);
  if (!ev?.homeTeam?.id || !ev?.awayTeam?.id) {
    return { homeHome: [], awayAway: [], table: null, earlySeason: true };
  }
  const [hs, as, tab] = await Promise.all([
    lastForTeam(ev.homeTeam.id),
    lastForTeam(ev.awayTeam.id),
    loadTable(home, away, ev),
  ]);
  const homeHome = venueSlice(hs, "H");
  const awayAway = venueSlice(as, "A");
  const homeGp = tab?.home?.gp ?? 0;
  const awayGp = tab?.away?.gp ?? 0;
  return {
    homeHome,
    awayAway,
    table: tab,
    earlySeason: homeGp < LAST5 || awayGp < LAST5,
  };
}
