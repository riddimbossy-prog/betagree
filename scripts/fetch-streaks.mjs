#!/usr/bin/env node
/**
 * Pull SportyBet 2+ / 3+ Goals Streak prices, join league tables,
 * and keep only matches that clear the user's bands:
 *   2+ Yes  1.19–1.40  AND favorite's opponent PPG < 1.2
 *   3+      (Yes + No) / 2 in 1.90–2.10  → assign Over 2.5 goals
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { namesMatch as matchNames } from "./lib/names-match.mjs";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "public/data/streaks.json");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const SB = "https://www.sportybet.com/api/ng/factsCenter";
const ESPN = "https://site.web.api.espn.com/apis/v2/sports/soccer";
const PAGE = 80;
const HORIZON_DAYS = 8;

const TWO_YES = { from: 1.19, to: 1.4 };
const THREE_AVG = { from: 1.9, to: 2.1 };
/** Opponent of the favorite must average under this PPG for 2+ picks. */
const OPP_PPG_MAX = 1.2;

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
  ["tur.1", ["turkey super lig", "turkiye super lig", "süper lig", "super lig"]],
  ["usa.1", ["usa major league soccer", "united states mls", "usa mls"]],
  ["mex.1", ["mexico liga mx", "liga mx"]],
  ["bra.1", ["brazil brasileiro serie a", "brazil serie a", "brasileiro serie a"]],
  ["arg.1", ["argentina liga profesional", "argentina primera division"]],
  ["chi.1", ["chile primera", "chile liga de primera"]],
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
  ["rus.1", ["russia premier league"]],
  ["jpn.1", ["japan j1 league"]],
  ["kor.1", ["korea k league"]],
  ["aus.1", ["australia a-league"]],
  ["sau.1", ["saudi professional league", "saudi pro league"]],
  ["uae.1", ["uae pro league"]],
  ["egy.1", ["egypt premier league"]],
  ["rsa.1", ["south africa premiership"]],
  ["uefa.champions", ["uefa champions league"]],
  ["uefa.europa", ["uefa europa league"]],
  ["uefa.europa.conf", ["uefa conference league", "uefa europa conference"]],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function alias(s) {
  return norm(s)
    .split(" ")
    .filter((t) => t.length > 1);
}

function namesMatch(a, b) {
  return matchNames(a, b);
}

function inBand(n, band) {
  return Number.isFinite(n) && n >= band.from && n <= band.to;
}

function outcome(market, desc) {
  const row = (market?.outcomes ?? []).find((o) => String(o.desc).toLowerCase() === desc);
  const n = Number(row?.odds);
  return Number.isFinite(n) ? n : null;
}

function favFrom1x2(market) {
  const home = outcome(market, "home") ?? Number(market?.outcomes?.[0]?.odds);
  const draw = outcome(market, "draw") ?? Number(market?.outcomes?.[1]?.odds);
  const away = outcome(market, "away") ?? Number(market?.outcomes?.[2]?.odds);
  const sides = [
    { side: "home", odds: home },
    { side: "away", odds: away },
  ].filter((s) => Number.isFinite(s.odds));
  if (!sides.length) return { side: null, odds: null, home, draw, away };
  sides.sort((a, b) => a.odds - b.odds);
  return { side: sides[0].side, odds: sides[0].odds, home, draw, away };
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "application/json",
      Origin: "https://www.sportybet.com",
      Referer: "https://www.sportybet.com/ng/sport/football",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) return null;
  return res.json();
}

async function pullMarket(marketId) {
  const byId = new Map();
  let page = 1;
  let total = Infinity;
  while ((page - 1) * PAGE < total && page <= 20) {
    const url = `${SB}/pcUpcomingEvents?sportId=sr:sport:1&marketId=${marketId}&pageSize=${PAGE}&pageNum=${page}`;
    const json = await fetchJson(url);
    const data = json?.data;
    if (!data) break;
    total = Number(data.totalNum ?? 0);
    for (const tour of data.tournaments ?? []) {
      for (const ev of tour.events ?? []) {
        byId.set(ev.eventId, ev);
      }
    }
    if (!(data.tournaments ?? []).length) break;
    page += 1;
    await sleep(80);
  }
  return byId;
}

function isSenior(ev) {
  const key = leagueKey(ev);
  return !/\b(women|ladies|femenil|feminine|u1[5-9]|u2[0-3]|reserve|reserves|youth|junior|ii|iii)\b/.test(key);
}

function leagueKey(ev) {
  const cat = ev?.sport?.category?.name ?? "";
  const tour = ev?.sport?.category?.tournament?.name ?? ev?.sport?.tournament?.name ?? "";
  return norm(`${cat} ${tour}`);
}

function mapSlug(key) {
  for (const [slug, needles] of LEAGUES) {
    if (needles.some((n) => key.includes(n))) return slug;
  }
  return null;
}

function parseTable(json) {
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
    rows.push({
      name: String(team.displayName ?? team.shortDisplayName ?? ""),
      short: String(team.shortDisplayName ?? ""),
      abbr: String(team.abbreviation ?? ""),
      logo: team.logos?.[0]?.href ?? null,
      rank: Number.isFinite(rank) ? rank : rows.length + 1,
      gp: Number.isFinite(gp) ? gp : 0,
      pts: num("points"),
    });
  }
  rows.sort((a, b) => a.rank - b.rank);
  return rows;
}

async function loadTable(slug) {
  const cur = await fetchJson(`${ESPN}/${slug}/standings`);
  let rows = parseTable(cur);
  const played = rows.reduce((s, r) => s + r.gp, 0);
  if (played === 0) {
    const year = new Date().getUTCFullYear() - 1;
    const prev = await fetchJson(`${ESPN}/${slug}/standings?season=${year}`);
    const older = parseTable(prev);
    if (older.reduce((s, r) => s + r.gp, 0) > 0) {
      rows = older.map((r) => ({ ...r, season: year }));
    }
  }
  return rows;
}

function poleOf(row, size) {
  if (!row || !size) return null;
  if (row.rank <= 3) return "top";
  if (row.rank > size - 3) return "bottom";
  return null;
}

function ppg(row) {
  if (!row || !Number.isFinite(row.pts) || !Number.isFinite(row.gp) || row.gp <= 0) return null;
  return row.pts / row.gp;
}

function findRow(rows, name) {
  return (
    rows.find((r) => namesMatch(r.name, name)) ||
    rows.find((r) => namesMatch(r.short, name)) ||
    null
  );
}

function mergeEvents(one, two, three) {
  const ids = new Set([...one.keys(), ...two.keys(), ...three.keys()]);
  const out = [];
  for (const id of ids) {
    const a = one.get(id) ?? two.get(id) ?? three.get(id);
    if (!a) continue;
    out.push({
      ev: a,
      one: (one.get(id)?.markets ?? [])[0] ?? null,
      two: (two.get(id)?.markets ?? [])[0] ?? null,
      three: (three.get(id)?.markets ?? [])[0] ?? null,
    });
  }
  return out;
}

async function main() {
  const now = Date.now();
  const until = now + HORIZON_DAYS * 86_400_000;

  const [one, two, three] = await Promise.all([pullMarket(1), pullMarket(60010), pullMarket(60020)]);
  const merged = mergeEvents(one, two, three);

  const slugSet = new Set();
  for (const row of merged) {
    const slug = mapSlug(leagueKey(row.ev));
    if (slug) slugSet.add(slug);
  }
  const tables = new Map();
  for (const slug of slugSet) {
    try {
      tables.set(slug, await loadTable(slug));
    } catch {
      tables.set(slug, []);
    }
    await sleep(60);
  }

  const yes2 = [];
  const no3 = [];
  let scanned = 0;
  let withStreaks = 0;

  for (const row of merged) {
    const ev = row.ev;
    const start = Number(ev.estimateStartTime ?? 0);
    if (!start || start < now - 30 * 60_000 || start > until) continue;
    if (!isSenior(ev)) continue;
    scanned += 1;
    const fav = favFrom1x2(row.one);
    const yes2price = outcome(row.two, "yes");
    const no2price = outcome(row.two, "no");
    const yes3 = outcome(row.three, "yes");
    const no3price = outcome(row.three, "no");
    if (yes2price != null || yes3 != null || no3price != null) withStreaks += 1;

    const slug = mapSlug(leagueKey(ev));
    const table = slug ? tables.get(slug) ?? [] : [];
    if (table.length < 6) continue;
    const homeRow = findRow(table, ev.homeTeamName);
    let awayRow = findRow(table, ev.awayTeamName);
    if (homeRow && awayRow && homeRow.name === awayRow.name) {
      awayRow =
        table.find((r) => alias(r.name) === alias(ev.awayTeamName) && r.name !== homeRow.name) ?? null;
    }
    const sameLogo = Boolean(homeRow?.logo && awayRow?.logo && homeRow.logo === awayRow.logo);
    const homePole = poleOf(homeRow, table.length);
    const awayPole = poleOf(awayRow, table.length);

    const league = ev.sport?.category?.tournament?.name ?? ev.sport?.category?.name ?? "Football";
    const base = {
      id: ev.eventId,
      gameId: ev.gameId ?? null,
      league,
      category: ev.sport?.category?.name ?? "",
      kickoff: new Date(start).toISOString(),
      home: ev.homeTeamName,
      away: ev.awayTeamName,
      homeLogo: sameLogo ? null : (homeRow?.logo ?? ev.homeTeamIcon ?? null),
      awayLogo: sameLogo ? null : (awayRow?.logo ?? ev.awayTeamIcon ?? null),
      favorite:
        fav.side === "home"
          ? ev.homeTeamName
          : fav.side === "away"
            ? ev.awayTeamName
            : ev.homeTeamName,
      favoriteSide: fav.side,
      favoriteOdds: fav.odds,
      homeOdds: fav.home,
      awayOdds: fav.away,
      drawOdds: fav.draw,
      table: {
        size: table.length,
        home: homeRow ? { rank: homeRow.rank, pole: homePole, pts: homeRow.pts, gp: homeRow.gp } : null,
        away: awayRow ? { rank: awayRow.rank, pole: awayPole, pts: awayRow.pts, gp: awayRow.gp } : null,
      },
    };

    // 2+ Yes @ 1.19–1.40 + favorite's opponent averages under 1.2 PPG
    if (inBand(yes2price, TWO_YES) && fav.side) {
      const oppRow = fav.side === "home" ? awayRow : homeRow;
      const oppPpg = ppg(oppRow);
      if (oppPpg != null && oppPpg < OPP_PPG_MAX) {
        yes2.push({
          ...base,
          id: `${ev.eventId}-2yes`,
          market: "2+",
          pick: "Yes",
          label: "2+ Goals Streak · Yes",
          odds: yes2price,
          otherOdds: no2price,
          oppPpg: Math.round(oppPpg * 100) / 100,
        });
      }
    }

    // 3+ streak: (Yes + No) / 2 in 1.90–2.10 → Over 2.5 goals
    if (Number.isFinite(yes3) && Number.isFinite(no3price)) {
      const avg = (yes3 + no3price) / 2;
      if (inBand(avg, THREE_AVG)) {
        no3.push({
          ...base,
          id: `${ev.eventId}-o25`,
          market: "3+",
          pick: "Over",
          label: "Over 2.5 Goals",
          odds: Math.round(avg * 100) / 100,
          otherOdds: no3price,
          streakYes: yes3,
          streakNo: no3price,
        });
      }
    }
  }

  const sortBy = (a, b) => a.kickoff.localeCompare(b.kickoff) || a.odds - b.odds;
  yes2.sort(sortBy);
  no3.sort(sortBy);

  const payload = {
    date: new Date().toISOString().slice(0, 10),
    dateLabel: "SportyBet streaks",
    fetchedAt: new Date().toISOString(),
    source: "sportybet",
    filters: {
      twoYes: TWO_YES,
      threeAvg: THREE_AVG,
      opponentPpgMax: OPP_PPG_MAX,
      threeMarket: "over 2.5",
      twoRule: "2+ Yes 1.19–1.40; favorite opponent PPG < 1.2",
      threeRule: "(3+ Yes + 3+ No) / 2 in 1.90–2.10 → Over 2.5",
      horizonDays: HORIZON_DAYS,
    },
    scanned,
    withStreaks,
    counts: { twoYes: yes2.length, threeNo: no3.length },
    twoYes: yes2,
    threeNo: no3,
  };

  await writeFile(OUT, JSON.stringify(payload));
  console.log(
    `streaks scanned=${scanned} withMarkets=${withStreaks} 2yes=${yes2.length} 3no=${no3.length} -> ${OUT}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
