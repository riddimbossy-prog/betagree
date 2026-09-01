/** SportyBet main-board scan — odds + split-table filters. */

export const SPORTY_SCAN = Object.freeze({
  favMax: 1.55,
  dogMin: 4.0,
  favTeamOver25Max: 2.05,
  favMinPpg: 2.0,
  favSplitMax: 5,
  weakPpgMax: 1.0,
  drawMax: 3.0,
  ggMinPpg: 1.5,
  teamOver05Max: 1.3,
  twoPlusMinPpg: 2.2,
  teamOver15Max: 1.45,
  oppNotTop: 6,
  topBand: 5,
  bottomBand: 3,
});

function finite(v) {
  return v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v));
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function lineOver(book, side, line) {
  const pack = side === "home" ? book?.homeOu : book?.awayOu;
  const row = pack?.[String(line)];
  return num(row?.over);
}

function bothTop(homeRank, awayRank, band = SPORTY_SCAN.topBand) {
  return finite(homeRank) && finite(awayRank) && Number(homeRank) <= band && Number(awayRank) <= band;
}

function isBottom(rank, size, band = SPORTY_SCAN.bottomBand) {
  if (!finite(rank) || !finite(size)) return false;
  return Number(rank) > Number(size) - band;
}

function isTop(rank, band) {
  return finite(rank) && Number(rank) <= band;
}

function pickBase(row, rule, market, selection, label, price, reasons) {
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
    engine: "sporty-scan-v1",
  };
}

export function favoriteSide(homeWin, awayWin) {
  const h = num(homeWin);
  const a = num(awayWin);
  if (h == null || a == null) return null;
  if (h === a) return null;
  return h < a ? "home" : "away";
}

export function evaluateSportyScan(row) {
  const picks = [];
  const homeWin = num(row.homeWin);
  const awayWin = num(row.awayWin);
  const draw = num(row.draw);
  const homePpg = num(row.homePpg);
  const awayPpg = num(row.awayPpg);
  const homeRank = num(row.homeSplitRank ?? row.homeRank);
  const awayRank = num(row.awaySplitRank ?? row.awayRank);
  const size = num(row.tableSize) || 20;
  const fav = favoriteSide(homeWin, awayWin);

  if (fav) {
    const favOdds = fav === "home" ? homeWin : awayWin;
    const dogOdds = fav === "home" ? awayWin : homeWin;
    const favPpg = fav === "home" ? homePpg : awayPpg;
    const favRank = fav === "home" ? homeRank : awayRank;
    const teamO25 = lineOver(row, fav, 2.5);
    if (
      favOdds != null &&
      dogOdds != null &&
      favOdds <= SPORTY_SCAN.favMax &&
      dogOdds >= SPORTY_SCAN.dogMin &&
      teamO25 != null &&
      teamO25 <= SPORTY_SCAN.favTeamOver25Max &&
      favPpg != null &&
      favPpg >= SPORTY_SCAN.favMinPpg &&
      isTop(favRank, SPORTY_SCAN.favSplitMax) &&
      !bothTop(homeRank, awayRank)
    ) {
      const name = fav === "home" ? row.home : row.away;
      picks.push(
        pickBase(
          row,
          "FAV_WIN",
          "match-winner",
          fav === "home" ? "Home" : "Away",
          `${name} to win`,
          favOdds,
          [
            `Favourite ${favOdds} ≤ ${SPORTY_SCAN.favMax}, dog ${dogOdds} ≥ ${SPORTY_SCAN.dogMin}`,
            `Team O2.5 ${teamO25} ≤ ${SPORTY_SCAN.favTeamOver25Max}`,
            `Split top ${SPORTY_SCAN.favSplitMax} (rank ${favRank}) and PPG ${favPpg} ≥ ${SPORTY_SCAN.favMinPpg}`,
            "Top-5 vs top-5 skipped",
          ],
        ),
      );
    }
  }

  if (
    homePpg != null &&
    awayPpg != null &&
    homePpg < SPORTY_SCAN.weakPpgMax &&
    awayPpg < SPORTY_SCAN.weakPpgMax &&
    draw != null &&
    draw < SPORTY_SCAN.drawMax &&
    !bothTop(homeRank, awayRank)
  ) {
    picks.push(
      pickBase(
        row,
        "WEAK_UNDER25",
        "total-goals",
        "Under 2.5",
        "Under 2.5",
        num(row.ou?.["2.5"]?.under),
        [
          `Both PPG under ${SPORTY_SCAN.weakPpgMax} (${homePpg} / ${awayPpg})`,
          `Draw ${draw} < ${SPORTY_SCAN.drawMax}`,
          "Top-5 matchup skipped",
        ],
      ),
    );
  }

  const homeO05 = lineOver(row, "home", 0.5);
  const awayO05 = lineOver(row, "away", 0.5);
  if (
    homePpg != null &&
    awayPpg != null &&
    homePpg > SPORTY_SCAN.ggMinPpg &&
    awayPpg > SPORTY_SCAN.ggMinPpg &&
    homeO05 != null &&
    awayO05 != null &&
    homeO05 < SPORTY_SCAN.teamOver05Max &&
    awayO05 < SPORTY_SCAN.teamOver05Max &&
    !isTop(homeRank, SPORTY_SCAN.topBand) &&
    !isTop(awayRank, SPORTY_SCAN.topBand) &&
    !isBottom(homeRank, size) &&
    !isBottom(awayRank, size)
  ) {
    picks.push(
      pickBase(row, "GG_TEAM_O05", "btts", "Yes", "GG", num(row.bttsYes), [
        `Both PPG > ${SPORTY_SCAN.ggMinPpg} (${homePpg} / ${awayPpg})`,
        `Team O0.5 ${homeO05} / ${awayO05} < ${SPORTY_SCAN.teamOver05Max}`,
        "Top-5 and bottom-3 sides skipped",
      ]),
    );
  }

  function twoPlusOrDnb(side) {
    const ppg = side === "home" ? homePpg : awayPpg;
    const oppRank = side === "home" ? awayRank : homeRank;
    const o15 = lineOver(row, side, 1.5);
    if (ppg == null || ppg < SPORTY_SCAN.twoPlusMinPpg) return;
    if (o15 == null || o15 >= SPORTY_SCAN.teamOver15Max) return;
    if (isTop(oppRank, SPORTY_SCAN.oppNotTop)) return;
    const name = side === "home" ? row.home : row.away;
    if (side === "home") {
      picks.push(
        pickBase(row, "HOME_2PLUS", "team-total", "Home Over 1.5", `${name} 2+ goals`, o15, [
          `Home PPG ${ppg} ≥ ${SPORTY_SCAN.twoPlusMinPpg}`,
          `Home O1.5 ${o15} < ${SPORTY_SCAN.teamOver15Max}`,
          `Opponent not top ${SPORTY_SCAN.oppNotTop} (rank ${oppRank ?? "—"})`,
        ]),
      );
    } else {
      picks.push(
        pickBase(row, "AWAY_DNB", "draw-no-bet", "Away", `${name} DNB`, num(row.dnbAway), [
          `Away PPG ${ppg} ≥ ${SPORTY_SCAN.twoPlusMinPpg}`,
          `Away O1.5 ${o15} < ${SPORTY_SCAN.teamOver15Max}`,
          `Opponent not top ${SPORTY_SCAN.oppNotTop} — DNB instead of 2+`,
        ]),
      );
    }
  }
  twoPlusOrDnb("home");
  twoPlusOrDnb("away");

  return picks;
}

export function buildSportyScan(rows = []) {
  const picks = [];
  const skip = { scanned: rows.length };
  for (const row of rows) {
    const found = evaluateSportyScan(row);
    if (found.length) picks.push(...found);
  }
  picks.sort((a, b) => Date.parse(a.kickoff || 0) - Date.parse(b.kickoff || 0));
  return {
    picks,
    meta: { engine: "sporty-scan-v1", count: picks.length, scanned: skip.scanned, rules: SPORTY_SCAN },
  };
}
