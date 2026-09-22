import type { Fixture, SlatePayload } from "../types";
import { matchPatch, type ScorePatch } from "./score-apply";

const YOUTH = /\b(u1[5-9]|u2[0-3]|reserve|reserves)\b/i;

function slug(home: string, away: string) {
  return `live-${home}-${away}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function teamId(name: string) {
  return `live-${name}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function fixtureFromPatch(patch: ScorePatch): Fixture {
  return {
    id: slug(patch.home, patch.away),
    league: patch.league || "Live",
    leagueSlug: "live",
    start: new Date().toISOString(),
    venue: "",
    status: patch.status,
    detail: patch.detail,
    live: patch.live,
    source: "extra",
    home: {
      id: teamId(patch.home),
      name: patch.home,
      abbr: patch.home.slice(0, 3).toUpperCase(),
      logo: patch.homeLogo ?? null,
      ml: null,
      score: patch.homeScore,
    },
    away: {
      id: teamId(patch.away),
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

export function extraLiveFixtures(fixtures: Fixture[], patches: ScorePatch[]): Fixture[] {
  const extras: Fixture[] = [];
  for (const patch of patches) {
    if (!patch.live) continue;
    if (YOUTH.test(patch.home) || YOUTH.test(patch.away)) continue;
    const already = fixtures.some((f) => matchPatch(f.home.name, f.away.name, [patch]));
    if (already) continue;
    extras.push(fixtureFromPatch(patch));
  }
  return extras;
}

/** Keep SofaScore in-play games on the board even when they are not on the ESPN slate. */
export function mergeLiveFixtures(slate: SlatePayload, patches: ScorePatch[]): SlatePayload {
  const extras = extraLiveFixtures(slate.fixtures, patches);
  if (!extras.length) return slate;
  return { ...slate, fixtures: [...extras, ...slate.fixtures] };
}
