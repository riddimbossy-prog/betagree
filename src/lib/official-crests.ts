import { useEffect, useState } from "react";
import { findCrestOnline } from "@/lib/crest-online";
import { parseJsonLoose } from "@/lib/safe-fetch";

type CrestIndex = { byName: Record<string, string> };

let cache: CrestIndex | null = null;
const listeners = new Set<() => void>();
const pending = new Map<string, Promise<string | null>>();
const askedAt = new Map<string, number>();
const waiters: Array<() => void> = [];
let inFlight = 0;
const MAX_LIVE = 4;
const RETRY_MS = 20_000;

async function withCrestSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (inFlight >= MAX_LIVE) {
    await new Promise<void>((resolve) => waiters.push(resolve));
  }
  inFlight += 1;
  try {
    return await fn();
  } finally {
    inFlight -= 1;
    waiters.shift()?.();
  }
}

const BAD_PATH =
  /footballer|list-of-|national-football-team|in-european-football|mertesacker|martens|ascacibar|gyomber|zahzu|leyes|davids|urozov|levi-footballer|silva-footballer|luciano-footballer|2025-norwegian|malawi-national/i;

const LEGAL = new Set([
  "fc",
  "cf",
  "sc",
  "cs",
  "afc",
  "cfc",
  "sfc",
  "ifc",
  "fk",
  "kf",
  "sk",
  "bk",
  "if",
  "ff",
  "ac",
  "cd",
  "ce",
  "jk",
  "bsc",
  "the",
  "de",
  "do",
  "da",
  "di",
  "del",
  "la",
  "el",
  "club",
  "clube",
  "futebol",
  "football",
  "fodbold",
  "soccer",
  "united",
  "city",
  "town",
  "hotspur",
]);

const CITY_TAIL = new Set([
  "istanbul",
  "bern",
  "prague",
  "praha",
  "doha",
  "athens",
  "athinon",
  "amsterdam",
  "eindhoven",
  "lisbon",
  "london",
  "madrid",
  "moscow",
  "kyiv",
  "sofia",
  "zagreb",
]);

const STOP = new Set([...LEGAL, "sporting", "sport", "sports", "atletico", "atl", "real"]);

const ALIAS: Record<string, string> = {
  "man city": "manchester city",
  mancity: "manchester city",
  "man utd": "manchester united",
  "man united": "manchester united",
  manutd: "manchester united",
  psg: "paris saint germain",
  "paris sg": "paris saint germain",
  inter: "internazionale",
  "inter milan": "internazionale",
  porto: "fc porto",
  celtic: "celtic fc",
  rangers: "rangers fc",
  bournemouth: "afc bournemouth",
  "club brugge": "club brugge kv",
  "cercle brugge": "cercle brugge ksv",
  "casa pia lisbon": "casa pia",
  "fenerbahce istanbul": "fenerbahce",
  "besiktas istanbul": "besiktas",
  "saint etienne": "as saint etienne",
  "st etienne": "as saint etienne",
  "st mirren fc": "st mirren",
  "st johnstone fc": "st johnstone",
  "tigres uanl": "tigres",
  "cd guadalajara": "guadalajara",
  chivas: "guadalajara",
  "club tijuana de caliente": "club tijuana",
  "santos laguna": "club santos laguna",
  "psv eindhoven": "psv",
  monza: "ac monza",
  "ac monza": "ac monza",
  rennes: "stade rennais",
  "sc cambuur": "cambuur",
  "bk hacken": "hacken",
  "halmstad bk": "halmstad",
  "halmstads bk": "halmstad",
  "fc arouca": "arouca",
  benfica: "sl benfica",
  "inter miami cf": "inter miami",
  "toronto fc": "toronto",
  "young boys bern": "young boys",
  "al hilal sfc": "al hilal",
  "al nassr club": "al nassr",
  "al riyadh sc": "al riyadh",
  "khor fakkan club": "khor fakkan",
  "alverca futebol": "alverca",
  "cs cienciano": "cienciano",
  "kf aegir": "aegir",
  "cd sabadell": "ce sabadell",
  "maxline vitebsk": "ml vitebsk",
  "bohemians prague 1905": "bohemians 1905",
};

const PINNED: Record<string, string> = {
  monza: "https://img.sofascore.com/api/v1/team/2729/image",
  "ac monza": "https://img.sofascore.com/api/v1/team/2729/image",
  "associazione calcio monza": "https://img.sofascore.com/api/v1/team/2729/image",
  "club brugge": "https://img.sofascore.com/api/v1/team/2888/image",
  "club brugge kv": "https://img.sofascore.com/api/v1/team/2888/image",
  "cercle brugge": "https://img.sofascore.com/api/v1/team/2929/image",
  "cercle brugge ksv": "https://img.sofascore.com/api/v1/team/2929/image",
  "fenerbahce istanbul": "https://img.sofascore.com/api/v1/team/3052/image",
  fenerbahce: "https://img.sofascore.com/api/v1/team/3052/image",
  "besiktas istanbul": "https://img.sofascore.com/api/v1/team/3050/image",
  besiktas: "https://img.sofascore.com/api/v1/team/3050/image",
};

export function normTeam(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/ł/g, "l")
    .replace(/đ/g, "d")
    .replace(/ð/g, "d")
    .replace(/þ/g, "th")
    .replace(/ß/g, "ss")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanName(name: string) {
  return name.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
}

/** Every index key a board name should hit. */
export function nameKeys(name: string): string[] {
  const keys = new Set<string>();
  const n = normTeam(cleanName(name));
  if (!n) return [];
  keys.add(n);
  if (ALIAS[n]) keys.add(normTeam(ALIAS[n]));
  const parts = n.split(" ").filter((p) => p && !LEGAL.has(p) && !CITY_TAIL.has(p));
  if (parts.length) keys.add(parts.join(" "));
  if (parts.length >= 2) keys.add(parts.slice(-2).join(" "));
  return [...keys];
}

/** If a local ss-ID file 404s, the SofaScore CDN still has the badge. */
export function sofaMirror(path: string | null | undefined): string | null {
  if (!path) return null;
  const id = path.match(/ss-(\d+)\.png/)?.[1] ?? path.match(/\/team\/(\d+)\/image/)?.[1];
  return id ? `https://img.sofascore.com/api/v1/team/${id}/image` : null;
}

export function crestCandidates(official: string | null | undefined, logo?: string | null): string[] {
  const out: string[] = [];
  const add = (s?: string | null) => {
    if (!s || out.includes(s)) return;
    out.push(s);
    const mirror = sofaMirror(s);
    if (mirror && !out.includes(mirror)) out.push(mirror);
  };
  add(official);
  add(logo);
  return out;
}

function tokens(name: string) {
  return normTeam(name)
    .split(" ")
    .filter((t) => t.length > 1 && !STOP.has(t) && !CITY_TAIL.has(t));
}

function isUsablePath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (BAD_PATH.test(path)) return false;
  if (path.startsWith("/crests/")) return true;
  if (path.startsWith("https://")) return true;
  return false;
}

export function distinctiveConflict(a: string, b: string) {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  const onlyA = [...ta].filter((t) => !tb.has(t));
  const onlyB = [...tb].filter((t) => !ta.has(t));
  return onlyA.length > 0 && onlyB.length > 0;
}

export function resolveCrestPath(name: string, byName: Record<string, string>): string | null {
  if (!name) return null;
  for (const q of nameKeys(name)) {
    const pinned = PINNED[q];
    if (isUsablePath(pinned)) return pinned;
    const direct = byName[q];
    if (isUsablePath(direct)) return direct;
  }
  return null;
}

function emit() {
  for (const fn of listeners) fn();
}

let emitQueued = false;
function emitSoon() {
  if (emitQueued) return;
  emitQueued = true;
  queueMicrotask(() => {
    emitQueued = false;
    emit();
  });
}

let indexAt = 0;

async function loadIndex() {
  if (cache && Object.keys(cache.byName).length >= 200 && Date.now() - indexAt < 10 * 60_000) return cache;
  try {
    const res = await fetch("/crests/index.json", { signal: AbortSignal.timeout(10_000) });
    const raw = res.ok ? await res.text() : "{}";
    const json = parseJsonLoose<{ byName?: Record<string, string> }>(raw, { byName: {} });
    const byName: Record<string, string> = {};
    for (const [k, v] of Object.entries(json.byName ?? {})) {
      if (typeof v === "string" && isUsablePath(v)) byName[k] = v;
    }
    for (const [k, path] of Object.entries(PINNED)) {
      if (isUsablePath(path)) byName[k] = path;
    }
    if (typeof localStorage !== "undefined") {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k?.startsWith("crest:")) continue;
          const v = localStorage.getItem(k);
          if (v && isUsablePath(v)) byName[k.slice(6)] = v;
        }
      } catch {
        /* ignore */
      }
    }
    cache = { byName };
    indexAt = Date.now();
  } catch {
    const byName: Record<string, string> = {};
    for (const [k, path] of Object.entries(PINNED)) {
      if (isUsablePath(path)) byName[k] = path;
    }
    cache = { byName };
    indexAt = Date.now();
  }
  emitSoon();
  return cache;
}

function remember(name: string, path: string) {
  if (!cache || !isUsablePath(path)) return;
  for (const k of nameKeys(name)) cache.byName[k] = path;
  emitSoon();
}

async function askServer(name: string): Promise<string | null> {
  const key = normTeam(name);
  if (!key) return officialCrestPath(name);
  const last = askedAt.get(key) ?? 0;
  if (Date.now() - last < RETRY_MS && officialCrestPath(name)) return officialCrestPath(name);
  if (Date.now() - last < RETRY_MS && pending.has(key)) return pending.get(key)!;
  if (Date.now() - last < RETRY_MS && askedAt.has(key)) return officialCrestPath(name);
  askedAt.set(key, Date.now());
  if (pending.has(key)) return pending.get(key)!;
  const job = (async () => {
    try {
      const api = (await withCrestSlot(() =>
        fetch(`/api/crest?name=${encodeURIComponent(name)}`, { signal: AbortSignal.timeout(12_000) })
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null),
      )) as { path?: string; remote?: string } | null;
      let path = api?.remote || api?.path || null;
      if (!path && typeof window !== "undefined") {
        path = await withCrestSlot(() => findCrestOnline(name));
      }
      if (path && isUsablePath(path)) {
        remember(name, path);
        try {
          for (const k of nameKeys(name)) localStorage.setItem(`crest:${k}`, path);
        } catch {
          /* private mode */
        }
        return path;
      }
    } catch {
      askedAt.delete(key);
    }
    return officialCrestPath(name);
  })();
  pending.set(key, job);
  try {
    return await job;
  } finally {
    pending.delete(key);
  }
}

export function officialCrestPath(name: string): string | null {
  const path = resolveCrestPath(name, cache?.byName ?? {});
  return sofaMirror(path) ?? path;
}

export function useOfficialCrest(name: string): string | null {
  const [path, setPath] = useState(() => officialCrestPath(name));
  useEffect(() => {
    const sync = () => {
      const next = officialCrestPath(name);
      setPath((prev) => (prev === next ? prev : next));
    };
    listeners.add(sync);
    void loadIndex().then(sync);
    if (!officialCrestPath(name)) void askServer(name);
    return () => {
      listeners.delete(sync);
    };
  }, [name]);
  return path;
}

export function ensureCrests(names: string[]) {
  if (typeof window === "undefined") return;
  void loadIndex().then(() => {
    let queued = 0;
    for (const name of names) {
      if (!name || officialCrestPath(name)) continue;
      void askServer(name);
      queued += 1;
      if (queued >= 12) break;
    }
  });
}

export function preloadOfficialCrests() {
  if (typeof window !== "undefined") void loadIndex();
}
