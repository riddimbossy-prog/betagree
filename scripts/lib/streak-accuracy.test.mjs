import assert from "node:assert/strict";
import test from "node:test";
import { settleStreaks } from "./streak-accuracy.mjs";

test("2+ and over 2.5 from full time", () => {
  assert.equal(settleStreaks(2, 0).twoPlus, true);
  assert.equal(settleStreaks(2, 0).over25, false);
  assert.equal(settleStreaks(2, 1).over25, true);
  assert.equal(settleStreaks(1, 1).twoPlus, false);
  assert.equal(settleStreaks(3, 1).twoPlusClear, true);
  assert.equal(settleStreaks(2, 1).twoPlusClear, false);
});
