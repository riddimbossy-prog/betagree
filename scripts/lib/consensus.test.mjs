import assert from "node:assert/strict";
import test from "node:test";

function consensusBand(pct) {
  if (pct >= 0.7) return "high";
  if (pct >= 0.5) return "medium";
  return "low";
}

test("consensus bands split at 70 and 50", () => {
  assert.equal(consensusBand(1), "high");
  assert.equal(consensusBand(0.7), "high");
  assert.equal(consensusBand(0.69), "medium");
  assert.equal(consensusBand(0.5), "medium");
  assert.equal(consensusBand(0.49), "low");
  assert.equal(consensusBand(0), "low");
});
