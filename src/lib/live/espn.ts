import type { Fixture } from "@/lib/types";
import { parseAmerican } from "@/lib/odds";
import { LEAGUES } from "./leagues";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

function parseOdds(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") return parseAmerican(raw);
  return null;
}

function closeOdds(side: unknown): number | null {
  if (!side || typeof side !== "object") return null;
  const s = side as { close?: { odds?: unknown }; odds?: unknown; moneyLine?: unknown };
  return parseOdds(s.close?.odds ?? s.odds ?? s.moneyLine);
}

export function parseEspnEvent(e: Record<string, unknown>, league: string, slug: string): Fixture | null {
  const comps = ((e.competitions as unknown[]) ?? [])[0] as Record<string, unknown> | undefined;
  if (!comps) return null;
  const teams = (comps.competitors as Record<string, unknown>[]) ?? [];
  const home = teams.find((t) => t.homeAway === "home");
  const away = teams.find((t) => t.homeAway === "away");
  if (!home || !away) return null;
  const ht = (home.team ?? {}) as Record<string, unknown>;
  const at = (away.team ?? {}) as Record<string, unknown>;
  const odd0 = (((comps.odds as unknown[]) ?? [])[0] ?? {}) as Record<string, unknown>;
  const ml = (odd0.moneyline ?? {}) as Record<string, unknown>;
  const tot = (odd0.total ?? {}) as Record<string, unknown>;
  const status = ((e.status as Record<string, unknown>)?.type ?? {}) as Record<string, unknown>;
  const state = String(status.state ?? "pre");
  const homeScore = home.score != null && home.score !== "" ? Number(home.score) : null;
  const awayScore = away.score != null && away.score !== "" ? Number(away.score) : null;

  return {
    id: String(e.id),
    league,
    leagueSlug: slug,
    start: String(e.date ?? ""),
    venue: String(((comps.venue as Record<string, unknown>) ?? {}).fullName ?? ""),
    status: state,
    detail: String(status.shortDetail ?? status.detail ?? ""),
    live: state === "in",
    home: {
      id: String(ht.id ?? ""),
      name: String(ht.displayName ?? "Home"),
      abbr: String(ht.abbreviation ?? ht.shortDisplayName ?? "HOM"),
      ml: closeOdds(ml.home),
      score: Number.isFinite(homeScore as number) ? homeScore : null,
    },
    away: {
      id: String(at.id ?? ""),
      name: String(at.displayName ?? "Away"),
      abbr: String(at.abbreviation ?? at.shortDisplayName ?? "AWY"),
      ml: closeOdds(ml.away),
      score: Number.isFinite(awayScore as number) ? awayScore : null,
    },
    drawMl: closeOdds(ml.draw) ?? parseOdds((odd0.drawOdds as { moneyLine?: unknown } | undefined)?.moneyLine),
    total: typeof odd0.overUnder === "number" ? odd0.overUnder : null,
    overOdds: ((tot.over as { close?: { odds?: string } } | undefined)?.close?.odds ?? null) as string | null,
    underOdds: ((tot.under as { close?: { odds?: string } } | undefined)?.close?.odds ?? null) as string | null,
  };
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Linework/1.0 (soccer consensus)" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function fetchScoreboard(slug: string, dates: string): Promise<Record<string, unknown>[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${dates}`;
  const data = await fetchJson(url);
  return (data?.events as Record<string, unknown>[]) ?? [];
}

export async function fetchSlateFixtures(day: Date): Promise<Fixture[]> {
  const next = new Date(day.getTime() + 36 * 3600_000);
  const range = `${ymd(day)}-${ymd(next)}`;
  const dayStr = day.toISOString().slice(0, 10);
  const nextStr = next.toISOString().slice(0, 10);
  const batches = await Promise.all(
    LEAGUES.map(async (lg) => {
      const events = await fetchScoreboard(lg.slug, range);
      return events
        .map((e) => parseEspnEvent(e, lg.name, lg.slug))
        .filter((f): f is Fixture => {
          if (!f) return false;
          const d = f.start.slice(0, 10);
          return d === dayStr || d === nextStr;
        });
    }),
  );
  const seen = new Set<string>();
  const out: Fixture[] = [];
  for (const f of batches.flat()) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    out.push(f);
  }
  return out.sort((a, b) => +new Date(a.start) - +new Date(b.start));
}

export async function fetchHistoryFixtures(end: Date, days = 21): Promise<Fixture[]> {
  const start = new Date(end.getTime() - days * 86400_000);
  const range = `${ymd(start)}-${ymd(end)}`;
  const batches = await Promise.all(
    LEAGUES.map(async (lg) => {
      const events = await fetchScoreboard(lg.slug, range);
      return events
        .map((e) => parseEspnEvent(e, lg.name, lg.slug))
        .filter((f): f is Fixture => !!f && f.status === "post");
    }),
  );
  const seen = new Set<string>();
  const out: Fixture[] = [];
  for (const f of batches.flat()) {
    if (seen.has(f.id)) continue;
    if (f.home.score == null || f.away.score == null) continue;
    seen.add(f.id);
    out.push(f);
  }
  return out.sort((a, b) => +new Date(a.start) - +new Date(b.start));
}

export async function enrichOdds(fixtures: Fixture[]): Promise<Fixture[]> {
  const pending = fixtures.filter((f) => f.home.ml == null && f.away.ml == null);
  if (!pending.length) return fixtures;

  const byId = new Map(fixtures.map((f) => [f.id, f]));
  const queue = [...pending];
  const workers = Array.from({ length: 10 }, async () => {
    while (queue.length) {
      const f = queue.shift();
      if (!f) break;
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${f.leagueSlug}/summary?event=${f.id}`;
      const data = await fetchJson(url);
      if (!data) continue;
      const pc = data.pickcenter;
      const odd = Array.isArray(pc) ? pc[0] : pc;
      if (!odd || typeof odd !== "object") continue;
      const o = odd as Record<string, unknown>;
      const home = (o.homeTeamOdds ?? {}) as Record<string, unknown>;
      const away = (o.awayTeamOdds ?? {}) as Record<string, unknown>;
      const draw = (o.drawOdds ?? {}) as Record<string, unknown>;
      byId.set(f.id, {
        ...f,
        home: { ...f.home, ml: parseOdds(home.moneyLine) },
        away: { ...f.away, ml: parseOdds(away.moneyLine) },
        drawMl: parseOdds(draw.moneyLine),
        total: typeof o.overUnder === "number" ? o.overUnder : f.total,
        overOdds:
          typeof o.overOdds === "number"
            ? `${o.overOdds > 0 ? "+" : ""}${Math.round(Number(o.overOdds))}`
            : f.overOdds,
        underOdds:
          typeof o.underOdds === "number"
            ? `${o.underOdds > 0 ? "+" : ""}${Math.round(Number(o.underOdds))}`
            : f.underOdds,
      });
    }
  });
  await Promise.all(workers);
  return fixtures.map((f) => byId.get(f.id) ?? f);
}
