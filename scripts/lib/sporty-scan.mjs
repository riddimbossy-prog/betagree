/** SportyBet main-board scan — odds + split-table filters. */

export const SPORTY_SCAN = Object.freeze({
  minPass: 2,
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
  gg2plusMin: 1.3,
  ggMax: 1.55,
  under35Min: 1.5,
  drawOrOver25Max: 1.35,
  balFavMin: 1.8,
  balDogMax: 4.5,
  balDrawMin: 2.8,
  balDrawMax: 4.2,
});

export const SPORTY_SCAN_COPY = `SPORTY SCAN RULES (sporty-scan-v1)

Scans SportyBet Today + Early. Youth / women / reserves / II–III / academy skipped. Needs 1X2, team totals, and a table (PPG + rank).

A market qualifies when 2 of its listed filters pass. Skip rules are always enforced.

1) TO WIN  — favourite to win
- Favourite ≤ 1.55
- Dog ≥ 4.00
- Favourite team Over 2.5 ≤ 2.05
- Favourite PPG ≥ 2.0
- Favourite in split top 5
- Skip top-5 vs top-5

2) 2+ GOALS  — home Over 1.5
- Home PPG ≥ 2.2
- Home Over 1.5 < 1.45
- Opponent not top 6

3) DRAW NO BET  — away DNB
- Away PPG ≥ 2.2
- Away Over 1.5 < 1.45
- Opponent not top 6
- Used instead of 2+ when the strong side is away

4) GG  — both teams to score
- Both PPG > 1.5
- Each side Over 0.5 < 1.30
- Neither top 5
- Neither bottom 3

5) UNDER 2.5
- Both PPG < 1.0
- Draw < 3.00
- Skip top-5 vs top-5

6) DRAW OR OVER 2.5
- Match GG2+ ≥ 1.30 (enforced)
- Balanced 1X2 (enforced): favourite ≥ 1.80, dog ≤ 4.50, draw 2.80–4.20
- GG ≤ 1.55
- Under 3.5 > 1.50
- Draw or Over 2.5 ≤ 1.35
- Skip both top 5
- Skip bottom-3 matchups`;

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

function lineUnder(book, line) {
  const row = book?.ou?.[String(line)];
  return num(row?.under);
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

export function isBalanced1x2(homeWin, draw, awayWin) {
  const h = num(homeWin);
  const d = num(draw);
  const a = num(awayWin);
  if (h == null || d == null || a == null) return false;
  const fav = Math.min(h, a);
  const dog = Math.max(h, a);
  return (
    fav >= SPORTY_SCAN.balFavMin &&
    dog <= SPORTY_SCAN.balDogMax &&
    d >= SPORTY_SCAN.balDrawMin &&
    d <= SPORTY_SCAN.balDrawMax
  );
}

/** Soft filters need `minPass` hits. Skip flags always block. */
export function qualify(skips, filters, minPass = SPORTY_SCAN.minPass) {
  if (skips.some(Boolean)) return null;
  const passed = filters.filter((f) => f.ok);
  if (passed.length < minPass) return null;
  return [`${passed.length}/${filters.length} filters`, ...passed.map((f) => f.reason)];
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
  const bttsYes = num(row.bttsYes);
  const gg2plus = num(row.gg2plus);
  const drawOrOver25 = num(row.drawOrOver25);
  const u35 = lineUnder(row, 3.5);

  if (fav) {
    const favOdds = fav === "home" ? homeWin : awayWin;
    const dogOdds = fav === "home" ? awayWin : homeWin;
    const favPpg = fav === "home" ? homePpg : awayPpg;
    const favRank = fav === "home" ? homeRank : awayRank;
    const teamO25 = lineOver(row, fav, 2.5);
    const reasons = qualify([bothTop(homeRank, awayRank)], [
      { ok: favOdds != null && favOdds <= SPORTY_SCAN.favMax, reason: `Favourite ${favOdds ?? "—"} ≤ ${SPORTY_SCAN.favMax}` },
      { ok: dogOdds != null && dogOdds >= SPORTY_SCAN.dogMin, reason: `Dog ${dogOdds ?? "—"} ≥ ${SPORTY_SCAN.dogMin}` },
      {
        ok: teamO25 != null && teamO25 <= SPORTY_SCAN.favTeamOver25Max,
        reason: `Team O2.5 ${teamO25 ?? "—"} ≤ ${SPORTY_SCAN.favTeamOver25Max}`,
      },
      { ok: favPpg != null && favPpg >= SPORTY_SCAN.favMinPpg, reason: `PPG ${favPpg ?? "—"} ≥ ${SPORTY_SCAN.favMinPpg}` },
      {
        ok: isTop(favRank, SPORTY_SCAN.favSplitMax),
        reason: `Split top ${SPORTY_SCAN.favSplitMax} (rank ${favRank ?? "—"})`,
      },
    ]);
    if (reasons) {
      const name = fav === "home" ? row.home : row.away;
      picks.push(
        pickBase(row, "FAV_WIN", "match-winner", fav === "home" ? "Home" : "Away", `${name} to win`, favOdds, [
          ...reasons,
          "Top-5 vs top-5 skipped",
        ]),
      );
    }
  }

  {
    const reasons = qualify([bothTop(homeRank, awayRank)], [
      {
        ok: homePpg != null && awayPpg != null && homePpg < SPORTY_SCAN.weakPpgMax && awayPpg < SPORTY_SCAN.weakPpgMax,
        reason: `Both PPG under ${SPORTY_SCAN.weakPpgMax} (${homePpg ?? "—"} / ${awayPpg ?? "—"})`,
      },
      { ok: draw != null && draw < SPORTY_SCAN.drawMax, reason: `Draw ${draw ?? "—"} < ${SPORTY_SCAN.drawMax}` },
    ]);
    if (reasons) {
      picks.push(
        pickBase(row, "WEAK_UNDER25", "total-goals", "Under 2.5", "Under 2.5", lineUnder(row, 2.5), [
          ...reasons,
          "Top-5 matchup skipped",
        ]),
      );
    }
  }

  {
    const homeO05 = lineOver(row, "home", 0.5);
    const awayO05 = lineOver(row, "away", 0.5);
    const reasons = qualify(
      [
        isTop(homeRank, SPORTY_SCAN.topBand),
        isTop(awayRank, SPORTY_SCAN.topBand),
        isBottom(homeRank, size),
        isBottom(awayRank, size),
      ],
      [
        {
          ok: homePpg != null && awayPpg != null && homePpg > SPORTY_SCAN.ggMinPpg && awayPpg > SPORTY_SCAN.ggMinPpg,
          reason: `Both PPG > ${SPORTY_SCAN.ggMinPpg} (${homePpg ?? "—"} / ${awayPpg ?? "—"})`,
        },
        {
          ok:
            homeO05 != null &&
            awayO05 != null &&
            homeO05 < SPORTY_SCAN.teamOver05Max &&
            awayO05 < SPORTY_SCAN.teamOver05Max,
          reason: `Team O0.5 ${homeO05 ?? "—"} / ${awayO05 ?? "—"} < ${SPORTY_SCAN.teamOver05Max}`,
        },
      ],
    );
    if (reasons) {
      picks.push(
        pickBase(row, "GG_TEAM_O05", "btts", "Yes", "GG", bttsYes, [...reasons, "Top-5 and bottom-3 sides skipped"]),
      );
    }
  }

  function twoPlusOrDnb(side) {
    const ppg = side === "home" ? homePpg : awayPpg;
    const oppRank = side === "home" ? awayRank : homeRank;
    const o15 = lineOver(row, side, 1.5);
    const reasons = qualify([isTop(oppRank, SPORTY_SCAN.oppNotTop)], [
      { ok: ppg != null && ppg >= SPORTY_SCAN.twoPlusMinPpg, reason: `${side === "home" ? "Home" : "Away"} PPG ${ppg ?? "—"} ≥ ${SPORTY_SCAN.twoPlusMinPpg}` },
      { ok: o15 != null && o15 < SPORTY_SCAN.teamOver15Max, reason: `${side === "home" ? "Home" : "Away"} O1.5 ${o15 ?? "—"} < ${SPORTY_SCAN.teamOver15Max}` },
    ]);
    if (!reasons) return;
    const name = side === "home" ? row.home : row.away;
    if (side === "home") {
      picks.push(
        pickBase(row, "HOME_2PLUS", "team-total", "Home Over 1.5", `${name} 2+ goals`, o15, [
          ...reasons,
          `Opponent not top ${SPORTY_SCAN.oppNotTop} (rank ${oppRank ?? "—"})`,
        ]),
      );
    } else {
      picks.push(
        pickBase(row, "AWAY_DNB", "draw-no-bet", "Away", `${name} DNB`, num(row.dnbAway), [
          ...reasons,
          `Opponent not top ${SPORTY_SCAN.oppNotTop} — DNB instead of 2+`,
        ]),
      );
    }
  }
  twoPlusOrDnb("home");
  twoPlusOrDnb("away");

  {
    const reasons = qualify(
      [
        gg2plus == null || gg2plus < SPORTY_SCAN.gg2plusMin,
        !isBalanced1x2(homeWin, draw, awayWin),
        bothTop(homeRank, awayRank),
        isBottom(homeRank, size),
        isBottom(awayRank, size),
      ],
      [
        { ok: bttsYes != null && bttsYes <= SPORTY_SCAN.ggMax, reason: `GG ${bttsYes ?? "—"} ≤ ${SPORTY_SCAN.ggMax}` },
        { ok: u35 != null && u35 > SPORTY_SCAN.under35Min, reason: `Under 3.5 ${u35 ?? "—"} > ${SPORTY_SCAN.under35Min}` },
        {
          ok: drawOrOver25 != null && drawOrOver25 <= SPORTY_SCAN.drawOrOver25Max,
          reason: `Draw or O2.5 ${drawOrOver25 ?? "—"} ≤ ${SPORTY_SCAN.drawOrOver25Max}`,
        },
      ],
    );
    if (reasons && drawOrOver25 != null) {
      picks.push(
        pickBase(row, "DRAW_OR_OVER25", "draw-or-over", "Yes", "Draw or over 2.5", drawOrOver25, [
          ...reasons,
          `GG2+ ${gg2plus} ≥ ${SPORTY_SCAN.gg2plusMin}`,
          `Balanced 1X2 ${homeWin} / ${draw} / ${awayWin}`,
          "Top-5 vs top-5 and bottom-3 matchups skipped",
        ]),
      );
    }
  }

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
