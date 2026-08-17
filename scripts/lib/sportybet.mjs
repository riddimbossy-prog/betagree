/**
 * Direct SportyBet factsCenter client used by board refresh scripts.
 * Markets: 1 = 1X2, 60010 = 2+ goals in a row, 60020 = 3+ goals in a row.
 */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const SB_BASE = "https://www.sportybet.com/api/ng/factsCenter";
export const SB_ORIGIN = "https://www.sportybet.com";
export const SB_SPORT_FOOTBALL = "sr:sport:1";

/** SportyBet market IDs we care about. */
export const SB_MARKETS = {
  oneXTwo: 1,
  twoPlusStreak: 60010,
  threePlusStreak: 60020,
};

const DEFAULT_HEADERS = {
  "User-Agent": UA,
  Accept: "application/json",
  Origin: SB_ORIGIN,
  Referer: `${SB_ORIGIN}/ng/sport/football`,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Low-level JSON GET with retries for 403/429/5xx and empty bodies.
 */
export async function sbFetchJson(url, { retries = 4, timeoutMs = 22_000 } = {}) {
  let lastErr = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: DEFAULT_HEADERS,
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.status === 403 || res.status === 429 || res.status >= 500) {
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
 * Pull every upcoming football event that lists a given market.
 * Returns Map<eventId, event>.
 */
export async function pullMarket(marketId, { pageSize = 80, maxPages = 25 } = {}) {
  const byId = new Map();
  let page = 1;
  let total = Infinity;
  while ((page - 1) * pageSize < total && page <= maxPages) {
    const url =
      `${SB_BASE}/pcUpcomingEvents` +
      `?sportId=${encodeURIComponent(SB_SPORT_FOOTBALL)}` +
      `&marketId=${marketId}&pageSize=${pageSize}&pageNum=${page}`;
    let json;
    try {
      json = await sbFetchJson(url);
    } catch (err) {
      console.warn(`[sportybet] market ${marketId} page ${page}:`, err.message || err);
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

/** First market row on an event (SportyBet returns the requested market as [0]). */
export function marketRow(ev) {
  return (ev?.markets ?? [])[0] ?? null;
}

/** Outcome price by description (yes/no/home/draw/away). */
export function outcomeOdds(market, desc) {
  const row = (market?.outcomes ?? []).find(
    (o) => String(o.desc).toLowerCase() === String(desc).toLowerCase(),
  );
  const n = Number(row?.odds);
  return Number.isFinite(n) ? n : null;
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
