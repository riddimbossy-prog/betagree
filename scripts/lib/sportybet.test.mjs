import test from "node:test";
import assert from "node:assert/strict";
import { upcomingEventsUrl, SB_SPORT_FOOTBALL, gg2plusOdds, drawOrOverOdds } from "./sportybet.mjs";

test("upcoming URL is the Early/upcoming tab without todayGames", () => {
  const url = upcomingEventsUrl(1, { pageSize: 80, pageNum: 1 });
  assert.match(url, /pcUpcomingEvents/);
  assert.match(url, /marketId=1/);
  assert.match(url, /pageSize=80/);
  assert.match(url, /pageNum=1/);
  assert.match(url, new RegExp(`sportId=${encodeURIComponent(SB_SPORT_FOOTBALL)}`));
  assert.equal(url.includes("todayGames"), false);
});

test("today tab adds todayGames=true so today's SportyBet card is scanned", () => {
  const url = upcomingEventsUrl(19, { pageSize: 80, pageNum: 2, todayGames: true });
  assert.match(url, /todayGames=true/);
  assert.match(url, /marketId=19/);
  assert.match(url, /pageNum=2/);
});

test("gg2plusOdds reads Over 2.5 & Yes from market 36", () => {
  const ev = {
    markets: [
      {
        id: "36",
        specifier: "total=2.5",
        outcomes: [
          { desc: "Over 2.5 & Yes", odds: "1.78" },
          { desc: "Under 2.5 & Yes", odds: "12.00" },
        ],
      },
    ],
  };
  assert.equal(gg2plusOdds(ev), 1.78);
});

test("drawOrOverOdds reads Yes on Draw Or Over 2.5", () => {
  const ev = {
    markets: [
      { id: "856", specifier: "total=2.5", outcomes: [{ desc: "Yes", odds: "1.20" }, { desc: "No", odds: "3.90" }] },
    ],
  };
  assert.equal(drawOrOverOdds(ev), 1.2);
  assert.equal(drawOrOverOdds({ markets: [] }), null);
});
