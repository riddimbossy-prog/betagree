/** Flash: strict high-goal SportyBet routes. */

export const FLASH = Object.freeze({ over35Max: 2.0, favoriteRankMax: 4, drawOver25Min: 4.0, comboMax: 2.0 });

export const FLASH_COPY = `FLASH ENGINE V1

SportyBet markets only. Every route starts with both hard gates:
- Match Over 3.5 odds must be below 2.00.
- The 1X2 favourite must be ranked in the overall top 4.

ROUTES
1. If the draw price is over 4.00, choose Over 2.5.
2. If the teams occupy 1st and 2nd, replace route 1 with Draw or Over 2.5.
3. Independently, if favourite Win & BTTS No is below 2.00, choose the favourite to win.
4. Independently, if favourite Win & BTTS Yes is below 2.00, choose the favourite to score 2+.

Strict boundaries: Over 3.5 at 2.00, draw at 4.00 and combo odds at 2.00 do not qualify. Missing odds or standings fail closed.`;

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function base(row, rule, market, selection, label, price, reasons) {
  return {
    fixtureId: row.fixtureId,
    league: row.league,
    kickoff: row.kickoff,
    when: row.when ?? null,
    home: row.home,
    away: row.away,
    homeLogo: row.homeLogo || null,
    awayLogo: row.awayLogo || null,
    rule,
    market,
    selection,
    label,
    price: price ?? null,
    reasons,
    engine: "flash-v1",
  };
}

export function evaluateFlash(row) {
  const over35 = num(row?.ou?.["3.5"]?.over);
  if (over35 == null || over35 >= FLASH.over35Max) return [];

  const homeWin = num(row.homeWin);
  const awayWin = num(row.awayWin);
  if (homeWin == null || awayWin == null || homeWin === awayWin) return [];
  const favorite = homeWin < awayWin ? "home" : "away";
  const favoriteName = favorite === "home" ? row.home : row.away;
  const favoriteOdds = favorite === "home" ? homeWin : awayWin;
  const favoriteRank = num(favorite === "home" ? row.homeRank : row.awayRank);
  if (favoriteRank == null || favoriteRank > FLASH.favoriteRankMax) return [];

  const draw = num(row.draw);
  const homeRank = num(row.homeRank);
  const awayRank = num(row.awayRank);
  const topTwoClash = homeRank != null && awayRank != null && new Set([homeRank, awayRank]).size === 2 &&
    homeRank <= 2 && awayRank <= 2;
  const gates = [
    `SportyBet Over 3.5 ${over35} < ${FLASH.over35Max}`,
    `${favoriteName} is the 1X2 favourite and ranks ${favoriteRank}`,
  ];
  const picks = [];

  if (topTwoClash) {
    const price = num(row.drawOrOver25);
    if (price != null) picks.push(base(row, "FLASH_TOP2_DRAW_OVER25", "draw-or-over", "Yes", "Draw or over 2.5", price, [...gates, "1st vs 2nd override"]));
  } else if (draw != null && draw > FLASH.drawOver25Min) {
    const price = num(row?.ou?.["2.5"]?.over);
    if (price != null) picks.push(base(row, "FLASH_DRAW_OVER25", "total-goals", "Over 2.5", "Over 2.5", price, [...gates, `Draw ${draw} > ${FLASH.drawOver25Min}`]));
  }

  const winNo = num(favorite === "home" ? row.homeBttsNo : row.awayBttsNo);
  if (winNo != null && winNo < FLASH.comboMax) {
    picks.push(base(row, "FLASH_WIN_BTTS_NO", "match-winner", favorite === "home" ? "Home" : "Away", `${favoriteName} to win`, favoriteOdds, [...gates, `${favoriteName} win & BTTS No ${winNo} < ${FLASH.comboMax}`]));
  }

  const winYes = num(favorite === "home" ? row.homeBttsYes : row.awayBttsYes);
  if (winYes != null && winYes < FLASH.comboMax) {
    const price = num((favorite === "home" ? row.homeOu : row.awayOu)?.["1.5"]?.over);
    picks.push(base(row, "FLASH_WIN_BTTS_YES", "team-total", favorite === "home" ? "Home Over 1.5" : "Away Over 1.5", `${favoriteName} to score 2+`, price, [...gates, `${favoriteName} win & BTTS Yes ${winYes} < ${FLASH.comboMax}`]));
  }

  return picks;
}

export function buildFlash(rows = []) {
  const picks = rows.flatMap(evaluateFlash);
  picks.sort((a, b) => Date.parse(a.kickoff || 0) - Date.parse(b.kickoff || 0));
  return { picks, meta: { engine: "flash-v1", count: picks.length, scanned: rows.length, rules: FLASH } };
}
