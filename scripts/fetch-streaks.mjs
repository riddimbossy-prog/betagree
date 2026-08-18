#!/usr/bin/env node
/**
 * Pull SportyBet 2+ / 3+ Goals Streak prices, join league tables,
 * and keep only matches that clear the user's bands:
 *   2+ Yes  1.19–1.40  AND favorite's opponent PPG < 1.2
 *   3+      (Yes + No) / 2 in 1.90–2.10  → show Over 2.5 odds
 * Tomorrow's board is built tonight. Weekly top is ranked from this week.
 */
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { namesMatch as matchNames } from "./lib/names-match.mjs";
import { marketRow, outcomeOdds, pullMarket, SB_MARKETS } from "./lib/sportybet.mjs";
import {
  dayBucket,
  findLeagueProfile,
  inBand,
  isSeniorName,
  leagueAllows,
  OPP_PPG_MAX,
  rankWeekly,
  scoringHeat,
  THREE_AVG,
  TWO_YES,
  weekKey,
} from "./lib/streak-rules.mjs";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "public/data/streaks.json");
const ESPN = "https://site.web.api.espn.com/apis/v2/sports/soccer";
const HORIZON_DAYS = 8;

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
  ["rus.1", ["russia premier league"]],
  ["jpn.1", ["japan j1 league"]],
  ["kor.1", ["korea k league"]],
  ["aus.1", ["australia a-league"]],
  ["sau.1", ["saudi professional league", "saudi pro league"]],
  ["uae.1", ["uae pro league"]],
  ["egy.1", ["egypt premier league"]],
  ["rsa.1", ["south africa premiership"]],
  ["bol.1", ["bolivia liga", "copa bolivia", "division profesional"]],
  ["blr.1", ["belarus vysshaya", "belarus premier"]],
  ["svk.1", ["slovakia super liga"]],
  ["fin.1", ["finland veikkausliiga"]],
  ["isl.1", ["iceland besta"]],
  ["per.1", ["peru liga 1"]],
  ["qat.1", ["qatar stars"]],
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

function namesMatch(a, b) {
  return matchNames(a, b);
}

function outcome(market, desc) {
  return outcomeOdds(market, desc);
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

function over25(ev) {
  if (!ev) return null;
  for (const m of ev.markets ?? []) {
    const spec = String(m.specifier ?? "");
    const line = Number((spec.match(/total=([\d.]+)/) || [])[1]);
    if (line !== 2.5) continue;
    const over = (m.outcomes ?? []).find((o) => /^over/i.test(String(o.desc)));
    const n = Number(over?.odds);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(18_000) });
  if (!res.ok) return null;
  return res.json();
}

function isSenior(ev) {
  return isSeniorName(
    ev?.sport?.category?.name,
    ev?.sport?.category?.tournament?.name,
    ev?.homeTeamName,
    ev?.awayTeamName,
  );
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

function mergeEvents(one, two, three, ou) {
  const ids = new Set([...one.keys(), ...two.keys(), ...three.keys()]);
  const out = [];
  for (const id of ids) {
    const a = one.get(id) ?? two.get(id) ?? three.get(id);
    if (!a) continue;
    out.push({
      ev: a,
      one: marketRow(one.get(id)),
      two: marketRow(two.get(id)),
      three: marketRow(three.get(id)),
      ou: ou.get(id) ?? null,
    });
  }
  return out;
}

function loadProfiles() {
  try {
    const file = JSON.parse(readFileSync(join(ROOT, "public/data/streak-accuracy.json"), "utf8"));
    return file.leagues ?? [];
  } catch {
    return [];
  }
}

export async function buildStreaks() {
  const profiles = loadProfiles();
  const now = Date.now();
  const until = now + HORIZON_DAYS * 86_400_000;

  const [one, two, three, ou] = await Promise.all([
    pullMarket(SB_MARKETS.oneXTwo, { maxPages: 16 }),
    pullMarket(SB_MARKETS.twoPlusStreak, { maxPages: 28 }),
    pullMarket(SB_MARKETS.threePlusStreak, { maxPages: 28 }),
    pullMarket(SB_MARKETS.overUnder, { maxPages: 16 }),
  ]);
  const merged = mergeEvents(one, two, three, ou);

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
    await sleep(50);
  }

  const yes2 = [];
  const no3 = [];
  let scanned = 0;
  let withStreaks = 0;
  let droppedYouth = 0;
  let droppedLeague = 0;

  for (const row of merged) {
    const ev = row.ev;
    const start = Number(ev.estimateStartTime ?? 0);
    if (!start || start < now - 30 * 60_000 || start > until) continue;
    if (!isSenior(ev)) {
      droppedYouth += 1;
      continue;
    }
    scanned += 1;
    const fav = favFrom1x2(row.one);
    const yes2price = outcome(row.two, "yes");
    const no2price = outcome(row.two, "no");
    const yes3 = outcome(row.three, "yes");
    const no3price = outcome(row.three, "no");
    const o25 = over25(row.ou);
    if (yes2price != null || yes3 != null || no3price != null) withStreaks += 1;

    const slug = mapSlug(leagueKey(ev));
    const profile = findLeagueProfile(profiles, { slug, league: ev.sport?.category?.tournament?.name });
    const heat = scoringHeat(profile);
    const table = slug ? tables.get(slug) ?? [] : [];
    const homeRow = table.length ? findRow(table, ev.homeTeamName) : null;
    let awayRow = table.length ? findRow(table, ev.awayTeamName) : null;
    if (homeRow && awayRow && homeRow.name === awayRow.name) {
      awayRow = table.find((r) => r.name !== homeRow.name && namesMatch(r.name, ev.awayTeamName)) ?? null;
    }
    const sameLogo = Boolean(homeRow?.logo && awayRow?.logo && homeRow.logo === awayRow.logo);
    const homeLogo = sameLogo ? null : ev.homeTeamIcon || homeRow?.logo || null;
    const awayLogo = sameLogo ? null : ev.awayTeamIcon || awayRow?.logo || null;
    const league = ev.sport?.category?.tournament?.name ?? ev.sport?.category?.name ?? "Football";
    const kickoff = new Date(start).toISOString();
    const when = dayBucket(kickoff, now);
    const base = {
      id: ev.eventId,
      gameId: ev.gameId ?? null,
      league,
      category: ev.sport?.category?.name ?? "",
      kickoff,
      when,
      home: ev.homeTeamName,
      away: ev.awayTeamName,
      homeLogo,
      awayLogo,
      leagueSlug: slug,
      scoring: profile
        ? { heat, gpg: profile.gpg, stdev: profile.stdev, over25: profile.over25?.rate, twoPlus: profile.twoPlus?.rate }
        : null,
      favoriteSide: fav.side,
      favoriteOdds: fav.odds,
      homeOdds: fav.home,
      awayOdds: fav.away,
      drawOdds: fav.draw,
      table: {
        size: table.length,
        home: homeRow ? { rank: homeRow.rank, pole: poleOf(homeRow, table.length), pts: homeRow.pts, gp: homeRow.gp } : null,
        away: awayRow ? { rank: awayRow.rank, pole: poleOf(awayRow, table.length), pts: awayRow.pts, gp: awayRow.gp } : null,
      },
    };

    if (inBand(yes2price, TWO_YES) && fav.side && table.length >= 6) {
      const oppRow = fav.side === "home" ? awayRow : homeRow;
      const oppPpg = ppg(oppRow);
      if (oppPpg != null && oppPpg < OPP_PPG_MAX) {
        if (!leagueAllows(profile, "2+")) droppedLeague += 1;
        else {
          yes2.push({
            ...base,
            id: `${ev.eventId}-2yes`,
            market: "2+",
            pick: "Yes",
            label: "2+ Yes",
            odds: yes2price,
            otherOdds: no2price,
            oppPpg: Math.round(oppPpg * 100) / 100,
          });
        }
      }
    }

    if (Number.isFinite(yes3) && Number.isFinite(no3price) && o25 != null) {
      const avg = (yes3 + no3price) / 2;
      if (inBand(avg, THREE_AVG)) {
        if (!leagueAllows(profile, "3+")) droppedLeague += 1;
        else {
          no3.push({
            ...base,
            id: `${ev.eventId}-o25`,
            market: "3+",
            pick: "Over",
            label: "Over 2.5",
            odds: o25,
            otherOdds: null,
            streakYes: yes3,
            streakNo: no3price,
          });
        }
      }
    }
  }

  const sortBy = (a, b) => a.kickoff.localeCompare(b.kickoff) || a.odds - b.odds;
  yes2.sort(sortBy);
  no3.sort(sortBy);
  const all = [...yes2, ...no3];
  const weekly = rankWeekly(all, 10, profiles);
  const todayN = all.filter((p) => p.when === "today").length;
  const tomorrowN = all.filter((p) => p.when === "tomorrow").length;

  return {
    date: new Date(now).toISOString().slice(0, 10),
    dateLabel: "SportyBet streaks",
    fetchedAt: new Date().toISOString(),
    source: "sportybet",
    weekOf: weekKey(now),
    readyFor: tomorrowN ? "tomorrow" : todayN ? "today" : "later",
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
    droppedYouth,
    droppedLeague,
    books: { one: one.size, two: two.size, three: three.size, ou: ou.size },
    counts: {
      twoYes: yes2.length,
      threeNo: no3.length,
      today: todayN,
      tomorrow: tomorrowN,
      weekly: weekly.length,
    },
    twoYes: yes2,
    threeNo: no3,
    weekly,
  };
}

const asMain = process.argv[1] && process.argv[1].endsWith("fetch-streaks.mjs");
if (asMain) {
  const payload = await buildStreaks();
  await writeFile(OUT, JSON.stringify(payload));
  console.log(
    `streaks scanned=${payload.scanned} 2yes=${payload.counts.twoYes} o25=${payload.counts.threeNo} today=${payload.counts.today} tomorrow=${payload.counts.tomorrow} weekly=${payload.counts.weekly} -> ${OUT}`,
  );
}
