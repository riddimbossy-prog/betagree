/** Live form and odds desks. No invented rows. */

export const MIN_RATE = 0.7;
export const ODDS_FROM = 1.2;
export const ODDS_TO = 1.55;
export const MIN_SAMPLE = 3;

export const CATEGORIES = [
  { id: "wins", label: "Most wins", blurb: "Season win rate on a side priced 1.20–1.55." },
  { id: "losses", label: "Most losses", blurb: "Fade a 70%+ losing side — opponent is the short price." },
  { id: "winless", label: "Winless", blurb: "No-win rate of 70%+; the other side is the pick." },
  { id: "undefeated", label: "Undefeated", blurb: "Unbeaten rate of 70%+ and still a short favourite." },
  { id: "over25", label: "Over 2.5", blurb: "Over 2.5 in 70%+ of league games, odds 1.20–1.55." },
  { id: "under25", label: "Under 2.5", blurb: "Under 2.5 in 70%+ of league games, odds 1.20–1.55." },
  { id: "gg", label: "GG", blurb: "Both teams scored in 70%+ of recent games, GG odds 1.20–1.55." },
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const STOP = new Set([
  "fc",
  "cf",
  "sc",
  "afc",
  "cfc",
  "fk",
  "sk",
  "ac",
  "as",
  "ss",
  "sv",
  "bk",
  "if",
  "the",
  "de",
  "do",
  "da",
  "del",
  "la",
  "el",
  "al",
  "club",
  "calcio",
  "sp",
  "rs",
  "w",
  "women",
]);

const ALIAS = {
  man: "manchester",
  utd: "united",
  ath: "athletic",
  atl: "atletico",
  athl: "athletic",
  inter: "internazionale",
  psg: "paris",
};

export function decodeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/'/g, "'")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export function normName(s) {
  return decodeHtml(s)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function nameTokens(s) {
  return normName(s)
    .split(" ")
    .map((w) => ALIAS[w] || w)
    .filter((w) => w.length > 1 && !STOP.has(w));
}

export function nameScore(a, b) {
  const na = normName(a);
  const nb = normName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const compactA = na.replace(/\s+/g, "");
  const compactB = nb.replace(/\s+/g, "");
  if (compactA === compactB) return 1;
  const ta = [...new Set(nameTokens(a))];
  const tb = [...new Set(nameTokens(b))];
  const close = (x, y) => x === y || (x.length > 3 && y.length > 3 && (x.includes(y) || y.includes(x)));
  if (ta.length && tb.length) {
    let inter = 0;
    for (const x of ta) if (tb.some((y) => close(x, y))) inter += 1;
    const aInB = ta.every((x) => tb.some((y) => close(x, y)));
    const bInA = tb.every((y) => ta.some((x) => close(x, y)));
    if ((aInB || bInA) && inter > 0) return Math.max(0.82, inter / Math.max(ta.length, tb.length));
    if (inter) return inter / Math.max(ta.length, tb.length);
  }
  if (na.includes(nb) || nb.includes(na) || compactA.includes(compactB) || compactB.includes(compactA)) {
    return Math.min(compactA.length, compactB.length) / Math.max(compactA.length, compactB.length);
  }
  return 0;
}

export function sameTeam(a, b) {
  return nameScore(a, b) >= 0.72;
}

export function sameMatch(h1, a1, h2, a2) {
  return (sameTeam(h1, h2) && sameTeam(a1, a2)) || (sameTeam(h1, a2) && sameTeam(a1, h2));
}

export function inOddsBand(odds, from = ODDS_FROM, to = ODDS_TO) {
  return typeof odds === "number" && Number.isFinite(odds) && odds >= from && odds <= to;
}

export function parsePct(raw) {
  if (raw == null) return null;
  const n = Number(String(raw).replace("%", "").trim());
  if (!Number.isFinite(n)) return null;
  return n > 1 ? n / 100 : n;
}

export function parseOdd(raw) {
  if (raw == null) return null;
  const n = Number(String(raw).replace(",", ".").trim());
  return Number.isFinite(n) && n >= 1.01 ? n : null;
}

function firstTable(html) {
  const m = String(html).match(/<table[\s\S]*?<\/table>/i);
  return m ? m[0] : "";
}

function allTables(html) {
  return [...String(html).matchAll(/<table[\s\S]*?<\/table>/gi)].map((m) => m[0]);
}

export function parsePrimaGames(html) {
  const games = [];
  const re = /<a id="g_(\d+)" href="([^"]+)" class="game">([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    const body = m[3];
    const names = [...body.matchAll(/class="nm">([^<]+)/g)].map((x) => decodeHtml(x[1]));
    const pcts = [...body.matchAll(/<span class="t">(\d+)<\/span>/g)].map((x) => Number(x[1]));
    const prices = [...body.matchAll(/<span class="o">([\d.]+)<\/span>/g)].map((x) => parseOdd(x[1]));
    const tip = decodeHtml((body.match(/class="tip">([^<]+)/) || [])[1] || "");
    const tipOdds = parseOdd((body.match(/<span class="odd">([\d.]+)<\/span>/) || [])[1]);
    const league = decodeHtml((body.match(/title="([^"]+)"/) || [])[1] || "");
    const kick = decodeHtml((body.match(/class="tm">([^<]+)/) || [])[1] || "");
    const settled = /class="to (wn|ls)"/.test(body);
    if (names.length < 2) continue;
    games.push({
      id: m[1],
      url: `https://primatips.com${m[2]}`,
      path: m[2],
      home: names[0],
      away: names[1],
      league,
      kickoff: kick || null,
      homePct: pcts[0] != null ? pcts[0] / 100 : null,
      drawPct: pcts[1] != null ? pcts[1] / 100 : null,
      awayPct: pcts[2] != null ? pcts[2] / 100 : null,
      homeOdds: prices[0] ?? null,
      drawOdds: prices[1] ?? null,
      awayOdds: prices[2] ?? null,
      tip,
      tipOdds,
      settled,
    });
  }
  return games;
}

export function parsePrimaFormRows(tableHtml) {
  const rows = [];
  const re = /<tr>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = re.exec(String(tableHtml)))) {
    const row = m[1];
    const name = decodeHtml((row.match(/class="tl"[^>]*>([^<]+)/) || [])[1] || "");
    if (!name) continue;
    const league = decodeHtml((row.match(/class="tl"[^>]*title="([^"]+)"/) || [])[1] || "");
    const teamPath = (row.match(/class="tl" href="([^"]+)"/) || [])[1] || null;
    const count = Number((row.match(/class="sc">\s*([\d.]+)/) || [])[1] || "");
    const matches = Number((row.match(/class="gm">\s*(\d+)/) || [])[1] || "");
    const prRaw = decodeHtml((row.match(/class="pr">\s*([^<]+)/) || [])[1] || "").replace(/\s+/g, "");
    const rankRaw = (row.match(/class="ps"[^>]*title="(\d+)"/) || row.match(/class="ps"[^>]*>(\d+)/) || [])[1];
    const rank = Number(rankRaw || rows.length + 1);
    const tipPath = (row.match(/class="fgl" href="([^"]+)"/) || [])[1] || null;
    const hasPct = prRaw.includes("%");
    const average = !hasPct && prRaw ? Number(prRaw.replace(",", ".")) : null;
    const rate = hasPct ? parsePct(prRaw) : Number.isFinite(average) ? average : null;
    rows.push({
      team: name,
      league,
      count: Number.isFinite(count) ? count : 0,
      matches: Number.isFinite(matches) ? matches : 0,
      rate,
      playingToday: Boolean(tipPath),
      tipPath,
      rank: Number.isFinite(rank) ? rank : rows.length + 1,
      teamPath,
      valueKind: hasPct ? "pct" : "avg",
      display: hasPct ? prRaw : Number.isFinite(average) ? String(average) : prRaw,
    });
  }
  return rows;
}

export function parsePrimaForm(html) {
  return parsePrimaFormRows(firstTable(html));
}

export function parsePrimaFormTables(html) {
  const text = String(html);
  const result = { overall: [], home: [], away: [] };
  const pieces = [...text.matchAll(/<h2>([^<]*)<\/h2>\s*<table class="form">([\s\S]*?)<\/table>/gi)];
  if (!pieces.length) {
    result.overall = parsePrimaForm(text);
    return result;
  }
  for (const m of pieces) {
    const heading = decodeHtml(m[1]).toLowerCase();
    const venue = heading.includes("home") ? "home" : heading.includes("away") ? "away" : "overall";
    result[venue] = parsePrimaFormRows(m[2]);
  }
  return result;
}

export const FORM_BOARDS = [
  { id: "most-wins", pole: "most", metric: "wins", path: "/form/most-wins", title: "Most wins", unit: "Wins", valueKind: "pct" },
  { id: "most-draws", pole: "most", metric: "draws", path: "/form/most-draws", title: "Most draws", unit: "Draws", valueKind: "pct" },
  { id: "most-losses", pole: "most", metric: "losses", path: "/form/most-losses", title: "Most losses", unit: "Losses", valueKind: "pct" },
  { id: "most-goals-scored", pole: "most", metric: "scored", path: "/form/most-goals-scored", title: "Most scored", unit: "Goals", valueKind: "avg" },
  { id: "most-goals-conceded", pole: "most", metric: "conceded", path: "/form/most-goals-conceded", title: "Most conceded", unit: "Goals", valueKind: "avg" },
  { id: "least-wins", pole: "least", metric: "wins", path: "/form/least-wins", title: "Least wins", unit: "Wins", valueKind: "pct" },
  { id: "least-draws", pole: "least", metric: "draws", path: "/form/least-draws", title: "Least draws", unit: "Draws", valueKind: "pct" },
  { id: "least-losses", pole: "least", metric: "losses", path: "/form/least-losses", title: "Least losses", unit: "Losses", valueKind: "pct" },
  { id: "least-goals-scored", pole: "least", metric: "scored", path: "/form/least-goals-scored", title: "Least scored", unit: "Goals", valueKind: "avg" },
  { id: "least-goals-conceded", pole: "least", metric: "conceded", path: "/form/least-goals-conceded", title: "Least conceded", unit: "Goals", valueKind: "avg" },
];

function findTeamFixture(fixtures, team) {
  let best = null;
  let score = 0;
  for (const f of fixtures || []) {
    const sh = nameScore(f.home?.name, team);
    const sa = nameScore(f.away?.name, team);
    const s = Math.max(sh, sa);
    if (s > score && s >= 0.72) {
      best = s === sh
        ? { fixture: f, side: f.home, opp: f.away }
        : { fixture: f, side: f.away, opp: f.home };
      score = s;
    }
  }
  return best;
}

export function decorateFormRows(rows, fixtures, limit = 40) {
  return (rows || []).slice(0, limit).map((row) => {
    const hit = findTeamFixture(fixtures, row.team);
    const live = Boolean(hit && hit.fixture.status !== "post");
    return {
      rank: row.rank ?? 0,
      team: row.team,
      league: row.league || "",
      count: row.count ?? 0,
      matches: row.matches ?? 0,
      rate: row.rate,
      display: row.display || (row.rate == null ? "—" : row.valueKind === "avg" ? String(row.rate) : `${Math.round(row.rate * 100)}%`),
      valueKind: row.valueKind === "avg" ? "avg" : "pct",
      playingToday: Boolean(row.playingToday || live),
      tipPath: null,
      teamPath: null,
      logo: hit?.side?.logo ?? null,
      fixtureId: live ? hit.fixture.id : null,
      opponent: live ? hit.opp.name : null,
    };
  });
}

export async function buildFormBoard({ fixtures = [], date, dateLabel } = {}) {
  const today = date || new Date().toISOString().slice(0, 10);
  const pages = await Promise.all(FORM_BOARDS.map((b) => fetchHtml(`https://primatips.com${b.path}`)));
  const boards = {};
  let playingToday = 0;
  for (let i = 0; i < FORM_BOARDS.length; i++) {
    const meta = FORM_BOARDS[i];
    const tables = parsePrimaFormTables(pages[i] || "");
    const overall = decorateFormRows(tables.overall, fixtures);
    const home = decorateFormRows(tables.home, fixtures);
    const away = decorateFormRows(tables.away, fixtures);
    if (meta.id === "most-wins") playingToday = overall.filter((r) => r.playingToday).length;
    boards[meta.id] = {
      ...meta,
      overall,
      home,
      away,
    };
  }
  return {
    date: today,
    dateLabel: dateLabel || today,
    fetchedAt: new Date().toISOString(),
    source: "form",
    playingToday,
    boards,
  };
}

export function parseBeStreakRows(html) {
  const table = firstTable(html);
  const rows = [];
  const re = /<tr>([\s\S]*?)<\/tr>/g;
  let m;
  while ((m = re.exec(table))) {
    const row = m[1];
    if (/<th/i.test(row)) continue;
    const team = decodeHtml((row.match(/list-events__item__title">([^<]+)/) || [])[1] || "");
    if (!team) continue;
    const league = decodeHtml((row.match(/title="([^"]+)"/) || [])[1] || "");
    const stat = Number((row.match(/class="h-text-center">\s*(\d+)/) || [])[1] || "");
    const next = row.match(/<td title="([^"]*)">\s*<a href="([^"]+)">([\s\S]*?)<\/a>/);
    const when = next ? next[1] : "";
    const path = next ? next[2] : "";
    const nextHtml = next ? next[3] : "";
    const strong = decodeHtml((nextHtml.match(/<strong>([^<]+)<\/strong>/) || [])[1] || team);
    const sides = decodeHtml(nextHtml.replace(/<[^>]+>/g, " ")).split(/\s+-\s+/);
    const odds = [...row.matchAll(/data-odd="([\d.]+)"/g)].map((x) => parseOdd(x[1]));
    rows.push({
      team,
      league,
      streak: Number.isFinite(stat) ? stat : 0,
      when,
      path,
      url: path ? `https://www.betexplorer.com${path}` : "",
      home: decodeHtml(sides[0] || ""),
      away: decodeHtml(sides[1] || ""),
      focus: strong,
      homeOdds: odds[0] ?? null,
      drawOdds: odds[1] ?? null,
      awayOdds: odds[2] ?? null,
    });
  }
  return rows;
}

export function parseBeOverUnder(html) {
  const tables = allTables(html).filter((t) => t.includes("table-main"));
  const parse = (table, kind) => {
    const rows = [];
    const re = /<tr>([\s\S]*?)<\/tr>/g;
    let m;
    while ((m = re.exec(table))) {
      const row = m[1];
      if (/<th/i.test(row)) continue;
      const team = decodeHtml((row.match(/list-events__item__title">([^<]+)/) || [])[1] || "");
      if (!team) continue;
      const nums = [...row.matchAll(/class="h-text-center">\s*([^<]+)/g)].map((x) => x[1].trim());
      const games = Number(nums[0]);
      const hits = Number(nums[1]);
      const rate = parsePct(nums[2]);
      const next = row.match(/<td title="([^"]*)">\s*<a href="([^"]+)">([\s\S]*?)<\/a>/);
      const nextHtml = next ? next[3] : "";
      const sides = decodeHtml(nextHtml.replace(/<[^>]+>/g, " ")).split(/\s+-\s+/);
      const odds = [...row.matchAll(/data-odd="([\d.]+)"/g)].map((x) => parseOdd(x[1]));
      const path = next ? next[2] : "";
      rows.push({
        kind,
        team,
        league: decodeHtml((row.match(/title="([^"]+)"/) || [])[1] || ""),
        games: Number.isFinite(games) ? games : 0,
        hits: Number.isFinite(hits) ? hits : 0,
        rate,
        when: next ? next[1] : "",
        path,
        url: path ? `https://www.betexplorer.com${path.replace(/#.*$/, "")}` : "",
        home: decodeHtml(sides[0] || ""),
        away: decodeHtml(sides[1] || ""),
        overOdds: odds[0] ?? null,
        underOdds: odds[1] ?? null,
      });
    }
    return rows;
  };
  const overs = tables[0] ? parse(tables[0], "over") : [];
  const unders = tables[1] ? parse(tables[1], "under") : [];
  return { overs, unders };
}

export function parsePrimaTipMarkets(html) {
  const text = String(html);
  const grab = (label) => {
    const i = text.indexOf(label);
    if (i < 0) return null;
    const chunk = text.slice(i, i + 900);
    const odds = [...chunk.matchAll(/class="odd[^"]*">\s*([\d.]+)/g)].map((x) => parseOdd(x[1]));
    const pcts = [...chunk.matchAll(/>(\d+)%</g)].map((x) => Number(x[1]) / 100);
    return {
      overOdds: odds[0] ?? null,
      underOdds: odds[1] ?? null,
      overPct: pcts[0] ?? null,
      underPct: pcts[1] ?? null,
    };
  };
  const ou = grab("Over/Under 2.5");
  const gg = grab("Both Teams to Score");
  const last = { home: [], away: [] };
  const scores = (block) =>
    [...String(block).matchAll(/class="result[^"]*">\s*(\d+)\s*-\s*(\d+)/g)].map((x) => [Number(x[1]), Number(x[2])]);
  const blocks = [...text.matchAll(/<h2 class="games-title">\s*([^<]+) last 12 games<\/h2>\s*<table class="games-stat">([\s\S]*?)<\/table>/gi)];
  if (blocks[1]) last.home = scores(blocks[1][2]);
  if (blocks[2]) last.away = scores(blocks[2][2]);
  else if (blocks[0] && !/H2H/i.test(blocks[0][1] || "")) last.home = scores(blocks[0][2]);
  const bttsRate = (games) => {
    if (!games.length) return null;
    const hits = games.filter(([h, a]) => h > 0 && a > 0).length;
    return hits / games.length;
  };
  const ouRate = (games, over) => {
    if (!games.length) return null;
    const hits = games.filter(([h, a]) => (over ? h + a > 2.5 : h + a < 2.5)).length;
    return hits / games.length;
  };
  return {
    over25: ou,
    gg: gg
      ? { yesOdds: gg.overOdds, noOdds: gg.underOdds, yesPct: gg.overPct, noPct: gg.underPct }
      : null,
    homeLast: last.home,
    awayLast: last.away,
    homeGg: bttsRate(last.home),
    awayGg: bttsRate(last.away),
    homeOver: ouRate(last.home, true),
    awayOver: ouRate(last.away, true),
    sample: Math.min(last.home.length || 0, last.away.length || 12) || last.home.length,
  };
}

function findGame(games, home, away) {
  let best = null;
  let score = 0;
  for (const g of games) {
    const s = Math.max(
      (sameTeam(g.home, home) ? nameScore(g.home, home) : 0) + (sameTeam(g.away, away) ? nameScore(g.away, away) : 0),
      (sameTeam(g.home, away) ? nameScore(g.home, away) : 0) + (sameTeam(g.away, home) ? nameScore(g.away, home) : 0),
    );
    if (s > score && s >= 1.3) {
      best = g;
      score = s;
    }
  }
  return best;
}

function findTeamGame(games, team) {
  let best = null;
  let score = 0;
  for (const g of games) {
    const sh = nameScore(g.home, team);
    const sa = nameScore(g.away, team);
    const s = Math.max(sh, sa);
    if (s > score && s >= 0.72) {
      best = { game: g, side: sh >= sa ? "home" : "away" };
      score = s;
    }
  }
  return best;
}

function findFixture(fixtures, home, away) {
  if (!fixtures?.length) return null;
  let best = null;
  let score = 0;
  for (const f of fixtures) {
    const s = Math.max(
      nameScore(f.home.name, home) + nameScore(f.away.name, away),
      nameScore(f.home.name, away) + nameScore(f.away.name, home),
    );
    if (s > score && s >= 1.3) {
      best = f;
      score = s;
    }
  }
  return best;
}

function isTodayRow(when, todayStamp) {
  if (!when) return true;
  const m = String(when).match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return true;
  const stamp = `${m[3]}-${m[2]}-${m[1]}`;
  return stamp === todayStamp;
}

function pickId(category, home, away, team) {
  return `${category}:${normName(home)}:${normName(away)}:${normName(team)}`;
}

function attachFixture(pick, fixtures) {
  const f = findFixture(fixtures, pick.home, pick.away);
  if (!f) return pick;
  return {
    ...pick,
    fixtureId: f.id,
    homeLogo: f.home.logo,
    awayLogo: f.away.logo,
    kickoffIso: f.start,
    league: pick.league || f.league,
  };
}

function emptyCategories() {
  return {
    wins: [],
    losses: [],
    winless: [],
    undefeated: [],
    over25: [],
    under25: [],
    gg: [],
  };
}

function mergePicks(list) {
  const by = new Map();
  for (const p of list) {
    const key = `${p.category}|${normName(p.home)}|${normName(p.away)}|${p.selection}`;
    const prev = by.get(key);
    if (!prev) {
      by.set(key, { ...p, sources: [...p.sources], sourceNotes: [...p.sourceNotes] });
      continue;
    }
    const sources = new Set([...prev.sources, ...p.sources]);
    prev.sources = [...sources];
    prev.sourceNotes = [...prev.sourceNotes, ...p.sourceNotes];
    prev.rate = Math.max(prev.rate, p.rate);
    prev.sample = Math.max(prev.sample, p.sample);
    if (!inOddsBand(prev.odds) && inOddsBand(p.odds)) prev.odds = p.odds;
    if (!prev.fixtureId && p.fixtureId) {
      prev.fixtureId = p.fixtureId;
      prev.homeLogo = p.homeLogo;
      prev.awayLogo = p.awayLogo;
    }
  }
  return [...by.values()].sort((a, b) => b.rate - a.rate || a.odds - b.odds);
}

function qualify(pick) {
  return pick.rate >= MIN_RATE && pick.sample >= MIN_SAMPLE && inOddsBand(pick.odds);
}

export function formRate(row, mode) {
  if (!row || !row.matches) return null;
  if (mode === "wins") return row.rate;
  if (mode === "losses") return row.rate;
  if (mode === "winless") {
    if (row.rate == null) return (row.matches - row.count) / row.matches;
    return 1 - row.rate;
  }
  if (mode === "undefeated") {
    if (row.rate == null) return (row.matches - row.count) / row.matches;
    return 1 - row.rate;
  }
  return row.rate;
}

export function buildPicksFromPrimaForm(games, form, category, fixtures) {
  const out = [];
  const mode = category;
  for (const row of form) {
    if (!row.playingToday && !findTeamGame(games, row.team)) continue;
    const hit = findTeamGame(games, row.team);
    if (!hit) continue;
    const g = hit.game;
    const team = hit.side === "home" ? g.home : g.away;
    const opponent = hit.side === "home" ? g.away : g.home;
    const rate = formRate(row, mode);
    if (rate == null) continue;
    let odds = null;
    let selection = "";
    let label = "";
    let market = "1x2";
    if (category === "wins" || category === "undefeated") {
      odds = hit.side === "home" ? g.homeOdds : g.awayOdds;
      selection = hit.side;
      label = `${team} to win`;
    } else if (category === "losses" || category === "winless") {
      odds = hit.side === "home" ? g.awayOdds : g.homeOdds;
      selection = hit.side === "home" ? "away" : "home";
      label = `${opponent} to win`;
    }
    const pick = attachFixture(
      {
        id: pickId(category, g.home, g.away, team),
        category,
        home: g.home,
        away: g.away,
        team,
        opponent,
        league: g.league || row.league,
        kickoff: g.kickoff,
        kickoffIso: null,
        selection,
        label,
        market,
        odds,
        rate,
        sample: row.matches,
        statLabel: `${Math.round(rate * 100)}% of ${row.matches}`,
        sources: ["form"],
        sourceNotes: [{ source: "form", rate, sample: row.matches, odds }],
        fixtureId: null,
        homeLogo: null,
        awayLogo: null,
        url: "",
      },
      fixtures,
    );
    if (qualify(pick)) out.push(pick);
  }
  return out;
}

export function buildPicksFromBeStreaks(games, rows, category, fixtures, todayStamp) {
  const out = [];
  for (const row of rows) {
    if (!isTodayRow(row.when, todayStamp)) continue;
    const g = findGame(games, row.home, row.away) || findTeamGame(games, row.team)?.game;
    if (!g && !row.home) continue;
    const home = g?.home || row.home;
    const away = g?.away || row.away;
    if (!home || !away) continue;
    const focusHome = sameTeam(row.team, home);
    const team = focusHome ? home : away;
    const opponent = focusHome ? away : home;
    const rate = row.streak >= MIN_SAMPLE ? 1 : row.streak / Math.max(row.streak, MIN_SAMPLE);
    const sample = row.streak;
    let odds = null;
    let selection = "";
    let label = "";
    if (category === "wins" || category === "undefeated") {
      odds = focusHome ? (g?.homeOdds ?? row.homeOdds) : (g?.awayOdds ?? row.awayOdds);
      selection = focusHome ? "home" : "away";
      label = `${team} to win`;
    } else {
      odds = focusHome ? (g?.awayOdds ?? row.awayOdds) : (g?.homeOdds ?? row.homeOdds);
      selection = focusHome ? "away" : "home";
      label = `${opponent} to win`;
    }
    const pick = attachFixture(
      {
        id: pickId(category, home, away, team),
        category,
        home,
        away,
        team,
        opponent,
        league: g?.league || row.league,
        kickoff: g?.kickoff || row.when,
        kickoffIso: null,
        selection,
        label,
        market: "1x2",
        odds,
        rate,
        sample,
        statLabel: `${sample}-game run`,
        sources: ["odds"],
        sourceNotes: [{ source: "odds", rate, sample, odds }],
        fixtureId: null,
        homeLogo: null,
        awayLogo: null,
        url: "",
      },
      fixtures,
    );
    if (qualify(pick)) out.push(pick);
  }
  return out;
}

export function buildPicksFromBeOu(games, rows, category, fixtures, todayStamp) {
  const out = [];
  for (const row of rows) {
    if (!isTodayRow(row.when, todayStamp)) continue;
    const g = findGame(games, row.home, row.away);
    const home = g?.home || row.home;
    const away = g?.away || row.away;
    if (!home || !away) continue;
    const over = category === "over25";
    const odds = over ? row.overOdds : row.underOdds;
    const rate = row.rate;
    const pick = attachFixture(
      {
        id: pickId(category, home, away, row.team),
        category,
        home,
        away,
        team: row.team,
        opponent: sameTeam(row.team, home) ? away : home,
        league: g?.league || row.league,
        kickoff: g?.kickoff || row.when,
        kickoffIso: null,
        selection: over ? "over" : "under",
        label: over ? "Over 2.5" : "Under 2.5",
        market: "total",
        odds,
        rate,
        sample: row.games,
        statLabel: `${Math.round((rate || 0) * 100)}% of ${row.games}`,
        sources: ["odds"],
        sourceNotes: [{ source: "odds", rate, sample: row.games, odds }],
        fixtureId: null,
        homeLogo: null,
        awayLogo: null,
        url: "",
      },
      fixtures,
    );
    if (qualify(pick)) out.push(pick);
  }
  return out;
}

export function buildPicksFromPrimaHome(games, fixtures) {
  const out = [];
  for (const g of games) {
    const sides = [
      { category: "wins", selection: "home", team: g.home, opponent: g.away, rate: g.homePct, odds: g.homeOdds, label: `${g.home} to win` },
      { category: "wins", selection: "away", team: g.away, opponent: g.home, rate: g.awayPct, odds: g.awayOdds, label: `${g.away} to win` },
    ];
    for (const s of sides) {
      const pick = attachFixture(
        {
          id: pickId(s.category, g.home, g.away, s.team),
          category: s.category,
          home: g.home,
          away: g.away,
          team: s.team,
          opponent: s.opponent,
          league: g.league,
          kickoff: g.kickoff,
          kickoffIso: null,
          selection: s.selection,
          label: s.label,
          market: "1x2",
          odds: s.odds,
          rate: s.rate ?? 0,
          sample: 10,
          statLabel: `${Math.round((s.rate ?? 0) * 100)}% model`,
          sources: ["form"],
          sourceNotes: [{ source: "form", rate: s.rate ?? 0, sample: 10, odds: s.odds }],
          fixtureId: null,
          homeLogo: null,
          awayLogo: null,
          url: "",
        },
        fixtures,
      );
      if (qualify(pick)) out.push(pick);
    }
  }
  return out;
}

export function buildGgAndOuFromTip(game, markets, fixtures) {
  const out = [];
  if (!markets) return out;
  const combinedGg =
    markets.homeGg != null && markets.awayGg != null ? (markets.homeGg + markets.awayGg) / 2 : markets.gg?.yesPct ?? null;
  const ggSample = (markets.homeLast?.length || 0) + (markets.awayLast?.length || 0) || markets.sample || 12;
  if (combinedGg != null) {
    const bothHigh = (markets.homeGg ?? 0) >= MIN_RATE && (markets.awayGg ?? 0) >= MIN_RATE;
    const rate = bothHigh ? Math.min(markets.homeGg, markets.awayGg) : combinedGg;
    const odds = markets.gg?.yesOdds ?? null;
    const pick = attachFixture(
      {
        id: pickId("gg", game.home, game.away, "gg"),
        category: "gg",
        home: game.home,
        away: game.away,
        team: game.home,
        opponent: game.away,
        league: game.league,
        kickoff: game.kickoff,
        kickoffIso: null,
        selection: "yes",
        label: "GG — both teams to score",
        market: "btts",
        odds,
        rate,
        sample: Math.max(ggSample, MIN_SAMPLE),
        statLabel: `${Math.round(rate * 100)}% recent GG`,
        sources: ["form"],
        sourceNotes: [{ source: "form", rate, sample: ggSample, odds }],
        fixtureId: null,
        homeLogo: null,
        awayLogo: null,
        url: "",
      },
      fixtures,
    );
    if (qualify(pick) && (bothHigh || rate >= MIN_RATE)) out.push(pick);
  }
  const overRate =
    markets.homeOver != null && markets.awayOver != null
      ? (markets.homeOver + markets.awayOver) / 2
      : markets.over25?.overPct ?? null;
  if (overRate != null) {
    const overOdds = markets.over25?.overOdds ?? null;
    const underOdds = markets.over25?.underOdds ?? null;
    const underRate = 1 - overRate;
    for (const [category, rate, odds, selection, label] of [
      ["over25", overRate, overOdds, "over", "Over 2.5"],
      ["under25", underRate, underOdds, "under", "Under 2.5"],
    ]) {
      const pick = attachFixture(
        {
          id: pickId(category, game.home, game.away, category),
          category,
          home: game.home,
          away: game.away,
          team: game.home,
          opponent: game.away,
          league: game.league,
          kickoff: game.kickoff,
          kickoffIso: null,
          selection,
          label,
          market: "total",
          odds,
          rate,
          sample: Math.max(ggSample, MIN_SAMPLE),
          statLabel: `${Math.round(rate * 100)}% recent`,
          sources: ["form"],
          sourceNotes: [{ source: "form", rate, sample: ggSample, odds }],
          fixtureId: null,
          homeLogo: null,
          awayLogo: null,
          url: "",
        },
        fixtures,
      );
      if (qualify(pick)) out.push(pick);
    }
  }
  return out;
}

export function bankersFrom(categories) {
  const out = [];
  const seen = new Set();
  for (const list of Object.values(categories)) {
    for (const p of list) {
      if (!p.sources.includes("form") || !p.sources.includes("odds")) continue;
      if (!qualify(p)) continue;
      const key = `${p.category}|${normName(p.home)}|${normName(p.away)}|${p.selection}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...p, agreed: ["form", "odds"] });
    }
  }
  return out.sort((a, b) => b.rate - a.rate || a.odds - b.odds);
}

async function fetchHtml(url, ms = 14_000) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(ms),
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  }
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

export async function buildTrends({ fixtures = [], date, dateLabel } = {}) {
  const today = date || new Date().toISOString().slice(0, 10);
  const pages = await Promise.all([
    fetchHtml("https://primatips.com/"),
    fetchHtml("https://primatips.com/form/most-wins"),
    fetchHtml("https://primatips.com/form/most-losses"),
    fetchHtml("https://primatips.com/form/least-wins"),
    fetchHtml("https://primatips.com/form/least-losses"),
    fetchHtml("https://www.betexplorer.com/football/streaks/wins/"),
    fetchHtml("https://www.betexplorer.com/football/streaks/losses/"),
    fetchHtml("https://www.betexplorer.com/football/streaks/no-wins/"),
    fetchHtml("https://www.betexplorer.com/football/streaks/no-losses/"),
    fetchHtml("https://www.betexplorer.com/football/streaks/over-under/"),
  ]);

  const games = parsePrimaGames(pages[0]);
  const formWins = parsePrimaForm(pages[1]);
  const formLosses = parsePrimaForm(pages[2]);
  const formWinless = parsePrimaForm(pages[3]);
  const formUndefeated = parsePrimaForm(pages[4]);
  const beWins = parseBeStreakRows(pages[5]);
  const beLosses = parseBeStreakRows(pages[6]);
  const beWinless = parseBeStreakRows(pages[7]);
  const beUndefeated = parseBeStreakRows(pages[8]);
  const beOu = parseBeOverUnder(pages[9]);

  const categories = emptyCategories();
  categories.wins.push(
    ...buildPicksFromPrimaForm(games, formWins, "wins", fixtures),
    ...buildPicksFromBeStreaks(games, beWins, "wins", fixtures, today),
  );
  categories.losses.push(
    ...buildPicksFromPrimaForm(games, formLosses, "losses", fixtures),
    ...buildPicksFromBeStreaks(games, beLosses, "losses", fixtures, today),
  );
  categories.winless.push(
    ...buildPicksFromPrimaForm(games, formWinless, "winless", fixtures),
    ...buildPicksFromBeStreaks(games, beWinless, "winless", fixtures, today),
  );
  categories.undefeated.push(
    ...buildPicksFromPrimaForm(games, formUndefeated, "undefeated", fixtures),
    ...buildPicksFromBeStreaks(games, beUndefeated, "undefeated", fixtures, today),
  );
  categories.over25.push(...buildPicksFromBeOu(games, beOu.overs, "over25", fixtures, today));
  categories.under25.push(...buildPicksFromBeOu(games, beOu.unders, "under25", fixtures, today));

  const ggCandidates = games.filter((g) => !g.settled).slice(0, 72);
  const tipHtml = await mapPool(ggCandidates, 6, (g) => fetchHtml(g.url, 10_000));
  for (let i = 0; i < ggCandidates.length; i++) {
    if (!tipHtml[i]) continue;
    const markets = parsePrimaTipMarkets(tipHtml[i]);
    const extra = buildGgAndOuFromTip(ggCandidates[i], markets, fixtures);
    for (const p of extra) categories[p.category].push(p);
  }

  for (const key of Object.keys(categories)) {
    categories[key] = mergePicks(categories[key]).filter(qualify);
  }

  const bankers = bankersFrom(categories);
  const counts = Object.fromEntries(Object.entries(categories).map(([k, v]) => [k, v.length]));

  return {
    date: today,
    dateLabel: dateLabel || today,
    fetchedAt: new Date().toISOString(),
    minRate: MIN_RATE,
    oddsFrom: ODDS_FROM,
    oddsTo: ODDS_TO,
    sources: ["form", "odds"],
    counts,
    categories,
    bankers,
    games: games.length,
  };
}
