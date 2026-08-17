import test from "node:test";
import assert from "node:assert/strict";
import { namesMatch } from "./names-match.mjs";

test("Club Brugge is not Cercle Brugge", () => {
  assert.equal(namesMatch("Club Brugge", "Cercle Brugge"), false);
  assert.equal(namesMatch("Club Brugge KV", "Cercle Brugge KSV"), false);
  assert.equal(namesMatch("Club Brugge", "Club Brugge KV"), true);
  assert.equal(namesMatch("Cercle Brugge", "Cercle Brugge KSV"), true);
});

test("other near-names stay distinct", () => {
  assert.equal(namesMatch("Inter", "Inter Miami"), false);
  assert.equal(namesMatch("Man City", "Man Utd"), false);
  assert.equal(namesMatch("Real Madrid", "Real Sociedad"), false);
});
