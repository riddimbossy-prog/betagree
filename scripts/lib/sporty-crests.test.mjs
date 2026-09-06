import test from "node:test";
import assert from "node:assert/strict";
import { sportyCrestFile, sportyNameKeys } from "./sporty-crests.mjs";

test("SportRadar competitor IDs produce stable local crest filenames", () => {
  assert.equal(sportyCrestFile("sr:competitor:21942"), "sb-21942.png");
  assert.equal(sportyCrestFile("bad"), null);
});

test("SportyBet names create exact and legal-suffix aliases", () => {
  assert.deepEqual(sportyNameKeys("Delfin SC"), ["delfin sc", "delfin"]);
  assert.ok(sportyNameKeys("CD Universidad Catolica del Ecuador").includes("universidad catolica ecuador"));
});
