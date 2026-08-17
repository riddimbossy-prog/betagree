import type { Fixture, SlatePayload } from "../types";
import { matchPatch, type ScorePatch } from "./score-apply";

function slug(home: string, away: string) {
  return `live-${home}-${away}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function fixtureFromPatch(patch: ScorePatch): Fixture {
  return {
    id: slug(patch.home, patch.away),
    league: "Live",
    leagueSlug: "live",
    start: new Date().toISOString(),
    venue: "",
    status: patch.status,
    detail: patch.detail,
    live: patch.live,
    home: {
      id: "",
      name: patch.home,
      abbr: patch.home.slice(0, 3).toUpperCase(),
      logo: patch.homeLogo ?? null,
      ml: null,
      score: patch.homeScore,
    },
    away: {
      id: "",
      name: patch.away,
      abbr: patch.away.slice(0, 3).toUpperCase(),
      logo: patch.awayLogo ?? null,
      ml: null,
      score: patch.awayScore,
    },
    drawMl: null,
    total: null,
    overOdds: null,
    underOdds: null,
  };
}

/** Keep SofaScore in-play games on the board even when they are not on the ESPN slate. */
export function mergeLiveFixtures(slate: SlatePayload, patches: ScorePatch[]): SlatePayload {
  const extras: Fixture[] = [];
  for (const patch of patches) {
    if (!patch.live) continue;
    const already = slate.fixtures.some((f) => matchPatch(f.home.name, f.away.name, [patch]));
    if (already) continue;
    extras.push(fixtureFromPatch(patch));
  }
  if (!extras.length) return slate;
  return { ...slate, fixtures: [...extras, ...slate.fixtures] };
}
