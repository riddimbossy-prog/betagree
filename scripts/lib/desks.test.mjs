import assert from "node:assert/strict";
import test from "node:test";
import {
  bankersFrom,
  buildPicksFromBeOu,
  buildPicksFromPrimaForm,
  decorateFormRows,
  inOddsBand,
  nameScore,
  parseBeOverUnder,
  parseBeStreakRows,
  parsePct,
  parsePrimaForm,
  parsePrimaFormTables,
  parsePrimaGames,
  parsePrimaTipMarkets,
  sameMatch,
  formRate,
  MIN_RATE,
  ODDS_FROM,
  ODDS_TO,
} from "./desks.mjs";

test("odds band is 1.19–1.55 inclusive", () => {
  assert.equal(inOddsBand(1.19), true);
  assert.equal(inOddsBand(1.55), true);
  assert.equal(inOddsBand(1.18), false);
  assert.equal(inOddsBand(1.56), false);
  assert.equal(inOddsBand(null), false);
});

test("name matching handles abbreviations", () => {
  assert.ok(nameScore("Manchester City", "Man City") > 0.7);
  assert.ok(sameMatch("Colo Colo", "O'Higgins", "Colo-Colo Santiago", "O Higgins Rancagua"));
});

test("parse PrimaTips games and keep only 70% + band", () => {
  const html = `
    <a id="g_1" href="/tip/alianza-lima-utc-liga-1-peru-1" class="game"><span class="tf"><span class="tm">01:30</span
    ><span class="fl"><img src="/x.png" alt="Peru" title="Peru - Liga 1"/>
    </span></span><span class="nms"><span class="nm">Alianza Lima</span> <span class="sp">-</span> <span class="nm">UTC Cajamarca</span></span
    ><span class="data"><span class="tos"><span class="ts"><span class="t">78</span><span class="t">15</span><span class="t">7</span></span
    ><span class="os"><span class="o">1.27</span><span class="o">5.25</span><span class="o">11.00</span></span></span
    ><span class="to"><span class="tip">1</span><span class="odd">1.27</span></span></a>
    <a id="g_2" href="/tip/weak-favorite-x-2" class="game"><span class="tf"><span class="tm">02:00</span
    ><span class="fl"><img src="/x.png" alt="X" title="X - League"/>
    </span></span><span class="nms"><span class="nm">Weak</span> <span class="sp">-</span> <span class="nm">Side</span></span
    ><span class="data"><span class="tos"><span class="ts"><span class="t">55</span><span class="t">25</span><span class="t">20</span></span
    ><span class="os"><span class="o">1.80</span><span class="o">3.50</span><span class="o">4.20</span></span></span
    ><span class="to"><span class="tip">1</span><span class="odd">1.80</span></span></a>`;
  const games = parsePrimaGames(html);
  assert.equal(games.length, 2);
  assert.equal(games[0].home, "Alianza Lima");
  assert.equal(games[0].homePct, 0.78);
  assert.equal(games[0].homeOdds, 1.27);
  assert.ok(games[0].homePct >= MIN_RATE && inOddsBand(games[0].homeOdds));
  assert.ok(!(games[1].homePct >= MIN_RATE && inOddsBand(games[1].homeOdds)));
});

test("PrimaTips form: winless is 1 - win%", () => {
  const html = `<table class="form"><tr>
    <td class="ps">1</td>
    <td class="tm"><span class="dc"><span class="dce"><a class="tl" href="/teams/x/pacific" title="Premier - Canada">Pacific</a><a class="fgl" href="/tip/pacific-york-1"><img/></a></span></span></td>
    <td class="sc">2</td>
    <td class="gm">16</td>
    <td class="pr">13%</td>
  </tr></table>`;
  const rows = parsePrimaForm(html);
  assert.equal(rows[0].team, "Pacific");
  assert.equal(rows[0].playingToday, true);
  assert.ok(formRate(rows[0], "winless") >= 0.7);
  assert.ok(formRate(rows[0], "wins") < 0.7);
});

test("PrimaTips form tables split overall / home / away and keep goal averages", () => {
  const html = `
    <h2>Most Wins</h2>
    <table class="form"><tr>
      <td class="ps" title="1">1</td>
      <td class="tm"><span class="dc"><span class="dce"><a class="tl" href="/teams/x/pacific" title="Premier - Canada">Pacific</a><a class="fgl" href="/tip/pacific-york-1"><img/></a></span></span></td>
      <td class="sc">12</td>
      <td class="gm">16</td>
      <td class="pr">75%</td>
    </tr></table>
    <h2>Only Home Matches</h2>
    <table class="form"><tr>
      <td class="ps" title="1">1</td>
      <td class="tm"><span class="dc"><span class="dce"><a class="tl" href="/teams/x/pacific/league-home" title="Premier - Canada">Pacific</a></span></span></td>
      <td class="sc">8</td>
      <td class="gm">8</td>
      <td class="pr">100%</td>
    </tr></table>
    <h2>Only Away Matches</h2>
    <table class="form"><tr>
      <td class="ps" title="4">4</td>
      <td class="tm"><span class="dc"><span class="dce"><a class="tl" href="/teams/x/york/league-away" title="Premier - Canada">York</a></span></span></td>
      <td class="sc">2</td>
      <td class="gm">8</td>
      <td class="pr">25%</td>
    </tr></table>`;
  const tables = parsePrimaFormTables(html);
  assert.equal(tables.overall[0].team, "Pacific");
  assert.equal(tables.overall[0].playingToday, true);
  assert.equal(tables.home[0].rate, 1);
  assert.equal(tables.away[0].team, "York");
  assert.equal(tables.away[0].rank, 4);

  const goals = parsePrimaFormTables(`
    <h2>Most Scored Goals</h2>
    <table class="form"><tr>
      <td class="ps" title="1">1</td>
      <td class="tm"><span class="dc"><span class="dce"><a class="tl" href="/teams/x/arkadag" title="Yokary Liga">Arkadag</a></span></span></td>
      <td class="sc">65</td>
      <td class="gm">15</td>
      <td class="pr">4.33</td>
    </tr></table>`);
  assert.equal(goals.overall[0].valueKind, "avg");
  assert.equal(goals.overall[0].rate, 4.33);
  assert.equal(goals.overall[0].display, "4.33");

  const decorated = decorateFormRows(tables.overall, [
    {
      id: "fx1",
      status: "pre",
      home: { name: "Pacific FC", logo: "https://a.espncdn.com/pacific.png" },
      away: { name: "York United", logo: null },
    },
  ]);
  assert.equal(decorated[0].logo, "https://a.espncdn.com/pacific.png");
  assert.equal(decorated[0].fixtureId, "fx1");
  assert.equal(decorated[0].opponent, "York United");
});

test("form pick is dropped when odds miss the band", () => {
  const games = [
    {
      home: "Pacific",
      away: "York",
      homeOdds: 3.2,
      awayOdds: 1.9,
      homePct: 0.2,
      awayPct: 0.5,
      league: "Canada",
      kickoff: "20:00",
      url: "https://primatips.com/tip/x",
    },
  ];
  const form = [{ team: "Pacific", matches: 16, count: 0, rate: 0, playingToday: true, league: "Canada" }];
  const picks = buildPicksFromPrimaForm(games, form, "winless", []);
  assert.equal(picks.length, 0);
});

test("form playingToday is only a real today kickoff, not a PrimaTips flag", () => {
  const today = new Date().toISOString().slice(0, 10);
  const celtic = decorateFormRows(
    [{ team: "Celtic", playingToday: true, rank: 1, count: 8, matches: 10, rate: 0.8, league: "Scotland" }],
    [
      {
        id: "fx-celt",
        status: "pre",
        start: `${today}T18:45:00Z`,
        live: false,
        home: { name: "Celtic", logo: null },
        away: { name: "Aberdeen", logo: null },
      },
    ],
  );
  assert.equal(celtic[0].playingToday, true);
  assert.equal(celtic[0].fixtureId, "fx-celt");

  const flaggedOnly = decorateFormRows(
    [{ team: "Levski Sofia", playingToday: true, rank: 2, count: 8, matches: 10, rate: 0.8, league: "Bulgaria" }],
    [],
  );
  assert.equal(flaggedOnly[0].playingToday, false);

  const falseFriend = decorateFormRows(
    [{ team: "Hamilton", playingToday: true, rank: 3, count: 8, matches: 10, rate: 0.8, league: "Scotland" }],
    [
      {
        id: "401880877",
        status: "pre",
        start: `${today}T18:45:00Z`,
        home: { name: "Wigan Athletic", logo: null },
        away: { name: "Milton Keynes Dons", logo: null },
      },
    ],
  );
  assert.equal(falseFriend[0].fixtureId, null);
  assert.equal(falseFriend[0].playingToday, false);
});

test("PrimaTips form can attach to today's slate when the home list misses the game", () => {
  const form = [{ team: "Celtic", matches: 10, count: 8, rate: 0.8, playingToday: true, league: "Scotland" }];
  const picks = buildPicksFromPrimaForm([], form, "wins", [
    {
      id: "fx-celt",
      status: "pre",
      start: "2026-09-02T18:45:00Z",
      league: "Scottish Premiership",
      home: { name: "Celtic", ml: -400, logo: null },
      away: { name: "Aberdeen", ml: 1000, logo: null },
    },
  ]);
  assert.equal(picks.length, 1);
  assert.equal(picks[0].selection, "home");
  assert.equal(picks[0].home, "Celtic");
  assert.ok(picks[0].odds >= 1.19 && picks[0].odds <= 1.55);
});

test("BetExplorer over/under keeps 70% + band only", () => {
  const html = `
    <table class="table-main">
      <tr><th>Team</th></tr>
      <tr>
        <td class="table-main__flag"><a href="/football/x/" title="Denmark - Superliga"><i></i></a></td>
        <td><a class="list-events__item__title">FC Copenhagen</a></td>
        <td class="h-text-center">20</td>
        <td class="h-text-center">16</td>
        <td class="h-text-center">80%</td>
        <td title="16.08.2026 17:00"><a href="/football/denmark/superliga/randers-fc-copenhagen/x/#ou">Randers FC - <strong>FC Copenhagen</strong></a></td>
        <td class="table-main__odds" data-odd="1.44"><button data-odd="1.44"></button></td>
        <td class="table-main__odds" data-odd="2.70"><button data-odd="2.70"></button></td>
      </tr>
    </table>
    <table class="table-main">
      <tr><th>Team</th></tr>
      <tr>
        <td><a class="list-events__item__title">Low Under</a></td>
        <td class="h-text-center">10</td>
        <td class="h-text-center">8</td>
        <td class="h-text-center">80%</td>
        <td title="16.08.2026 17:00"><a href="/u/">A - B</a></td>
        <td data-odd="2.10"></td>
        <td data-odd="1.70"></td>
      </tr>
    </table>`;
  const { overs, unders } = parseBeOverUnder(html);
  assert.equal(overs[0].team, "FC Copenhagen");
  assert.equal(overs[0].rate, 0.8);
  assert.equal(overs[0].overOdds, 1.44);
  const games = [{ home: "Randers FC", away: "FC Copenhagen", league: "Denmark", kickoff: "17:00", url: "" }];
  const overPicks = buildPicksFromBeOu(games, overs, "over25", [], "2026-08-16");
  assert.equal(overPicks.length, 1);
  const underPicks = buildPicksFromBeOu(games, unders, "under25", [], "2026-08-16");
  assert.equal(underPicks.length, 0);
});

test("banker is only dual-source agreement inside the band", () => {
  const shared = {
    category: "wins",
    home: "CSKA Sofia",
    away: "Botev Vratsa",
    team: "CSKA Sofia",
    opponent: "Botev Vratsa",
    selection: "home",
    label: "CSKA Sofia to win",
    market: "1x2",
    odds: 1.3,
    rate: 0.8,
    sample: 5,
    sources: ["form", "odds"],
    sourceNotes: [],
  };
  const onlyPrima = { ...shared, home: "Other", away: "Side", sources: ["form"], odds: 1.22, rate: 0.9 };
  const cats = { wins: [shared, onlyPrima], losses: [], winless: [], undefeated: [], over25: [], under25: [], gg: [] };
  const bankers = bankersFrom(cats);
  assert.equal(bankers.length, 1);
  assert.deepEqual(bankers[0].agreed, ["form", "odds"]);
});

test("parse streak and tip markets", () => {
  const streak = parseBeStreakRows(`<table class="table-main"><tr>
    <td><a class="list-events__item__title">Colo Colo</a></td>
    <td class="h-text-center">9</td>
    <td title="16.08.2026 22:30"><a href="/football/chile/colo-colo-ohiggins/x/"><strong>Colo Colo</strong> - O'Higgins</a></td>
    <td data-odd="1.49"></td><td data-odd="4.10"></td><td data-odd="5.72"></td>
  </tr></table>`);
  assert.equal(streak[0].team, "Colo Colo");
  assert.equal(streak[0].homeOdds, 1.49);
  const markets = parsePrimaTipMarkets(`
    <h2>Coefficients and Probabilities</h2>
    <table class="odds"><thead><tr><th>Over/Under 2.5</th></tr></thead>
    <tbody><tr><td>Coefficient</td><td class="odd">1.33</td><td class="odd">3.20</td></tr>
    <tr><td>Probability</td><td class="odd">74%</td><td class="odd">26%</td></tr></tbody></table>
    <table class="odds"><thead><tr><th>Both Teams to Score</th></tr></thead>
    <tbody><tr><td>Coefficient</td><td class="odd">1.40</td><td class="odd">2.80</td></tr>
    <tr><td>Probability</td><td class="odd">72%</td><td class="odd">28%</td></tr></tbody></table>
    <h2 class="games-title">H2H last 12 games</h2><table class="games-stat"></table>
    <h2 class="games-title">Home last 12 games</h2>
    <table class="games-stat">
      <tr><td class="result">2 - 1</td></tr><tr><td class="result">3 - 1</td></tr>
      <tr><td class="result">1 - 1</td></tr><tr><td class="result">2 - 2</td></tr>
    </table>
    <h2 class="games-title">Away last 12 games</h2>
    <table class="games-stat">
      <tr><td class="result">1 - 2</td></tr><tr><td class="result">0 - 3</td></tr>
      <tr><td class="result">2 - 1</td></tr><tr><td class="result">1 - 1</td></tr>
    </table>`);
  assert.equal(markets.over25.overOdds, 1.33);
  assert.equal(markets.gg.yesOdds, 1.4);
  assert.ok(markets.homeGg >= 0.7);
  assert.equal(parsePct("70%"), 0.7);
  assert.equal(ODDS_FROM, 1.19);
  assert.equal(ODDS_TO, 1.55);
});
