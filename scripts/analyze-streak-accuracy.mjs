#!/usr/bin/env node
/**
 * Last 21 days of finished ESPN games → 2+ and Over 2.5 hit rates.
 * The 2+ rule sample is favorite vs opponent under 1.2 PPG.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { addHit, emptyRate, finishRates, settleStreaks } from "./lib/streak-accuracy.mjs";
import { leagueAllows, OPP_PPG_MAX, scoringHeat } from "./lib/streak-rules.mjs";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "public/data/streak-accuracy.json");
const ESPN = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const ESPN_V2 = "https://site.web.api.espn.com/apis/v2/sports/soccer";
const DAYS = 21;
const OPP_MAX = OPP_PPG_MAX;

const LEAGUES = [
  ["eng.1", "Premier League"],
  ["eng.2", "Championship"],
  ["esp.1", "La Liga"],
  ["ita.1", "Serie A"],
  ["ger.1", "Bundesliga"],
  ["fra.1", "Ligue 1"],
  ["ned.1", "Eredivisie"],
  ["por.1", "Liga Portugal"],
  ["bel.1", "Pro League"],
  ["sco.1", "Premiership"],
  ["tur.1", "Super Lig"],
  ["usa.1", "MLS"],
  ["mex.1", "Liga MX"],
  ["bra.1", "Brasileirao"],
  ["arg.1", "Liga Profesional"],
  ["chn.1", "Chinese Super League"],
  ["swe.1", "Allsvenskan"],
  ["den.1", "Superliga"],
  ["sui.1", "Super League"],
  ["aut.1", "Austria Bundesliga"],
  ["gre.1", "Super League"],
  ["rsa.1", "Premiership"],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(18_000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function ymd(d) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function parseTable(json) {
  const entries = json?.children?.[0]?.standings?.entries ?? [];
  const rows = [];
  for (const e of entries) {
    const team = e.team ?? {};
    const stats = e.stats ?? [];
    const num = (name) => Number(stats.find((x) => x.name === name)?.value);
    const gp = num("gamesPlayed");
    const pts = num("points");
    const rank = num("rank");
    rows.push({
      id: String(team.id ?? ""),
      name: String(team.displayName ?? ""),
      rank: Number.isFinite(rank) ? rank : rows.length + 1,
      gp: Number.isFinite(gp) ? gp : 0,
      pts: Number.isFinite(pts) ? pts : 0,
      ppg: Number.isFinite(gp) && gp > 0 && Number.isFinite(pts) ? pts / gp : null,
    });
  }
  return rows;
}

function parseEvent(e, league, slug) {
  const comps = (e.competitions ?? [])[0];
  if (!comps) return null;
  const teams = comps.competitors ?? [];
  const home = teams.find((t) => t.homeAway === "home");
  const away = teams.find((t) => t.homeAway === "away");
  if (!home || !away) return null;
  const done = e.status?.type?.completed || e.status?.type?.name === "STATUS_FINAL";
  const hs = Number(home.score);
  const as = Number(away.score);
  if (!done || !Number.isFinite(hs) || !Number.isFinite(as)) return null;
  return {
    id: e.id,
    league,
    slug,
    start: e.date,
    homeId: String(home.team?.id ?? ""),
    awayId: String(away.team?.id ?? ""),
    home: home.team?.displayName,
    away: away.team?.displayName,
    hs,
    as,
  };
}

function favoriteSide(homeRow, awayRow) {
  if (!homeRow || !awayRow) return null;
  if (homeRow.rank === awayRow.rank) return null;
  return homeRow.rank < awayRow.rank ? "home" : "away";
}

export async function buildStreakAccuracy() {
  const now = Date.now();
  const end = new Date(now);
  const start = new Date(now - DAYS * 86_400_000);
  const range = `${ymd(start)}-${ymd(end)}`;

  const twoPlus = emptyRate();
  const twoPlusClear = emptyRate();
  const over25 = emptyRate();
  const rule2 = emptyRate();
  const ruleOver = emptyRate();
  const leagues = {};

  for (const [slug, league] of LEAGUES) {
    const [board, tableJson] = await Promise.all([
      fetchJson(`${ESPN}/${slug}/scoreboard?dates=${range}&limit=300`),
      fetchJson(`${ESPN_V2}/${slug}/standings`),
    ]);
    const table = parseTable(tableJson);
    const byId = new Map(table.map((r) => [r.id, r]));
    const events = (board?.events ?? []).map((e) => parseEvent(e, league, slug)).filter(Boolean);
    const row = {
      league,
      twoPlus: emptyRate(),
      over25: emptyRate(),
      rule2: emptyRate(),
      ruleOver: emptyRate(),
    };
    const totals = [];
    for (const ev of events) {
      const settled = settleStreaks(ev.hs, ev.as);
      if (!settled) continue;
      totals.push(settled.total);
      addHit(twoPlus, settled.twoPlus);
      addHit(twoPlusClear, settled.twoPlusClear);
      addHit(over25, settled.over25);
      addHit(row.twoPlus, settled.twoPlus);
      addHit(row.over25, settled.over25);

      const homeRow = byId.get(ev.homeId);
      const awayRow = byId.get(ev.awayId);
      const fav = favoriteSide(homeRow, awayRow);
      if (fav) {
        const opp = fav === "home" ? awayRow : homeRow;
        if (opp?.ppg != null && opp.ppg < OPP_MAX) {
          addHit(rule2, settled.twoPlus);
          addHit(ruleOver, settled.over25);
          addHit(row.rule2, settled.twoPlus);
          addHit(row.ruleOver, settled.over25);
        }
      }
    }
    const n = totals.length;
    const gpg = n ? totals.reduce((s, x) => s + x, 0) / n : 0;
    const variance = n ? totals.reduce((s, x) => s + (x - gpg) ** 2, 0) / n : 0;
    const stdev = Math.sqrt(variance);
    const profile = {
      slug,
      name: league,
      n,
      gpg: Math.round(gpg * 100) / 100,
      stdev: Math.round(stdev * 100) / 100,
      cv: gpg ? Math.round((stdev / gpg) * 100) / 100 : 0,
      twoPlus: finishRates(row.twoPlus),
      over25: finishRates(row.over25),
      rule2: finishRates(row.rule2),
      ruleOver: finishRates(row.ruleOver),
    };
    profile.heat = scoringHeat(profile);
    profile.allow2 = leagueAllows(profile, "2+");
    profile.allowOver = leagueAllows(profile, "3+");
    leagues[league] = profile;
    await sleep(40);
  }

  const leagueList = Object.entries(leagues)
    .map(([name, v]) => ({ name, ...v }))
    .filter((r) => r.n >= 4)
    .sort((a, b) => (b.rule2?.rate ?? 0) - (a.rule2?.rate ?? 0) || (b.twoPlus?.rate ?? 0) - (a.twoPlus?.rate ?? 0));

  return {
    fetchedAt: new Date().toISOString(),
    windowDays: DAYS,
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
    opponentPpgMax: OPP_MAX,
    sample: twoPlus.n,
    twoPlus: finishRates(twoPlus),
    twoPlusClear: finishRates(twoPlusClear),
    over25: finishRates(over25),
    rule2: finishRates(rule2),
    ruleOver: finishRates(ruleOver),
    leagues: leagueList,
  };
}

const asMain = process.argv[1]?.includes("analyze-streak-accuracy");
if (asMain) {
  const payload = await buildStreakAccuracy();
  writeFileSync(OUT, JSON.stringify(payload));
  console.log(
    `accuracy n=${payload.sample} 2+=${(payload.twoPlus.rate * 100).toFixed(0)}% rule2=${(payload.rule2.rate * 100).toFixed(0)}% o25=${(payload.over25.rate * 100).toFixed(0)}% ruleO=${(payload.ruleOver.rate * 100).toFixed(0)}% -> ${OUT}`,
  );
}
