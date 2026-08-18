import assert from "node:assert/strict";
import test from "node:test";
import { agreedMarkets, isSameTier, last5Supports, summarizeGames } from "./last5.mjs";

const fourWins = summarizeGames([
  { result: "W", hs: 2, as: 0, goals: 2 },
  { result: "W", hs: 3, as: 1, goals: 4 },
  { result: "W", hs: 1, as: 0, goals: 1 },
  { result: "W", hs: 2, as: 1, goals: 3 },
  { result: "L", hs: 0, as: 1, goals: 1 },
]);

const cold = summarizeGames([
  { result: "L", hs: 0, as: 1, goals: 1 },
  { result: "L", hs: 0, as: 2, goals: 2 },
  { result: "D", hs: 0, as: 0, goals: 0 },
  { result: "L", hs: 1, as: 2, goals: 3 },
  { result: "L", hs: 0, as: 1, goals: 1 },
]);

test("last 5 wins needs 4/5", () => {
  const pack = { home: fourWins, away: cold, h2h: summarizeGames([]) };
  assert.equal(last5Supports({ category: "wins", team: "Home", home: "Home", away: "Away" }, pack), true);
  assert.equal(last5Supports({ category: "wins", team: "Away", home: "Home", away: "Away" }, pack), false);
});

test("goals need both sides on the same line", () => {
  const high = summarizeGames([
    { result: "W", hs: 3, as: 2, goals: 5 },
    { result: "W", hs: 2, as: 2, goals: 4 },
    { result: "D", hs: 2, as: 1, goals: 3 },
    { result: "W", hs: 4, as: 1, goals: 5 },
    { result: "W", hs: 2, as: 2, goals: 4 },
  ]);
  const pack = { home: high, away: high, h2h: high };
  assert.equal(last5Supports({ category: "over25", selection: "over", team: "Home", home: "Home", away: "Away" }, pack), true);
  assert.equal(last5Supports({ category: "under25", selection: "under", team: "Home", home: "Home", away: "Away" }, pack), false);
});

test("home vs away split uses venue last 5", () => {
  const homeHome = summarizeGames([
    { result: "W", hs: 2, as: 0, goals: 2, venue: "H" },
    { result: "W", hs: 3, as: 1, goals: 4, venue: "H" },
    { result: "W", hs: 1, as: 0, goals: 1, venue: "H" },
    { result: "W", hs: 2, as: 1, goals: 3, venue: "H" },
    { result: "W", hs: 2, as: 0, goals: 2, venue: "H" },
  ]);
  const mixedAway = summarizeGames([
    { result: "L", hs: 0, as: 2, goals: 2, venue: "A" },
    { result: "L", hs: 1, as: 3, goals: 4, venue: "A" },
    { result: "D", hs: 1, as: 1, goals: 2, venue: "A" },
    { result: "L", hs: 0, as: 1, goals: 1, venue: "A" },
    { result: "W", hs: 2, as: 1, goals: 3, venue: "A" },
  ]);
  const pack = { home: mixedAway, away: mixedAway, homeHome, awayAway: mixedAway, h2h: summarizeGames([]) };
  assert.equal(last5Supports({ category: "wins", team: "Home", home: "Home", away: "Away", selection: "home" }, pack), true);
  assert.equal(last5Supports({ category: "wins", team: "Away", home: "Home", away: "Away", selection: "away" }, pack), false);
});

test("same-tier sides are skipped", () => {
  const mid = summarizeGames([
    { result: "W", hs: 1, as: 0, goals: 1 },
    { result: "L", hs: 0, as: 1, goals: 1 },
    { result: "W", hs: 2, as: 1, goals: 3 },
    { result: "D", hs: 1, as: 1, goals: 2 },
    { result: "L", hs: 0, as: 2, goals: 2 },
  ]);
  const pack = { home: mid, away: mid, h2h: summarizeGames([]) };
  assert.equal(isSameTier({ home: "A", away: "B" }, pack), true);
});

test("mismatch is not same-tier", () => {
  const hot = summarizeGames([
    { result: "W", hs: 2, as: 0, goals: 2 },
    { result: "W", hs: 3, as: 0, goals: 3 },
    { result: "W", hs: 1, as: 0, goals: 1 },
    { result: "W", hs: 2, as: 1, goals: 3 },
    { result: "W", hs: 4, as: 0, goals: 4 },
  ]);
  const pack = { home: cold, away: hot, h2h: summarizeGames([]) };
  assert.equal(isSameTier({ home: "A", away: "B" }, pack), false);
});

test("two top-5 table sides are same-tier even if last 5 looks hot", () => {
  const pack = {
    home: cold,
    away: fourWins,
    h2h: summarizeGames([]),
    table: {
      size: 16,
      home: { rank: 3, pts: 33, gp: 18 },
      away: { rank: 1, pts: 42, gp: 18 },
    },
  };
  assert.equal(isSameTier({ home: "Buxoro", away: "Neftchi" }, pack), true);
});

test("1st vs 16th is not same-tier", () => {
  const pack = {
    home: cold,
    away: fourWins,
    h2h: summarizeGames([]),
    table: {
      size: 16,
      home: { rank: 16, pts: 8, gp: 18 },
      away: { rank: 1, pts: 42, gp: 18 },
    },
  };
  assert.equal(isSameTier({ home: "A", away: "B" }, pack), false);
});

test("both sides must agree on totals and first half", () => {
  const open = summarizeGames([
    { result: "W", hs: 3, as: 2, goals: 5, htHs: 1, htAs: 1, htGoals: 2 },
    { result: "W", hs: 2, as: 2, goals: 4, htHs: 1, htAs: 1, htGoals: 2 },
    { result: "D", hs: 2, as: 1, goals: 3, htHs: 1, htAs: 0, htGoals: 1 },
    { result: "W", hs: 4, as: 1, goals: 5, htHs: 2, htAs: 0, htGoals: 2 },
    { result: "W", hs: 2, as: 2, goals: 4, htHs: 1, htAs: 1, htGoals: 2 },
  ]);
  const pack = { home: open, away: open, h2h: summarizeGames([]) };
  const ids = agreedMarkets(pack).map((m) => m.id);
  assert.ok(ids.includes("over25"));
  assert.ok(ids.includes("gg"));
  assert.ok(ids.includes("ht_over05"));
  assert.ok(!ids.includes("under25"));
});
