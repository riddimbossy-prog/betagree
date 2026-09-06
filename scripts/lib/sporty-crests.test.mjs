import test from "node:test";
import assert from "node:assert/strict";
import { isTrustedSportyCrestUrl, sportyCrestFile, sportyNameKeys } from "./sporty-crests.mjs";

test("SportRadar competitor IDs produce stable local crest filenames", () => {
  assert.equal(sportyCrestFile("sr:competitor:21942"), "sb-21942.png");
  assert.equal(sportyCrestFile("bad"), null);
});

test("SportyBet names create exact and legal-suffix aliases", () => {
  assert.deepEqual(sportyNameKeys("Delfin SC"), ["delfin sc", "delfin"]);
  assert.ok(sportyNameKeys("CD Universidad Catolica del Ecuador").includes("universidad catolica ecuador"));
});

test("only crest hosts returned by SportyBet team details are trusted", () => {
  assert.equal(isTrustedSportyCrestUrl("https://s.sporty.net/sportycom/favoriteIcon/abc"), true);
  assert.equal(isTrustedSportyCrestUrl("https://s.football.com/common/main/res/badge.png"), true);
  assert.equal(isTrustedSportyCrestUrl("https://www.flashscore.com/res/image/data/badge.png"), true);
  assert.equal(isTrustedSportyCrestUrl("http://s.sporty.net/not-secure.png"), false);
  assert.equal(isTrustedSportyCrestUrl("https://attacker.example/crest.png"), false);
});
