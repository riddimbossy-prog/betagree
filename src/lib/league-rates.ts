import { useEffect, useState } from "react";
import type { ConsensusItem, Fixture } from "@/lib/types";
import { fetchJson } from "@/lib/safe-fetch";

export type LeagueRateRow = {
  n: number;
  home: number;
  draw: number;
  away: number;
  over15: number;
  over25: number;
  over35: number;
  btts: number;
  gpg: number;
};

export type LeagueRatesFile = {
  updatedAt: string;
  sample: number;
  global: LeagueRateRow;
  leagues: Record<string, LeagueRateRow>;
};

const emptyRow = (): LeagueRateRow => ({
  n: 0,
  home: 0,
  draw: 0,
  away: 0,
  over15: 0,
  over25: 0,
  over35: 0,
  btts: 0,
  gpg: 0,
});

type Tally = LeagueRateRow & {
  homeN: number;
  drawN: number;
  awayN: number;
  over15N: number;
  over25N: number;
  over35N: number;
  bttsN: number;
  goals: number;
};

function emptyTally(): Tally {
  return { ...emptyRow(), homeN: 0, drawN: 0, awayN: 0, over15N: 0, over25N: 0, over35N: 0, bttsN: 0, goals: 0 };
}

function finish(t: Tally): LeagueRateRow {
  const n = t.n || 1;
  return {
    n: t.n,
    home: t.homeN / n,
    draw: t.drawN / n,
    away: t.awayN / n,
    over15: t.over15N / n,
    over25: t.over25N / n,
    over35: t.over35N / n,
    btts: t.bttsN / n,
    gpg: t.goals / n,
  };
}

function parseLine(selection: string, fallback = 2.5) {
  const match = String(selection).match(/^(over|under)(?::(\d+(?:\.\d+)?))?$/i);
  if (!match) return { side: "over" as const, line: fallback };
  return {
    side: match[1].toLowerCase() as "over" | "under",
    line: match[2] ? Number(match[2]) : fallback,
  };
}

export function ratesFromFixtures(fixtures: Fixture[]): LeagueRatesFile {
  const by = new Map<string, Tally>();
  const world = emptyTally();
  for (const fixture of fixtures) {
    const hs = fixture.home?.score;
    const as = fixture.away?.score;
    if (hs == null || as == null || !Number.isFinite(hs) || !Number.isFinite(as)) continue;
    const league = fixture.league || "Unknown";
    const tally = by.get(league) ?? emptyTally();
    const goals = hs + as;
    const apply = (row: Tally) => {
      row.n += 1;
      row.goals += goals;
      if (hs > as) row.homeN += 1;
      else if (as > hs) row.awayN += 1;
      else row.drawN += 1;
      if (goals > 1.5) row.over15N += 1;
      if (goals > 2.5) row.over25N += 1;
      if (goals > 3.5) row.over35N += 1;
      if (hs > 0 && as > 0) row.bttsN += 1;
    };
    apply(tally);
    apply(world);
    by.set(league, tally);
  }
  const leagues: Record<string, LeagueRateRow> = {};
  for (const [name, tally] of by) leagues[name] = finish(tally);
  return {
    updatedAt: new Date().toISOString(),
    sample: world.n,
    global: finish(world),
    leagues,
  };
}

function blend(row: LeagueRateRow, global: LeagueRateRow, prior = 12): LeagueRateRow {
  const n = row.n;
  const w = n / (n + prior);
  const mix = (a: number, b: number) => w * a + (1 - w) * b;
  return {
    n,
    home: mix(row.home, global.home),
    draw: mix(row.draw, global.draw),
    away: mix(row.away, global.away),
    over15: mix(row.over15, global.over15),
    over25: mix(row.over25, global.over25),
    over35: mix(row.over35, global.over35),
    btts: mix(row.btts, global.btts),
    gpg: mix(row.gpg, global.gpg),
  };
}

export function leagueRow(file: LeagueRatesFile | null | undefined, league: string | undefined): LeagueRateRow | null {
  if (!file) return null;
  if (league && file.leagues[league]) return blend(file.leagues[league], file.global);
  return file.global.n ? file.global : null;
}

export function leagueHitRate(file: LeagueRatesFile | null | undefined, item: ConsensusItem): number | null {
  const row = leagueRow(file, item.fixture?.league);
  if (!row) return null;
  if (item.market === "1x2") {
    if (item.selection === "home") return row.home;
    if (item.selection === "away") return row.away;
    return row.draw;
  }
  if (item.market === "dnb") {
    if (item.selection === "home") return row.home + row.draw;
    if (item.selection === "away") return row.away + row.draw;
    return row.draw;
  }
  if (item.market === "dc") {
    if (item.selection === "1X") return row.home + row.draw;
    if (item.selection === "X2") return row.away + row.draw;
    if (item.selection === "12") return row.home + row.away;
    return row.draw;
  }
  if (item.market === "total") {
    const { side, line } = parseLine(item.selection, item.fixture.total ?? 2.5);
    const over = line <= 1.5 ? row.over15 : line <= 2.5 ? row.over25 : row.over35;
    return side === "over" ? over : 1 - over;
  }
  if (item.market === "btts") return item.selection === "yes" ? row.btts : 1 - row.btts;
  return null;
}

export function formatHitPct(rate: number | null) {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

let cache: LeagueRatesFile | null = null;

export function getLeagueRates() {
  return cache;
}

export function setLeagueRates(next: LeagueRatesFile | null) {
  cache = next;
}

export function useLeagueRates(seedFixtures?: Fixture[]) {
  const [rates, setRates] = useState<LeagueRatesFile | null>(cache);
  useEffect(() => {
    let cancelled = false;
    void fetchJson<LeagueRatesFile>("/data/league-rates.json", { timeoutMs: 8000, retries: 1 })
      .then((file) => {
        if (cancelled || !file?.global) return;
        cache = file;
        setRates(file);
      })
      .catch(() => {
        if (cancelled || cache) return;
        if (seedFixtures?.length) {
          cache = ratesFromFixtures(seedFixtures);
          setRates(cache);
        }
      });
    return () => {
      cancelled = true;
    };
    // Seed is a last-resort fallback; don't refetch when the board list identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return rates;
}
