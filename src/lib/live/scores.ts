import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Fixture } from "../types";
import { getBoardPairs } from "./board-pairs";
import { matchPatch, pairScore, type ScorePatch } from "./score-apply";

export type { ScorePatch } from "./score-apply";
export { applySlateScores, applyPatches, matchPatch } from "./score-apply";

const LIVE_URL = "https://img.sofascore.com/api/v1/sport/football/events/live";
const EVENT_URL = "https://img.sofascore.com/api/v1/event/";
const SEARCH_URL = "https://img.sofascore.com/api/v1/search/all";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const FRESH_MS = 8_000;
const STALE_MS = 45_000;
const BOARD_PATHS = [join(tmpdir(), "board-scores.json"), join(process.cwd(), "public/data/scores.json")];

type FeedEvent = {
  id?: number;
  homeTeam?: { name?: string };
  awayTeam?: { name?: string };
  homeScore?: { current?: number; display?: number };
  awayScore?: { current?: number; display?: number };
  status?: { code?: number; type?: string; description?: string };
  time?: { currentPeriodStartTimestamp?: number; initial?: number };
  statusTime?: { currentPeriodStartTimestamp?: number; initial?: number; timestamp?: number };
  startTimestamp?: number;
  currentPeriodStartTimestamp?: number;
  tournament?: { name?: string };
};

type LiveCache = {
  all: ScorePatch[];
  finished: ScorePatch[];
  at: number;
  inflight: Promise<ScorePatch[]> | null;
  finishedInflight: Promise<void> | null;
  ids: Map<string, number>;
};

const g = globalThis as typeof globalThis & { __liveScoreCache?: LiveCache };
const cache: LiveCache = (g.__liveScoreCache ??= {
  all: [],
  finished: [],
  at: 0,
  inflight: null,
  finishedInflight: null,
  ids: new Map<string, number>(),
});

const DISK = join(tmpdir(), "live-score-cache.json");

function readDisk(): ScorePatch[] {
  try {
    const raw = JSON.parse(readFileSync(DISK, "utf8")) as { at?: number; all?: ScorePatch[] };
    if (!raw.all?.length || !raw.at) return [];
    if (Date.now() - raw.at > STALE_MS) return [];
    cache.all = raw.all;
    cache.at = raw.at;
    return raw.all;
  } catch {
    return [];
  }
}

function writeDisk(all: ScorePatch[], at: number) {
  try {
    writeFileSync(DISK, JSON.stringify({ at, all }));
  } catch {
    /* ignore */
  }
}

function readBoardScores(): ScorePatch[] {
  for (const path of BOARD_PATHS) {
    try {
      const raw = JSON.parse(readFileSync(path, "utf8")) as { scores?: ScorePatch[] };
      if (raw.scores?.length) return raw.scores;
    } catch {
      /* try next */
    }
  }
  return [];
}

function patchKey(p: ScorePatch) {
  return `${norm(p.home)}|${norm(p.away)}`;
}

function mergeScorePatches(primary: ScorePatch[], secondary: ScorePatch[]): ScorePatch[] {
  const out: ScorePatch[] = [];
  const seen = new Set<string>();
  for (const p of [...primary, ...secondary]) {
    const key = patchKey(p);
    const swap = `${norm(p.away)}|${norm(p.home)}`;
    if (seen.has(key) || seen.has(swap)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

function withBoard(live: ScorePatch[]) {
  return mergeScorePatches(readBoardScores(), live);
}

function headers() {
  return {
    "User-Agent": UA,
    Accept: "application/json",
    Origin: "https://www.sofascore.com",
    Referer: "https://www.sofascore.com/",
  };
}

function norm(s: string) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function goals(side?: { current?: number; display?: number }) {
  const n = side?.current ?? side?.display;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function clock(ev: FeedEvent) {
  const st = ev.status ?? {};
  const type = String(st.type ?? "");
  const desc = String(st.description ?? "");
  if (type === "finished" || st.code === 100) return "FT";
  if (st.code === 31 || /half/i.test(desc)) return "HT";
  if (type === "notstarted") return "Scheduled";
  const t = ev.time ?? ev.statusTime ?? {};
  const start = Number(t.currentPeriodStartTimestamp ?? ev.currentPeriodStartTimestamp ?? 0);
  const initial = Number(t.initial ?? 0);
  if (!start) return desc || "Live";
  const mins = Math.max(1, Math.floor((Date.now() / 1000 - start + initial) / 60));
  return `${mins}'`;
}

function toPatch(ev: FeedEvent): ScorePatch | null {
  const home = ev.homeTeam?.name;
  const away = ev.awayTeam?.name;
  const hs = goals(ev.homeScore);
  const as = goals(ev.awayScore);
  if (!home || !away || hs == null || as == null) return null;
  const type = String(ev.status?.type ?? "");
  const live = type === "inprogress";
  const status: ScorePatch["status"] = live ? "in" : type === "finished" ? "post" : "pre";
  return {
    home,
    away,
    homeScore: hs,
    awayScore: as,
    live,
    status,
    detail: clock(ev),
    league: ev.tournament?.name ?? null,
  };
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchLivePatches(): Promise<ScorePatch[]> {
  const data = await getJson<{ events?: FeedEvent[] }>(LIVE_URL);
  return (data?.events ?? []).map(toPatch).filter((p): p is ScorePatch => !!p);
}

export async function fetchEventPatch(id: number): Promise<ScorePatch | null> {
  const data = await getJson<{ event?: FeedEvent }>(`${EVENT_URL}${id}`);
  return data?.event ? toPatch(data.event) : null;
}

function cacheKey(home: string, away: string, day: string) {
  return `${norm(home)}|${norm(away)}|${day}`;
}

export function peekLivePatches(): ScorePatch[] {
  const live = cache.all.length ? mergeFinished(cache.all) : [];
  return withBoard(live);
}

function mergeFinished(live: ScorePatch[]) {
  if (!cache.finished.length) return live;
  const leftover = cache.finished.filter((p) => !matchPatch(p.home, p.away, live));
  return leftover.length ? [...live, ...leftover] : live;
}

export function boardScores(patches: ScorePatch[] = peekLivePatches()): ScorePatch[] {
  const pairs = getBoardPairs();
  if (!pairs.length) return patches;
  const out: ScorePatch[] = [];
  const seen = new Set<string>();
  for (const pair of pairs) {
    const hit = matchPatch(pair.home, pair.away, patches);
    if (!hit) continue;
    const key = `${hit.patch.home}|${hit.patch.away}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit.patch);
  }
  return out;
}

async function refreshLive(): Promise<ScorePatch[]> {
  if (cache.inflight) return cache.inflight;
  cache.inflight = fetchLivePatches()
    .then((all) => {
      if (all.length) {
        cache.all = all;
        cache.at = Date.now();
        writeDisk(all, cache.at);
      }
      return mergeFinished(cache.all);
    })
    .finally(() => {
      cache.inflight = null;
    });
  return cache.inflight;
}

export async function getLivePatches(mode: "fresh" | "fast" = "fast"): Promise<ScorePatch[]> {
  if (!cache.all.length) readDisk();
  const age = Date.now() - cache.at;
  if (cache.all.length && age < FRESH_MS) return withBoard(mergeFinished(cache.all));
  if (mode === "fast" && cache.all.length && age < STALE_MS) {
    void refreshLive();
    return withBoard(mergeFinished(cache.all));
  }
  if (cache.all.length) {
    try {
      return withBoard(await refreshLive());
    } catch {
      return withBoard(mergeFinished(cache.all));
    }
  }
  return withBoard(await refreshLive());
}

export async function lookupStartedPatches(fixtures: Fixture[]): Promise<ScorePatch[]> {
  const now = Date.now();
  const due = fixtures.filter((f) => {
    const start = Date.parse(f.start);
    return Number.isFinite(start) && start < now - 8 * 60_000 && !f.live;
  });
  const out: ScorePatch[] = [];
  const queue = due.slice(0, 16);
  const workers = Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const f = queue.shift();
      if (!f) break;
      const day = f.start.slice(0, 10);
      const key = cacheKey(f.home.name, f.away.name, day);
      let id = cache.ids.get(key);
      if (!id) {
        const q = encodeURIComponent(`${f.home.name} ${f.away.name}`);
        const data = await getJson<{ results?: { type?: string; entity?: FeedEvent }[] }>(
          `${SEARCH_URL}?q=${q}&page=0`,
        );
        const events = (data?.results ?? []).filter((r) => r.type === "event" && r.entity).map((r) => r.entity!);
        let best: { id: number; score: number } | null = null;
        for (const ev of events) {
          const home = ev.homeTeam?.name ?? "";
          const away = ev.awayTeam?.name ?? "";
          const hit = pairScore(f.home.name, f.away.name, { home, away });
          if (hit.score < 0.84) continue;
          const ts = Number(ev.startTimestamp ?? 0) * 1000;
          const start = Date.parse(f.start);
          if (Number.isFinite(start) && ts && Math.abs(ts - start) > 18 * 3600_000) continue;
          if (!best || hit.score > best.score) best = { id: Number(ev.id), score: hit.score };
        }
        if (best?.id) {
          id = best.id;
          cache.ids.set(key, id);
        }
      }
      if (!id) continue;
      const patch = await fetchEventPatch(id);
      if (patch) out.push(patch);
    }
  });
  await Promise.all(workers);
  return out;
}

export function scheduleFinishedLookups(fixtures: Fixture[]) {
  if (cache.finishedInflight) return;
  const leftover = fixtures.filter((f) => !matchPatch(f.home.name, f.away.name, peekLivePatches()));
  if (!leftover.length) return;
  cache.finishedInflight = lookupStartedPatches(leftover)
    .then((extra) => {
      if (extra.length) cache.finished = extra;
    })
    .finally(() => {
      cache.finishedInflight = null;
    });
}
