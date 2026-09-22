import type { Fixture } from "@/lib/types";

/** True for ESPN / priced slate games. False for SofaScore worldwide extras. */
export function isBoardMatch(fixture: Pick<Fixture, "id" | "leagueSlug"> & { source?: string }) {
  if (fixture.source === "extra") return false;
  if (fixture.leagueSlug === "live") return false;
  if (String(fixture.id).startsWith("live-")) return false;
  return true;
}

export function isLiveBoardMatch(fixture: Fixture) {
  return Boolean(fixture.live) && isBoardMatch(fixture);
}
