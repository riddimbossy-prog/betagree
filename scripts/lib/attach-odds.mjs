import { nameScore } from "./desks.mjs";
import { outcomeOdds, ouLines, pullBoardBooks } from "./sportybet.mjs";

function toDec(american) {
  if (american == null) return null;
  const n = typeof american === "number" ? american : Number(String(american).replace("+", "").trim());
  if (!Number.isFinite(n) || n === 0) return null;
  return n > 0 ? n / 100 + 1 : 100 / Math.abs(n) + 1;
}

function implied(dec) {
  return dec && dec > 1 ? 1 / dec : 0;
}

function fromEspn(fixture) {
  const homeWin = toDec(fixture.home?.ml);
  const draw = toDec(fixture.drawMl);
  const awayWin = toDec(fixture.away?.ml);
  const pH = implied(homeWin);
  const pD = implied(draw);
  const pA = implied(awayWin);
  const over = toDec(fixture.overOdds);
  const under = toDec(fixture.underOdds);
  const line = fixture.total != null ? String(fixture.total) : null;
  return {
    fixtureId: fixture.id,
    league: fixture.league,
    source: "espn",
    homeWin,
    draw,
    awayWin,
    dnbHome: pH && pA ? 1 / (pH / (pH + pA)) : null,
    dnbAway: pH && pA ? 1 / (pA / (pH + pA)) : null,
    dc1x: pH && pD ? 1 / (pH + pD) : null,
    dc12: pH && pA ? 1 / (pH + pA) : null,
    dcx2: pD && pA ? 1 / (pD + pA) : null,
    ou: line && (over || under) ? { [line]: { over, under } } : {},
    bttsYes: null,
    bttsNo: null,
  };
}

function dcOdds(market, key) {
  const map = {
    "1X": ["home or draw", "1x"],
    "12": ["home or away", "12"],
    X2: ["draw or away", "x2"],
  };
  for (const desc of map[key] ?? []) {
    const n = outcomeOdds(market, desc);
    if (n) return n;
  }
  return null;
}

function packEvent(row) {
  return {
    eventId: row.id,
    home: row.home,
    away: row.away,
    source: "sportybet",
    homeWin: outcomeOdds(row.one, "home"),
    draw: outcomeOdds(row.one, "draw"),
    awayWin: outcomeOdds(row.one, "away"),
    dnbHome: outcomeOdds(row.dnb, "home"),
    dnbAway: outcomeOdds(row.dnb, "away"),
    dc1x: dcOdds(row.dc, "1X"),
    dc12: dcOdds(row.dc, "12"),
    dcx2: dcOdds(row.dc, "X2"),
    ou: ouLines(row.ou),
    bttsYes: outcomeOdds(row.btts, "yes"),
    bttsNo: outcomeOdds(row.btts, "no"),
  };
}

function matchFixture(fixtures, ev) {
  let best = null;
  let score = 0;
  for (const f of fixtures || []) {
    const hh = nameScore(f.home?.name, ev.home);
    const aa = nameScore(f.away?.name, ev.away);
    const ha = nameScore(f.home?.name, ev.away);
    const ah = nameScore(f.away?.name, ev.home);
    const s = Math.max(Math.min(hh, aa), Math.min(ha, ah));
    if (s > score && s >= 0.68) {
      best = f;
      score = s;
    }
  }
  return best;
}

function mergeBook(base, live) {
  const ou = { ...(base.ou ?? {}), ...(live.ou ?? {}) };
  return {
    ...base,
    ...Object.fromEntries(Object.entries(live).filter(([, v]) => v != null && v !== "")),
    ou,
    source: live.homeWin || live.eventId ? "sportybet" : base.source,
  };
}

export async function buildOddsBook(fixtures) {
  const byFixture = {};
  for (const f of fixtures || []) byFixture[f.id] = fromEspn(f);
  let matched = 0;
  let events = 0;
  let counts = { one: 0, dc: 0, dnb: 0, ou: 0, btts: 0 };
  try {
    const books = await pullBoardBooks({ pageSize: 80, maxPages: 10 });
    events = books.events.length;
    counts = books.counts;
    for (const row of books.events) {
      const pack = packEvent(row);
      const fixture = matchFixture(fixtures, pack);
      if (!fixture) continue;
      byFixture[fixture.id] = mergeBook(byFixture[fixture.id] ?? fromEspn(fixture), pack);
      matched += 1;
    }
  } catch (err) {
    console.warn("sportybet odds overlay failed", err.message || err);
  }
  return {
    fetchedAt: new Date().toISOString(),
    source: matched ? "sportybet+espn" : "espn",
    matched,
    events,
    counts,
    byFixture,
  };
}
