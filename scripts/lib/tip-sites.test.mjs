import assert from "node:assert/strict";
import test from "node:test";
import { assembleSlate, buildPicks, consensusBand, DESKS } from "./tip-sites.mjs";

test("consensus bands split at 70 and 50", () => {
  assert.equal(consensusBand(0.7), "high");
  assert.equal(consensusBand(0.69), "medium");
  assert.equal(consensusBand(0.5), "medium");
  assert.equal(consensusBand(0.49), "low");
});

test("twenty-two tip sites are on the board", () => {
  assert.equal(DESKS.length, 22);
});

test("a heavy favourite collects high 1x2 consensus", () => {
  const fixtures = [
    {
      id: "1",
      league: "Test",
      leagueSlug: "tst",
      start: "2026-08-17T19:00Z",
      venue: "",
      status: "pre",
      detail: "",
      live: false,
      home: { id: "h", name: "Home FC", abbr: "HOM", logo: null, ml: -400, score: 0 },
      away: { id: "a", name: "Away FC", abbr: "AWY", logo: null, ml: 900, score: 0 },
      drawMl: 500,
      total: 2.5,
      overOdds: "-120",
      underOdds: "+100",
    },
  ];
  const history = [
    {
      id: "h1",
      league: "Test",
      leagueSlug: "tst",
      start: "2026-08-10T19:00Z",
      venue: "",
      status: "post",
      detail: "FT",
      live: false,
      home: { id: "h", name: "Home FC", abbr: "HOM", logo: null, ml: -200, score: 2 },
      away: { id: "x", name: "Other", abbr: "OTH", logo: null, ml: 400, score: 0 },
      drawMl: 300,
      total: 2.5,
      overOdds: null,
      underOdds: null,
    },
    {
      id: "h2",
      league: "Test",
      leagueSlug: "tst",
      start: "2026-08-12T19:00Z",
      venue: "",
      status: "post",
      detail: "FT",
      live: false,
      home: { id: "h", name: "Home FC", abbr: "HOM", logo: null, ml: -180, score: 3 },
      away: { id: "y", name: "Else", abbr: "ELS", logo: null, ml: 350, score: 1 },
      drawMl: 280,
      total: 2.5,
      overOdds: null,
      underOdds: null,
    },
  ];
  const slate = assembleSlate(new Date("2026-08-17T00:00:00Z"), fixtures, history);
  const top = slate.consensus.find((c) => c.market === "1x2");
  assert.ok(top);
  assert.equal(top.selection, "home");
  assert.equal(top.band, "high");
  assert.ok(top.count >= 8);
});

test("every fixture gets a 1x2 from all 22 sites even without history", () => {
  const fixtures = [
    {
      id: "x",
      league: "Test",
      leagueSlug: "t",
      start: "2026-08-17T18:00Z",
      venue: "",
      status: "pre",
      detail: "",
      live: false,
      home: { id: "h", name: "Home FC", abbr: "HOM", logo: null, ml: null, score: 0 },
      away: { id: "a", name: "Away FC", abbr: "AWY", logo: null, ml: null, score: 0 },
      drawMl: null,
      total: null,
      overOdds: null,
      underOdds: null,
    },
  ];
  const picks = buildPicks(fixtures, []);
  const oneX = picks.filter((p) => p.market === "1x2");
  const desks = new Set(oneX.map((p) => p.tipsterId));
  assert.equal(desks.size, 22);
  const slate = assembleSlate(new Date("2026-08-17T00:00:00Z"), fixtures, []);
  const top = slate.consensus.find((c) => c.market === "1x2");
  assert.ok(top);
  assert.equal(top.coverage, 22);
  assert.equal(top.band, "low");
  assert.ok(top.pct < 0.5, `expected split board, got ${top.pct}`);
});
