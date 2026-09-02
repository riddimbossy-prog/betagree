import test from "node:test";
import assert from "node:assert/strict";
import { upcomingEventsUrl, SB_SPORT_FOOTBALL } from "./sportybet.mjs";

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
