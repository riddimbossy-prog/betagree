import assert from "node:assert/strict";
import test from "node:test";
import { dayBucket, inBand, isSeniorName, leagueAllows, rankWeekly, scoringHeat, TWO_YES } from "./streak-rules.mjs";

test("2+ band", () => {
  assert.equal(inBand(1.19, TWO_YES), true);
  assert.equal(inBand(1.41, TWO_YES), false);
});

test("drops youth, SRL and II sides", () => {
  assert.equal(isSeniorName("MLS", "Orlando City SC", "Chicago Fire"), true);
  assert.equal(isSeniorName("MLS Next Pro", "Inter Miami CF II", "New England Revolution II"), false);
  assert.equal(isSeniorName("SRL International Friendlies", "Serbia SRL", "China SRL"), false);
  assert.equal(isSeniorName("Eredivisie", "Jong PSV Eindhoven", "TOP Oss"), false);
});

test("tomorrow is the next UTC date", () => {
  const now = Date.parse("2026-08-18T19:00:00Z");
  assert.equal(dayBucket("2026-08-18T23:30:00Z", now), "today");
  assert.equal(dayBucket("2026-08-19T11:35:00Z", now), "tomorrow");
  assert.equal(dayBucket("2026-08-22T11:35:00Z", now), "later");
});

test("cold low-variance leagues block Over 2.5", () => {
  const cold = { n: 20, gpg: 2.1, stdev: 1.05, twoPlus: { rate: 0.5 }, over25: { rate: 0.38 } };
  const hot = { n: 18, gpg: 3.5, stdev: 1.8, twoPlus: { rate: 0.89 }, over25: { rate: 0.78 } };
  assert.equal(leagueAllows(cold, "3+"), false);
  assert.equal(leagueAllows(hot, "3+"), true);
  assert.equal(leagueAllows(hot, "2+"), true);
  assert.equal(scoringHeat(hot), "hot");
  assert.equal(scoringHeat(cold), "cold");
});

test("weekly ranks short 2+ with weak opponent first", () => {
  const ranked = rankWeekly([
    { market: "2+", odds: 1.38, oppPpg: 1.11, kickoff: "2026-08-19T23:30:00Z", id: "a" },
    { market: "2+", odds: 1.2, oppPpg: 0.4, kickoff: "2026-08-20T18:00:00Z", id: "b" },
    { market: "3+", odds: 1.7, kickoff: "2026-08-19T16:00:00Z", id: "c" },
  ]);
  assert.equal(ranked[0].id, "b");
});
