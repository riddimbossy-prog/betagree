import test from "node:test";
import assert from "node:assert/strict";
import { evaluateSportyScan, favoriteSide, SPORTY_SCAN } from "./sporty-scan.mjs";

function row(over = {}) {
  return {
    fixtureId: "fx",
    league: "Test League",
    kickoff: "2026-09-02T18:00:00Z",
    home: "Home FC",
    away: "Away FC",
    homeLogo: null,
    awayLogo: null,
    tableSize: 20,
    homeWin: 1.4,
    draw: 4.2,
    awayWin: 7.5,
    homePpg: 2.3,
    awayPpg: 0.8,
    homeSplitRank: 3,
    awaySplitRank: 12,
    homeOu: {
      "0.5": { over: 1.18 },
      "1.5": { over: 1.32 },
      "2.5": { over: 1.9 },
    },
    awayOu: {
      "0.5": { over: 1.22 },
      "1.5": { over: 1.7 },
      "2.5": { over: 3.1 },
    },
    ou: { "2.5": { under: 1.72, over: 2.05 } },
    bttsYes: 1.83,
    dnbAway: 2.15,
    ...over,
  };
}

function rules(r) {
  return evaluateSportyScan(r).map((p) => p.rule);
}

test("favoriteSide picks the shorter 1X2 price", () => {
  assert.equal(favoriteSide(1.4, 7.5), "home");
  assert.equal(favoriteSide(5.2, 1.5), "away");
  assert.equal(favoriteSide(2.1, 2.1), null);
});

test("FAV_WIN needs cheap favourite, long dog, team O2.5, split top 5, 2.0 PPG", () => {
  const picks = evaluateSportyScan(row());
  const win = picks.find((p) => p.rule === "FAV_WIN");
  assert.ok(win);
  assert.equal(win.selection, "Home");
  assert.equal(win.price, 1.4);
  assert.equal(win.market, "match-winner");
});

test("FAV_WIN skips top-5 vs top-5", () => {
  assert.equal(rules(row({ awaySplitRank: 4 })).includes("FAV_WIN"), false);
});

test("FAV_WIN skips favourite outside split top 5", () => {
  assert.equal(rules(row({ homeSplitRank: 6 })).includes("FAV_WIN"), false);
});

test("FAV_WIN skips favourite PPG under 2.0", () => {
  assert.equal(rules(row({ homePpg: 1.9 })).includes("FAV_WIN"), false);
});

test("FAV_WIN skips team O2.5 above 2.05", () => {
  assert.equal(rules(row({ homeOu: { "2.5": { over: 2.1 } } })).includes("FAV_WIN"), false);
});

test("FAV_WIN skips dog shorter than 4.00", () => {
  assert.equal(rules(row({ awayWin: 3.9 })).includes("FAV_WIN"), false);
});

test("WEAK_UNDER25 needs both PPG under 1 and draw under 3, skipping top-5 matchups", () => {
  const under = evaluateSportyScan(
    row({
      homePpg: 0.7,
      awayPpg: 0.8,
      draw: 2.85,
      homeSplitRank: 11,
      awaySplitRank: 14,
      homeWin: 2.6,
      awayWin: 2.9,
    }),
  ).find((p) => p.rule === "WEAK_UNDER25");
  assert.ok(under);
  assert.equal(under.selection, "Under 2.5");
  assert.equal(under.price, 1.72);

  assert.equal(
    rules(
      row({
        homePpg: 0.7,
        awayPpg: 0.8,
        draw: 2.85,
        homeSplitRank: 2,
        awaySplitRank: 4,
      }),
    ).includes("WEAK_UNDER25"),
    false,
  );
});

test("GG needs both PPG over 1.5, each team O0.5 under 1.30, mid-table sides", () => {
  const gg = evaluateSportyScan(
    row({
      homePpg: 1.7,
      awayPpg: 1.8,
      homeSplitRank: 8,
      awaySplitRank: 11,
      homeWin: 2.2,
      awayWin: 3.1,
    }),
  ).find((p) => p.rule === "GG_TEAM_O05");
  assert.ok(gg);
  assert.equal(gg.label, "GG");
  assert.equal(gg.price, 1.83);

  assert.equal(
    rules(
      row({
        homePpg: 1.7,
        awayPpg: 1.8,
        homeSplitRank: 4,
        awaySplitRank: 11,
        homeWin: 2.2,
        awayWin: 3.1,
      }),
    ).includes("GG_TEAM_O05"),
    false,
    "top-5 skipped",
  );
  assert.equal(
    rules(
      row({
        homePpg: 1.7,
        awayPpg: 1.8,
        homeSplitRank: 8,
        awaySplitRank: 19,
        homeWin: 2.2,
        awayWin: 3.1,
      }),
    ).includes("GG_TEAM_O05"),
    false,
    "bottom-3 skipped",
  );
});

test("HOME_2PLUS is home O1.5 when PPG ≥ 2.2 and opponent is not top 6", () => {
  const plus = evaluateSportyScan(row()).find((p) => p.rule === "HOME_2PLUS");
  assert.ok(plus);
  assert.equal(plus.selection, "Home Over 1.5");
  assert.equal(plus.price, 1.32);

  assert.equal(rules(row({ awaySplitRank: 5 })).includes("HOME_2PLUS"), false);
});

test("AWAY_DNB is awarded instead of 2+ when the strong side plays away", () => {
  const dnb = evaluateSportyScan(
    row({
      homeWin: 3.4,
      awayWin: 1.95,
      homePpg: 0.9,
      awayPpg: 2.4,
      homeSplitRank: 14,
      awaySplitRank: 4,
      awayOu: { "1.5": { over: 1.4 }, "2.5": { over: 1.95 } },
    }),
  ).find((p) => p.rule === "AWAY_DNB");
  assert.ok(dnb);
  assert.equal(dnb.market, "draw-no-bet");
  assert.equal(dnb.selection, "Away");
  assert.equal(dnb.price, 2.15);
  assert.equal(
    rules(
      row({
        homeWin: 3.4,
        awayWin: 1.95,
        homePpg: 0.9,
        awayPpg: 2.4,
        homeSplitRank: 5,
        awaySplitRank: 4,
        awayOu: { "1.5": { over: 1.4 } },
      }),
    ).includes("AWAY_DNB"),
    false,
    "home top-6 blocks away DNB",
  );
});

test("thresholds stay frozen", () => {
  assert.equal(SPORTY_SCAN.favMax, 1.55);
  assert.equal(SPORTY_SCAN.dogMin, 4);
  assert.equal(SPORTY_SCAN.favTeamOver25Max, 2.05);
  assert.equal(SPORTY_SCAN.twoPlusMinPpg, 2.2);
});
