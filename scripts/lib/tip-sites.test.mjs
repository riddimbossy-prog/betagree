import assert from "node:assert/strict";
import test from "node:test";
import { DESKS, assembleSlate, buildConsensus, buildPicks, consensusBand } from "./tip-sites.mjs";

test("twenty-two tip sites are on the board", () => {
  assert.equal(DESKS.length, 22);
  assert.equal(new Set(DESKS.map((d) => d.id)).size, 22);
});

test("consensus bands split at 70 and 50", () => {
  assert.equal(consensusBand(0.7), "high");
  assert.equal(consensusBand(0.69), "medium");
  assert.equal(consensusBand(0.49), "low");
});

test("a heavy favourite collects high 1x2 consensus", () => {
  const fixtures = [
    {
      id: "1",
      league: "Test",
      leagueSlug: "test",
      start: "2026-08-17T19:00Z",
      venue: "",
      status: "pre",
      detail: "Scheduled",
      live: false,
      home: { id: "h", name: "Home FC", abbr: "HOM", logo: null, ml: -400, score: 0 },
      away: { id: "a", name: "Away FC", abbr: "AWY", logo: null, ml: 800, score: 0 },
      drawMl: 550,
      total: 2.5,
      overOdds: "-120",
      underOdds: "100",
    },
  ];
  const history = Array.from({ length: 5 }, (_, i) => ({
    id: `h${i}`,
    league: "Test",
    leagueSlug: "test",
    start: `2026-08-0${i + 1}T19:00Z`,
    venue: "",
    status: "post",
    detail: "FT",
    live: false,
    home: { id: "h", name: "Home FC", abbr: "HOM", logo: null, ml: -200, score: 2 },
    away: { id: "x", name: "Other", abbr: "OTH", logo: null, ml: 150, score: 0 },
    drawMl: 250,
    total: 2.5,
    overOdds: null,
    underOdds: null,
  }));
  const slate = assembleSlate(new Date("2026-08-17T00:00:00Z"), fixtures, history);
  assert.equal(slate.desks.length, 22);
  const one = slate.consensus.find((c) => c.market === "1x2");
  assert.ok(one);
  assert.ok(one.count >= 8);
  assert.ok(["high", "medium", "low"].includes(one.band));
  assert.ok(buildPicks(fixtures, history).length > 20);
  assert.ok(buildConsensus(slate.picks, fixtures).length >= 1);
});
