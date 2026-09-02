/**
 * Direct SportyBet factsCenter client used by board refresh scripts.
 * Markets: 1 = 1X2, 60010 = 2+ goals in a row, 60020 = 3+ goals in a row.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const SB_ORIGIN = "https://www.sportybet.com";
export const SB_SPORT_FOOTBALL = "sr:sport:1";
export const SB_REGIONS = ["ng", "gh", "ke", "zm"];
let sbRegion = SB_REGIONS[0];
export function sbBase() {
  return `${SB_ORIGIN}/api/${sbRegion}/factsCenter`;
}
/** @deprecated use sbBase() — kept so older scripts keep compiling. */
export const SB_BASE = `${SB_ORIGIN}/api/ng/factsCenter`;

/** SportyBet market IDs we care about. */
export const SB_MARKETS = {
  oneXTwo: 1,
  doubleChance: 10,
  drawNoBet: 11,
  overUnder: 18,
  homeOu: 19,
  awayOu: 20,
  btts: 29,
  twoPlusStreak: 60010,
  threePlusStreak: 60020,
  ouGg: 36,
  drawOrOver: 856,
};

function headers() {
  return {
    "User-Agent": UA,
    Accept: "application/json",
    Origin: SB_ORIGIN,
    Referer: `${SB_ORIGIN}/${sbRegion}/sport/football`,
  };
}

function regionalize(url) {
  return url.replace(/\/api\/[a-z]{2}\/factsCenter/, `/api/${sbRegion}/factsCenter`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Low-level JSON GET with retries for 403/429/5xx and empty bodies.
 * 403 on ng fails over to gh/ke/zm — same football book, different edge.
 */
export async function sbFetchJson(url, { retries = 4, timeoutMs = 22_000 } = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const target = regionalize(url);
    try {
      const res = await fetch(target, {
        headers: headers(),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 403) {
        lastErr = new Error(`SportyBet HTTP 403`);
        const idx = SB_REGIONS.indexOf(sbRegion);
        if (idx < SB_REGIONS.length - 1) {
          sbRegion = SB_REGIONS[idx + 1];
          console.warn(`[sportybet] 403 — switching to ${sbRegion}`);
          continue;
        }
        await sleep(400 * (attempt + 1) ** 2);
        continue;
      }
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`SportyBet HTTP ${res.status}`);
        await sleep(400 * (attempt + 1) ** 2);
        continue;
      }
      if (!res.ok) {
        lastErr = new Error(`SportyBet HTTP ${res.status}`);
        break;
      }
      return await res.json();
    } catch (err) {
      lastErr = err;
      await sleep(350 * (attempt + 1) ** 2);
    }
  }
  throw lastErr ?? new Error("SportyBet fetch failed");
}

/**
 * SportyBet splits the book:
 *   today  → pcUpcomingEvents?todayGames=true  (Today tab)
 *   early  → pcUpcomingEvents                  (Upcoming tab, skips today)
 * Without todayGames the scan only sees later days.
 */
export function upcomingEventsUrl(
  marketId,
  { pageSize = 80, pageNum = 1, todayGames = false, sportId = SB_SPORT_FOOTBALL } = {},
) {
  let url =
    `${sbBase()}/pcUpcomingEvents` +
    `?sportId=${encodeURIComponent(sportId)}` +
    `&marketId=${marketId}&pageSize=${pageSize}&pageNum=${pageNum}`;
  if (todayGames) url += "&todayGames=true";
  return url;
}

async function pullMarketPages(
  marketId,
  { pageSize = 80, maxPages = 25, todayGames = false } = {},
) {
  const byId = new Map();
  let page = 1;
  let total = Infinity;
  while ((page - 1) * pageSize < total && page <= maxPages) {
    const url = upcomingEventsUrl(marketId, { pageSize, pageNum: page, todayGames });
    let json;
    try {
      json = await sbFetchJson(url);
    } catch (err) {
      console.warn(
        `[sportybet] market ${marketId} ${todayGames ? "today" : "upcoming"} page ${page}:`,
        err.message || err,
      );
      break;
    }
    const data = json?.data;
    if (!data) break;
    total = Number(data.totalNum ?? 0);
    const tours = data.tournaments ?? [];
    if (!tours.length) break;
    for (const tour of tours) {
      for (const ev of tour.events ?? []) {
        if (ev?.eventId) byId.set(ev.eventId, ev);
      }
    }
    page += 1;
    await sleep(70);
  }
  return byId;
}

function mergeEventMaps(primary, extra) {
  for (const [id, ev] of extra) {
    if (!primary.has(id)) primary.set(id, ev);
  }
  return primary;
}

/**
 * Pull football events that list a given market.
 * Defaults to Today + Upcoming so today's SportyBet card is never skipped.
 * Returns Map<eventId, event>.
 */
export async function pullMarket(
  marketId,
  { pageSize = 80, maxPages = 25, includeToday = true, todayGames = null } = {},
) {
  if (todayGames === true) {
    return pullMarketPages(marketId, { pageSize, maxPages, todayGames: true });
  }
  if (todayGames === false || includeToday === false) {
    return pullMarketPages(marketId, { pageSize, maxPages, todayGames: false });
  }
  const today = await pullMarketPages(marketId, { pageSize, maxPages, todayGames: true });
  const rest = await pullMarketPages(marketId, { pageSize, maxPages, todayGames: false });
  return mergeEventMaps(today, rest);
}

/** First market row on an event (SportyBet returns the requested market as [0]). */
export function marketRow(ev) {
  return (ev?.markets ?? [])[0] ?? null;
}

/** Outcome price by description (yes/no/home/draw/away). */
export function outcomeOdds(market, desc) {
  const want = String(desc).toLowerCase();
  const row = (market?.outcomes ?? []).find((o) => String(o.desc).toLowerCase() === want);
  const n = Number(row?.odds);
  return Number.isFinite(n) ? n : null;
}

export function marketsOf(ev) {
  return ev?.markets ?? [];
}

export function ouLines(ev) {
  const lines = {};
  for (const m of marketsOf(ev)) {
    if (String(m.id) !== "18" && String(m.name || "").toLowerCase() !== "over/under") continue;
    const spec = String(m.specifier ?? "");
    const line = Number((spec.match(/total=([\d.]+)/) || [])[1]);
    if (!Number.isFinite(line)) continue;
    const over = (m.outcomes ?? []).find((o) => /^over/i.test(o.desc));
    const under = (m.outcomes ?? []).find((o) => /^under/i.test(o.desc));
    lines[String(line)] = {
      over: Number.isFinite(Number(over?.odds)) ? Number(over.odds) : null,
      under: Number.isFinite(Number(under?.odds)) ? Number(under.odds) : null,
    };
  }
  return lines;
}

function packOuLine(m) {
  const spec = String(m.specifier ?? "");
  const line = Number((spec.match(/total=([\d.]+)/) || [])[1]);
  if (!Number.isFinite(line)) return null;
  const over = (m.outcomes ?? []).find((o) => /^over/i.test(String(o.desc)));
  const under = (m.outcomes ?? []).find((o) => /^under/i.test(String(o.desc)));
  return {
    line,
    over: Number.isFinite(Number(over?.odds)) ? Number(over.odds) : null,
    under: Number.isFinite(Number(under?.odds)) ? Number(under.odds) : null,
  };
}

/** Home (19) / Away (20) team-total lines keyed by total, e.g. {"2.5": {over, under}}. */
export function teamOuLines(ev, side) {
  const want = side === "away" ? "20" : "19";
  const lines = {};
  for (const m of marketsOf(ev)) {
    if (String(m.id) !== want) continue;
    const packed = packOuLine(m);
    if (!packed) continue;
    lines[String(packed.line)] = { over: packed.over, under: packed.under };
  }
  return lines;
}

function findMarket(ev, id, specRe) {
  return (ev?.markets ?? []).find((m) => {
    if (String(m.id) !== String(id)) return false;
    if (!specRe) return true;
    return specRe.test(String(m.specifier ?? ""));
  });
}

function outcomeByDesc(market, re) {
  const row = (market?.outcomes ?? []).find((o) => re.test(String(o.desc ?? "")));
  const n = Number(row?.odds);
  return Number.isFinite(n) ? n : null;
}

/** GG2+ is Over 2.5 & GG Yes on market 36. */
export function gg2plusOdds(ev) {
  const m = findMarket(ev, SB_MARKETS.ouGg, /total=2\.5/);
  return outcomeByDesc(m, /over\s*2\.5\s*&\s*yes/i);
}

/** Draw or Over 2.5 Yes on market 856. */
export function drawOrOverOdds(ev, line = 2.5) {
  const re = new RegExp(`total=${String(line).replace(".", "\\.")}`);
  const m = findMarket(ev, SB_MARKETS.drawOrOver, re);
  return outcomeByDesc(m, /^yes$/i);
}

export async function pullBoardBooks({ pageSize = 80, maxPages = 8 } = {}) {
  const [one, dc, dnb, ou, btts] = await Promise.all([
    pullMarket(SB_MARKETS.oneXTwo, { pageSize, maxPages }),
    pullMarket(SB_MARKETS.doubleChance, { pageSize, maxPages }),
    pullMarket(SB_MARKETS.drawNoBet, { pageSize, maxPages }),
    pullMarket(SB_MARKETS.overUnder, { pageSize, maxPages }),
    pullMarket(SB_MARKETS.btts, { pageSize, maxPages }),
  ]);
  const ids = new Set([...one.keys(), ...dc.keys(), ...dnb.keys(), ...ou.keys(), ...btts.keys()]);
  const events = [];
  for (const id of ids) {
    const ev = one.get(id) ?? dc.get(id) ?? dnb.get(id) ?? ou.get(id) ?? btts.get(id);
    if (!ev) continue;
    events.push({
      id,
      ev,
      home: ev.homeTeamName,
      away: ev.awayTeamName,
      one: marketRow(one.get(id)),
      dc: marketRow(dc.get(id)),
      dnb: marketRow(dnb.get(id)),
      ou: ou.get(id) ?? ev,
      btts: marketRow(btts.get(id)),
    });
  }
  return {
    events,
    counts: { one: one.size, dc: dc.size, dnb: dnb.size, ou: ou.size, btts: btts.size },
  };
}

/** 1X2 + DNB + O/U + BTTS + home/away team totals + GG2+ + Draw or Over 2.5. */
export async function pullScanBooks({ pageSize = 80, maxPages = 16 } = {}) {
  const [one, dnb, ou, homeOu, awayOu, btts, ouGg, drawOrOver] = await Promise.all([
    pullMarket(SB_MARKETS.oneXTwo, { pageSize, maxPages }),
    pullMarket(SB_MARKETS.drawNoBet, { pageSize, maxPages }),
    pullMarket(SB_MARKETS.overUnder, { pageSize, maxPages }),
    pullMarket(SB_MARKETS.homeOu, { pageSize, maxPages }),
    pullMarket(SB_MARKETS.awayOu, { pageSize, maxPages }),
    pullMarket(SB_MARKETS.btts, { pageSize, maxPages }),
    pullMarket(SB_MARKETS.ouGg, { pageSize, maxPages }),
    pullMarket(SB_MARKETS.drawOrOver, { pageSize, maxPages }),
  ]);
  const ids = new Set([
    ...one.keys(),
    ...dnb.keys(),
    ...ou.keys(),
    ...homeOu.keys(),
    ...awayOu.keys(),
    ...btts.keys(),
    ...ouGg.keys(),
    ...drawOrOver.keys(),
  ]);
  const events = [];
  for (const id of ids) {
    const ev =
      one.get(id) ??
      dnb.get(id) ??
      ou.get(id) ??
      homeOu.get(id) ??
      awayOu.get(id) ??
      btts.get(id) ??
      ouGg.get(id) ??
      drawOrOver.get(id);
    if (!ev) continue;
    events.push({
      id,
      ev,
      home: ev.homeTeamName,
      away: ev.awayTeamName,
      one: marketRow(one.get(id)),
      dnb: marketRow(dnb.get(id)),
      ou: ouLines(ou.get(id) ?? ev),
      homeOu: teamOuLines(homeOu.get(id) ?? ev, "home"),
      awayOu: teamOuLines(awayOu.get(id) ?? ev, "away"),
      btts: marketRow(btts.get(id)),
      gg2plus: gg2plusOdds(ouGg.get(id) ?? ev),
      drawOrOver25: drawOrOverOdds(drawOrOver.get(id) ?? ev),
    });
  }
  return {
    events,
    counts: {
      one: one.size,
      dnb: dnb.size,
      ou: ou.size,
      homeOu: homeOu.size,
      awayOu: awayOu.size,
      btts: btts.size,
      ouGg: ouGg.size,
      drawOrOver: drawOrOver.size,
    },
  };
}

/**
 * Merge 1X2 + streak markets by eventId.
 * @param {Map} one
 * @param {Map} two
 * @param {Map} three
 */
export function mergeEvents(one, two, three) {
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
    });
  }
  return out;
}

/** Pull 1X2 + 2+ + 3+ streak books in parallel. */
export async function pullStreakBooks() {
  const [one, two, three] = await Promise.all([
    pullMarket(SB_MARKETS.oneXTwo),
    pullMarket(SB_MARKETS.twoPlusStreak),
    pullMarket(SB_MARKETS.threePlusStreak),
  ]);
  return {
    one,
    two,
    three,
    merged: mergeEvents(one, two, three),
    counts: { one: one.size, two: two.size, three: three.size },
  };
}

export function eventStartMs(ev) {
  const n = Number(ev?.estimateStartTime ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function eventLeagueKey(ev) {
  const cat = ev?.sport?.category?.name ?? "";
  const tour = ev?.sport?.category?.tournament?.name ?? ev?.sport?.tournament?.name ?? "";
  return `${cat} ${tour}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
