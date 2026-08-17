import type { Fixture, SlatePayload } from "../types";

export type ScorePatch = {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  live: boolean;
  status: "pre" | "in" | "post";
  detail: string;
  homeLogo?: string | null;
  awayLogo?: string | null;
};

const YOUTH = /\b(u1[5-9]|u2[0-3]|reserve|reserves|ii|iii|women|vrouwen|w)\b/i;

function norm(s: string) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function core(s: string) {
  return norm(s)
    .replace(/\b(fc|cf|sc|afc|cfc|fk|sk|ac|cd|c d|the|de|do|da|club|united|city|football|sporting|atletico|atl)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameScore(query: string, result: string) {
  const q = core(query);
  const r = core(result);
  if (!q || !r) return 0;
  if (q === r) return 1;
  if (r.startsWith(q) || q.startsWith(r)) return 0.9;
  if (r.includes(` ${q} `) || r.endsWith(` ${q}`) || r.startsWith(`${q} `)) return 0.86;
  if (q.length >= 5 && r.includes(q)) return 0.8;
  if (r.length >= 5 && q.includes(r)) return 0.78;
  const qt = new Set(q.split(" ").filter((t) => t.length > 1));
  const rt = new Set(r.split(" ").filter((t) => t.length > 1));
  if (!qt.size || !rt.size) return 0;
  let hit = 0;
  for (const t of qt) if (rt.has(t)) hit += 1;
  return hit / Math.max(qt.size, rt.size);
}

function youthMismatch(a: string, b: string) {
  return YOUTH.test(a) !== YOUTH.test(b);
}

export function pairScore(home: string, away: string, patch: Pick<ScorePatch, "home" | "away">) {
  if (youthMismatch(home, patch.home) || youthMismatch(away, patch.away)) return { score: 0, swap: false };
  const hh = nameScore(home, patch.home);
  const aa = nameScore(away, patch.away);
  const ha = nameScore(home, patch.away);
  const ah = nameScore(away, patch.home);
  const straight = Math.min(hh, aa);
  const swapped = Math.min(ha, ah);
  if (straight >= swapped) return { score: straight, swap: false };
  return { score: swapped, swap: true };
}

export function matchPatch(home: string, away: string, patches: ScorePatch[]) {
  let best: { patch: ScorePatch; swap: boolean; score: number } | null = null;
  for (const patch of patches) {
    const hit = pairScore(home, away, patch);
    if (hit.score < 0.78) continue;
    if (!best || hit.score > best.score) best = { patch, swap: hit.swap, score: hit.score };
  }
  return best;
}

export function applyPatch(fixture: Fixture, hit: { patch: ScorePatch; swap: boolean }): Fixture {
  const { patch, swap } = hit;
  const homeScore = swap ? patch.awayScore : patch.homeScore;
  const awayScore = swap ? patch.homeScore : patch.awayScore;
  return {
    ...fixture,
    live: patch.live,
    status: patch.status,
    detail: patch.detail,
    home: { ...fixture.home, score: homeScore, logo: fixture.home.logo ?? (swap ? patch.awayLogo : patch.homeLogo) ?? null },
    away: { ...fixture.away, score: awayScore, logo: fixture.away.logo ?? (swap ? patch.homeLogo : patch.awayLogo) ?? null },
  };
}

export function applyPatches<T extends Fixture>(fixtures: T[], patches: ScorePatch[]): T[] {
  return fixtures.map((f) => {
    const hit = matchPatch(f.home.name, f.away.name, patches);
    return hit ? (applyPatch(f, hit) as T) : f;
  });
}

export function applySlateScores(slate: SlatePayload, patches: ScorePatch[]): SlatePayload {
  const fixtures = applyPatches(slate.fixtures, patches);
  const byId = new Map(fixtures.map((f) => [f.id, f]));
  return {
    ...slate,
    fetchedAt: new Date().toISOString(),
    fixtures,
    consensus: (slate.consensus ?? []).map((c) => ({
      ...c,
      fixture: byId.get(c.fixture.id) ?? applyPatches([c.fixture], patches)[0],
    })),
  };
}
