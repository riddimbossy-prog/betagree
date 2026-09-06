import test from "node:test";
import assert from "node:assert/strict";
import { evaluateFlash } from "./flash-engine.mjs";

function row(over = {}) {
  return {
    fixtureId: "fx", league: "League", kickoff: "2026-09-07T18:00:00Z", when: "tomorrow",
    home: "Home", away: "Away", homeWin: 1.6, draw: 4.2, awayWin: 5.5,
    homeRank: 3, awayRank: 12, ou: { "2.5": { over: 1.55 }, "3.5": { over: 1.9 } },
    homeOu: { "1.5": { over: 1.42 } }, awayOu: { "1.5": { over: 2.4 } },
    homeBttsNo: 1.9, homeBttsYes: 1.85, awayBttsNo: 8, awayBttsYes: 9,
    drawOrOver25: 1.25, ...over,
  };
}

test("hard gates reject Over 3.5 at 2.00 or higher and favourites outside top 4", () => {
  assert.deepEqual(evaluateFlash(row({ ou: { "3.5": { over: 2 } } })), []);
  assert.deepEqual(evaluateFlash(row({ ou: { "3.5": { over: 2.1 } } })), []);
  assert.deepEqual(evaluateFlash(row({ homeRank: 5 })), []);
});

test("draw, win/no and win/yes routes fire independently", () => {
  assert.deepEqual(evaluateFlash(row()).map((p) => p.rule), ["FLASH_DRAW_OVER25", "FLASH_WIN_BTTS_NO", "FLASH_WIN_BTTS_YES"]);
});

test("1st-vs-2nd replaces the draw route with Draw or Over 2.5", () => {
  const rules = evaluateFlash(row({ homeRank: 1, awayRank: 2 })).map((p) => p.rule);
  assert.equal(rules.includes("FLASH_TOP2_DRAW_OVER25"), true);
  assert.equal(rules.includes("FLASH_DRAW_OVER25"), false);
});

test("combo boundary is strictly below 2.00", () => {
  const rules = evaluateFlash(row({ homeBttsNo: 2, homeBttsYes: 2 })).map((p) => p.rule);
  assert.deepEqual(rules, ["FLASH_DRAW_OVER25"]);
});
