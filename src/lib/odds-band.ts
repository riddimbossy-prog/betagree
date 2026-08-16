import type { Fixture, FixtureTeam } from "@/lib/types";
import { toDecimal } from "@/lib/odds";

export const DEFAULT_BAND = { from: 1.2, to: 1.55 } as const;

export type BandSide = "any" | "home" | "away";

export type BandHit = {
  fixture: Fixture;
  side: "home" | "away";
  price: number;
  favorite: FixtureTeam;
  dog: FixtureTeam;
  dogPrice: number | null;
};

export type BandTeam = {
  team: FixtureTeam;
  role: "best" | "worst";
  price: number;
  fixture: Fixture;
  versus: FixtureTeam;
};

function inBand(price: number | null, from: number, to: number): price is number {
  return price != null && price >= from && price <= to;
}

export function fixturesInBand(
  fixtures: Fixture[],
  from = DEFAULT_BAND.from,
  to = DEFAULT_BAND.to,
  side: BandSide = "any",
): BandHit[] {
  const hits: BandHit[] = [];
  for (const fixture of fixtures) {
    const home = toDecimal(fixture.home.ml);
    const away = toDecimal(fixture.away.ml);
    if ((side === "any" || side === "home") && inBand(home, from, to)) {
      hits.push({
        fixture,
        side: "home",
        price: home,
        favorite: fixture.home,
        dog: fixture.away,
        dogPrice: away,
      });
    }
    if ((side === "any" || side === "away") && inBand(away, from, to)) {
      hits.push({
        fixture,
        side: "away",
        price: away,
        favorite: fixture.away,
        dog: fixture.home,
        dogPrice: home,
      });
    }
  }
  return hits.sort((a, b) => a.price - b.price);
}

export function bandTeams(hits: BandHit[]): { best: BandTeam[]; worst: BandTeam[] } {
  const bestMap = new Map<string, BandTeam>();
  const worstMap = new Map<string, BandTeam>();
  for (const hit of hits) {
    const bestKey = hit.favorite.id || hit.favorite.name;
    const prevBest = bestMap.get(bestKey);
    if (!prevBest || hit.price < prevBest.price) {
      bestMap.set(bestKey, {
        team: hit.favorite,
        role: "best",
        price: hit.price,
        fixture: hit.fixture,
        versus: hit.dog,
      });
    }
    const worstKey = hit.dog.id || hit.dog.name;
    const dogPrice = hit.dogPrice ?? 0;
    const prevWorst = worstMap.get(worstKey);
    if (!prevWorst || dogPrice > prevWorst.price) {
      worstMap.set(worstKey, {
        team: hit.dog,
        role: "worst",
        price: dogPrice || hit.price,
        fixture: hit.fixture,
        versus: hit.favorite,
      });
    }
  }
  return {
    best: [...bestMap.values()].sort((a, b) => a.price - b.price),
    worst: [...worstMap.values()].sort((a, b) => b.price - a.price),
  };
}
