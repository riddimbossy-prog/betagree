#!/usr/bin/env node
/**
 * Scan every upcoming SportyBet football match with the main-board rules:
 * favourite win, weak under 2.5, GG, home 2+, away DNB.
 *
 * The SportyBet book is two tabs. pcUpcomingEvents without todayGames=true is
 * Early only (later days). Today's card is pulled via todayGames=true inside
 * pullScanBooks → pullMarket.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { namesMatch } from "./lib/names-match.mjs";
import { loadLeagueSplit } from "./lib/last5.mjs";
import { eventLeagueKey, eventStartMs, outcomeOdds, pullScanBooks } from "./lib/sportybet.mjs";
import { buildSportyScan } from "./lib/sporty-scan.mjs";
import { dayBucket, isSeniorName } from "./lib/streak-rules.mjs";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "public/data/sporty-scan.json");
const ESPN = "https://site.web.api.espn.com/apis/v2/sports/soccer";
const HORIZON_DAYS = 4;

const LEAGUES = [
  ["eng.1", ["england premier league", "english premier league"]],
  ["eng.2", ["england championship", "efl championship"]],
  ["eng.3", ["england league one"]],
  ["eng.4", ["england league two"]],
  ["esp.1", ["spain laliga", "spain la liga", "spanish laliga"]],
  ["esp.2", ["spain laliga 2", "spain segunda", "laliga2"]],
  ["ita.1", ["italy serie a", "italian serie a"]],
  ["ita.2", ["italy serie b"]],
  ["ger.1", ["germany bundesliga", "german bundesliga"]],
  ["ger.2", ["germany 2. bundesliga", "germany 2 bundesliga"]],
  ["fra.1", ["france ligue 1", "french ligue 1"]],
  ["fra.2", ["france ligue 2"]],
  ["ned.1", ["netherlands eredivisie", "holland eredivisie"]],
  ["por.1", ["portugal primeira", "liga portugal", "liga portugal betclic"]],
  ["bel.1", ["belgium first division", "belgium jupiler", "belgium pro league"]],
  ["sco.1", ["scotland premiership", "scottish premiership"]],
  ["tur.1", ["turkey super lig", "turkiye super lig", "super lig"]],
  ["usa.1", ["usa major league soccer", "united states mls", "usa mls"]],
  ["mex.1", ["mexico liga mx", "liga mx"]],
  ["bra.1", ["brazil brasileiro serie a", "brazil serie a", "brasileiro serie a"]],
  ["arg.1", ["argentina liga profesional", "argentina primera division"]],
  ["chi.1", ["chile primera", "chile liga de primera"]],
  ["chn.1", ["chinese super league", "china super league"]],
  ["col.1", ["colombia primera a", "colombia liga"]],
  ["ned.2", ["netherlands eerste divisie"]],
  ["swe.1", ["sweden allsvenskan"]],
  ["nor.1", ["norway eliteserien"]],
  ["den.1", ["denmark superliga", "denmark sas ligaen"]],
  ["sui.1", ["switzerland super league"]],
  ["aut.1", ["austria bundesliga"]],
  ["gre.1", ["greece super league"]],
  ["pol.1", ["poland ekstraklasa"]],
  ["rou.1", ["romania liga 1"]],
  ["cze.1", ["czech first league"]],
  ["hrv.1", ["croatia prvahnl", "croatia hnl"]],
  ["srb.1", ["serbia super liga"]],
  ["ukr.1", ["ukraine premier league"]],
  ["jpn.1", ["japan j1 league"]],
  ["kor.1", ["korea k league"]],
  ["aus.1", ["australia a-league"]],
  ["sau.1", ["saudi professional league", "saudi pro league"]],
  ["uae.1", ["uae pro league"]],
  ["egy.1", ["egypt premier league"]],
  ["rsa.1", ["south africa premiership"]],
  ["per.1", ["peru liga 1"]],
  ["qat.1", ["qatar stars"]],
  ["uefa.champions", ["uefa champions league"]],
  ["uefa.europa", ["uefa europa league"]],
  ["uefa.europa.conf", ["uefa conference league", "uefa europa conference"]],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function mapSlug(key) {
  for (const [slug, needles] of LEAGUES) {
    if (needles.some((n) => key.includes(n))) return slug;
  }
  return null;
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(16_000) });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function parseEspnTable(json) {
  const entries = json?.children?.[0]?.standings?.entries ?? [];
  const rows = [];
  for (const e of entries) {
    const team = e.team ?? {};
    const stats = e.stats ?? [];
    const num = (name) => {
      const s = stats.find((x) => x.name === name);
      return Number(s?.value);
    };
    const rank = num("rank");
    const gp = num("gamesPlayed");
    const pts = num("points");
    const ppg = num("ppg");
    rows.push({
      name: String(team.displayName ?? team.shortDisplayName ?? ""),
      short: String(team.shortDisplayName ?? ""),
      rank: Number.isFinite(rank) ? rank : rows.length + 1,
      gp: Number.isFinite(gp) ? gp : 0,
      pts: Number.isFinite(pts) ? pts : null,
      ppg: Number.isFinite(ppg) ? ppg : Number.isFinite(pts) && gp > 0 ? pts / gp : null,
    });
  }
  rows.sort((a, b) => a.rank - b.rank);
  return rows;
}

async function loadEspnTable(slug) {
  const cur = await fetchJson(`${ESPN}/${slug}/standings`);
  let rows = parseEspnTable(cur);
  const played = rows.reduce((s, r) => s + r.gp, 0);
  if (played === 0) {
    const year = new Date().getUTCFullYear() - 1;
    const prev = await fetchJson(`${ESPN}/${slug}/standings?season=${year}`);
    const older = parseEspnTable(prev);
    if (older.reduce((s, r) => s + r.gp, 0) > 0) rows = older;
  }
  return rows;
}

function findRow(rows, name) {
  if (!rows?.length || !name) return null;
  return (
    rows.find((r) => namesMatch(r.name, name)) ||
    rows.find((r) => namesMatch(r.short, name)) ||
    null
  );
}

function round2(n) {
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
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

export async function buildSportyScanBoard() {
  const now = Date.now();
  const until = now + HORIZON_DAYS * 86_400_000;
  const books = await pullScanBooks({ pageSize: 80, maxPages: 16 });

  const upcoming = [];
  let droppedYouth = 0;
  for (const item of books.events) {
    const ev = item.ev;
    const start = eventStartMs(ev);
    if (!start || start < now - 30 * 60_000 || start > until) continue;
    if (!isSeniorName(ev?.sport?.category?.name, ev?.sport?.category?.tournament?.name, ev.homeTeamName, ev.awayTeamName)) {
      droppedYouth += 1;
      continue;
    }
    upcoming.push(item);
  }

  const bySlug = new Map();
  for (const item of upcoming) {
    const slug = mapSlug(eventLeagueKey(item.ev));
    if (!slug) continue;
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug).push(item);
  }

  const espnTables = new Map();
  for (const slug of bySlug.keys()) {
    try {
      espnTables.set(slug, await loadEspnTable(slug));
    } catch {
      espnTables.set(slug, []);
    }
    await sleep(40);
  }

  const splitBySlug = new Map();
  await mapPool([...bySlug.entries()], 4, async ([slug, list]) => {
    const sample = list[0];
    if (!sample) return;
    try {
      const split = await loadLeagueSplit(sample.home, sample.away);
      if (split) splitBySlug.set(slug, split);
    } catch {
      /* keep ESPN fallback */
    }
  });

  const rows = [];
  for (const item of upcoming) {
    const ev = item.ev;
    const start = eventStartMs(ev);
    const kickoff = new Date(start).toISOString();
    const slug = mapSlug(eventLeagueKey(ev));
    const split = slug ? splitBySlug.get(slug) ?? null : null;
    const espn = slug ? espnTables.get(slug) ?? [] : [];
    const homeSplit = split ? findRow(split.home, item.home) : null;
    const awaySplit = split ? findRow(split.away, item.away) : null;
    const homeOver = split ? findRow(split.total, item.home) : findRow(espn, item.home);
    const awayOver = split ? findRow(split.total, item.away) : findRow(espn, item.away);
    const sameLogo = Boolean(ev.homeTeamIcon && ev.awayTeamIcon && ev.homeTeamIcon === ev.awayTeamIcon);
    rows.push({
      fixtureId: ev.eventId,
      league: ev.sport?.category?.tournament?.name ?? ev.sport?.category?.name ?? "Football",
      kickoff,
      when: dayBucket(kickoff, now),
      home: item.home,
      away: item.away,
      homeLogo: sameLogo ? null : ev.homeTeamIcon || homeOver?.logo || null,
      awayLogo: sameLogo ? null : ev.awayTeamIcon || awayOver?.logo || null,
      homeWin: outcomeOdds(item.one, "home"),
      draw: outcomeOdds(item.one, "draw"),
      awayWin: outcomeOdds(item.one, "away"),
      homePpg: round2(homeSplit?.ppg ?? homeOver?.ppg),
      awayPpg: round2(awaySplit?.ppg ?? awayOver?.ppg),
      homeSplitRank: homeSplit?.rank ?? null,
      awaySplitRank: awaySplit?.rank ?? null,
      homeRank: homeOver?.rank ?? null,
      awayRank: awayOver?.rank ?? null,
      tableSize: split?.size || espn.length || 20,
      homeOu: item.homeOu,
      awayOu: item.awayOu,
      ou: item.ou,
      bttsYes: outcomeOdds(item.btts, "yes") ?? outcomeOdds(item.btts, "gg"),
      dnbAway: outcomeOdds(item.dnb, "away"),
      dnbHome: outcomeOdds(item.dnb, "home"),
    });
  }

  const built = buildSportyScan(rows);
  const day = new Date().toISOString().slice(0, 10);
  const whenCounts = { today: 0, tomorrow: 0, later: 0 };
  for (const row of rows) whenCounts[row.when] = (whenCounts[row.when] || 0) + 1;
  const pickWhen = { today: 0, tomorrow: 0, later: 0 };
  for (const pick of built.picks) pickWhen[pick.when] = (pickWhen[pick.when] || 0) + 1;
  return {
    date: day,
    dateLabel: day,
    fetchedAt: new Date().toISOString(),
    engine: "sporty-scan-v1",
    scanned: rows.length,
    when: whenCounts,
    pickWhen,
    books: books.counts,
    droppedYouth,
    tables: { espn: espnTables.size, split: splitBySlug.size },
    picks: built.picks,
    meta: built.meta,
  };
}

const board = await buildSportyScanBoard();
mkdirSync(join(ROOT, "public/data"), { recursive: true });
let prev = null;
try {
  if (existsSync(OUT)) prev = JSON.parse(readFileSync(OUT, "utf8"));
} catch {
  prev = null;
}
const bookEmpty = !board.scanned && !(board.books?.one > 0);
if (bookEmpty && (prev?.scanned > 0 || prev?.picks?.length)) {
  console.warn(
    `sporty-scan: SportyBet book empty (${JSON.stringify(board.books)}) — keeping ${prev.picks?.length ?? 0} picks from ${prev.fetchedAt}`,
  );
  process.exit(0);
}
writeFileSync(OUT, JSON.stringify(board));
const counts = {};
for (const p of board.picks) counts[p.rule] = (counts[p.rule] || 0) + 1;
console.log(
  `sporty-scan ${board.date} scanned ${board.scanned} when ${JSON.stringify(board.when)} picks ${board.picks.length} pickWhen ${JSON.stringify(board.pickWhen)} ${JSON.stringify(counts)} books ${JSON.stringify(board.books)} tables ${JSON.stringify(board.tables)} youth ${board.droppedYouth}`,
);
