import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFormBoard, buildTrends } from "./lib/desks.mjs";
import { assembleSlate, gradeLedger } from "./lib/tip-sites.mjs";

const LEAGUES = [
  ["eng.1", "Premier League"],
  ["eng.2", "Championship"],
  ["eng.3", "League One"],
  ["eng.4", "League Two"],
  ["esp.1", "La Liga"],
  ["esp.2", "La Liga 2"],
  ["ita.1", "Serie A"],
  ["ita.2", "Serie B"],
  ["ger.1", "Bundesliga"],
  ["ger.2", "2. Bundesliga"],
  ["fra.1", "Ligue 1"],
  ["fra.2", "Ligue 2"],
  ["ned.1", "Eredivisie"],
  ["ned.2", "Eerste Divisie"],
  ["por.1", "Primeira Liga"],
  ["bel.1", "Belgian Pro League"],
  ["sco.1", "Scottish Premiership"],
  ["tur.1", "Süper Lig"],
  ["usa.1", "MLS"],
  ["mex.1", "Liga MX"],
  ["bra.1", "Brasileirão"],
  ["bra.2", "Série B"],
  ["arg.1", "Liga Profesional"],
  ["arg.2", "Primera Nacional"],
  ["swe.1", "Allsvenskan"],
  ["den.1", "Superliga"],
  ["col.1", "Liga BetPlay"],
  ["chi.1", "Chilean Primera"],
  ["ecu.1", "Liga Pro"],
  ["club.friendly", "Club Friendly"],
  ["uefa.champions", "Champions League"],
  ["uefa.europa", "Europa League"],
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

const todaySlate = assembleSlate(day, todayFix, history);
const tomorrowSlate = assembleSlate(tomorrow, tomFix, history);
const ledger = gradeLedger(history);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "public", "data");
mkdirSync(dir, { recursive: true });
writeJson(join(dir, "slate.json"), todaySlate);
writeJson(join(dir, `slate-${dayStr}.json`), todaySlate);
writeJson(join(dir, `slate-${tomStr}.json`), tomorrowSlate, { keepIfEmpty: true });
writeJson(join(dir, "ledger.json"), ledger);

let trends;
try {
  trends = await buildTrends({
    fixtures: todayFix,
    date: dayStr,
    dateLabel: todaySlate.dateLabel,
  });
  writeJson(join(dir, "trends.json"), trends);
} catch (err) {
  console.error("trends refresh failed", err);
  trends = { bankers: [], counts: {} };
}

let form;
try {
  form = await buildFormBoard({
    fixtures: [...todayFix, ...tomFix],
    date: dayStr,
    dateLabel: todaySlate.dateLabel,
  });
  const hasRows = Object.values(form.boards ?? {}).some((b) => (b.overall?.length ?? 0) > 0);
  if (hasRows) writeJson(join(dir, "form.json"), form);
  else console.log("kept form.json (empty pull)");
} catch (err) {
  console.error("form refresh failed", err);
  form = { playingToday: 0, boards: {} };
}

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
    trends: {
      bankers: trends.bankers?.length ?? 0,
      counts: trends.counts ?? {},
    },
    form: {
      playingToday: form.playingToday ?? 0,
      boards: Object.keys(form.boards ?? {}).length,
    },
    sites: todaySlate.desks?.length ?? 0,
  }),
);
console.log(
  `published ${dayStr} ${todayFix.length} fixtures / ${todaySlate.consensus.length} consensus / ${todaySlate.desks.length} sites; ${tomStr} ${tomFix.length} fixtures / ${tomorrowSlate.consensus.length} consensus; ledger ${history.length}; trends ${JSON.stringify(trends.counts ?? {})} bankers ${trends.bankers?.length ?? 0}; form ${form.playingToday ?? 0} playing`,
);
