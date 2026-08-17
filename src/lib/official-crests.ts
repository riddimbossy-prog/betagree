import { useEffect, useState } from "react";
import { findCrestOnline } from "@/lib/crest-online";

type CrestIndex = { byName: Record<string, string> };

let cache: CrestIndex | null = null;
const listeners = new Set<() => void>();
const pending = new Map<string, Promise<string | null>>();
const asked = new Set<string>();

/** Paths that came from bad Wikipedia hits (players, lists, national teams). */
const BAD_PATH =
  /footballer|list-of-|national-football-team|in-european-football|mertesacker|martens|ascacibar|gyomber|zahzu|leyes|davids|urozov|levi-footballer|silva-footballer|luciano-footballer|2025-norwegian|malawi-national/i;

const STOP = new Set([
  "fc",
  "cf",
  "sc",
  "afc",
  "cfc",
  "fk",
  "sk",
  "ac",
  "cd",
  "the",
  "de",
  "do",
  "da",
  "di",
  "united",
  "city",
  "town",
  "football",
  "soccer",
  "sporting",
  "sport",
  "sports",
  "atletico",
  "atl",
  "real",
  "hotspur",
]);

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
  "saint etienne": "as saint etienne",
  "st etienne": "as saint etienne",
  "st mirren fc": "st mirren",
  "st johnstone fc": "st johnstone",
  "st johnstone": "st johnstone",
  "tigres uanl": "tigres",
  "cd guadalajara": "guadalajara",
  chivas: "guadalajara",
  "club tijuana de caliente": "club tijuana",
  "santos laguna": "club santos laguna",
  "psv eindhoven": "psv",
  "fc midtjylland": "midtjylland",
  "grenoble foot": "grenoble",
  "hull city": "hull city",
  "coventry city": "coventry city",
  monza: "ac monza",
  "ac monza": "ac monza",
  rennes: "stade rennais",
  "sc cambuur": "cambuur",
  "bk hacken": "hacken",
  "halmstad bk": "halmstad",
  "halmstads bk": "halmstad",
  "fc arouca": "arouca",
  benfica: "sl benfica",
  "atlante fc": "atlante",
  "randers fc": "randers",
  "inter miami cf": "inter miami",
  "toronto fc": "toronto",
  "east bengal fc": "east bengal",
  "persik kediri": "persik",
  "ayeyawady fc": "ayeyawady",
  "fc jurong": "jurong",
};

/** Always-on paths so a wiped index cannot drop stubborn clubs. */
const PINNED: Record<string, string> = {
  monza: "/crests/ac-monza.png",
  "ac monza": "/crests/ac-monza.png",
  "associazione calcio monza": "/crests/ac-monza.png",
  "club brugge": "/crests/club-brugge.png",
  "club brugge kv": "/crests/club-brugge.png",
  "cercle brugge": "/crests/cercle-brugge.png",
  "cercle brugge ksv": "/crests/cercle-brugge.png",
};

export function normTeam(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(name: string) {
  return normTeam(name)
    .split(" ")
    .filter((t) => t.length > 1 && !STOP.has(t));
}

function isUsablePath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (BAD_PATH.test(path)) return false;
  return true;
}

export function distinctiveConflict(a: string, b: string) {
  const ta = new Set(tokens(a));
  const tb = new Set(tokens(b));
  const onlyA = [...ta].filter((t) => !tb.has(t));
  const onlyB = [...tb].filter((t) => !ta.has(t));
  return onlyA.length > 0 && onlyB.length > 0;
}

function scoreKey(query: string, key: string) {
  const q = normTeam(query);
  const k = normTeam(key);
  if (!q || !k) return 0;
  if (q === k) return 1;
  if (distinctiveConflict(q, k)) return 0;
  const qt = tokens(q);
  const kt = tokens(k);
  if (qt.length === 1 && qt[0].length < 6) {
    if (kt.length === 1 && kt[0] === qt[0]) return 0.96;
    if (k === qt[0] || k.startsWith(`${qt[0]} `)) return 0.9;
    return 0;
  }
  if (k === q || q === k) return 1;
  if (k.startsWith(`${q} `) || q.startsWith(`${k} `)) return 0.93;
  if (qt.length && kt.length && qt.join(" ") === kt.join(" ")) return 0.94;
  if (!qt.length || !kt.length) return 0;
  let hit = 0;
  for (const t of qt) if (kt.includes(t)) hit += 1;
  const j = hit / Math.max(qt.length, kt.length);
  if (j >= 0.99) return 0.92;
  if (j >= 0.67 && hit === qt.length) return 0.86;
  return j >= 0.8 ? 0.8 : 0;
}

export function resolveCrestPath(name: string, byName: Record<string, string>): string | null {
  const q = normTeam(name);
  if (!q) return null;
  const pinned = PINNED[q] ?? (ALIAS[q] ? PINNED[normTeam(ALIAS[q])] : null);
  if (isUsablePath(pinned)) return pinned;
  const direct = byName[q];
  if (isUsablePath(direct)) return direct;
  const alias = ALIAS[q];
  if (alias) {
    const hit = byName[alias] ?? byName[normTeam(alias)];
    if (isUsablePath(hit)) return hit;
  }
  let best: { path: string; score: number } | null = null;
  const needles = [q, alias].filter(Boolean) as string[];
  for (const [key, path] of Object.entries(byName)) {
    if (!isUsablePath(path)) continue;
    let s = 0;
    for (const n of needles) s = Math.max(s, scoreKey(n, key));
    if (s < 0.86) continue;
    if (!best || s > best.score || (s === best.score && path.includes("/crests/ss-"))) {
      best = { path, score: s };
    }
  }
  return best?.path ?? null;
}

function emit() {
  for (const fn of listeners) fn();
}

async function loadIndex() {
  if (cache) return cache;
  try {
    const res = await fetch("/crests/index.json");
    const json = res.ok ? await res.json() : { byName: {} };
    const byName: Record<string, string> = {};
    for (const [k, v] of Object.entries(json.byName ?? {})) {
      if (typeof v === "string" && isUsablePath(v)) byName[k] = v;
    }
    cache = { byName };
  } catch {
    cache = { byName: {} };
  }
  emit();
  return cache;
}

function remember(name: string, path: string) {
  if (!cache || !isUsablePath(path)) return;
  cache.byName[normTeam(name)] = path;
  emit();
}

async function askServer(name: string): Promise<string | null> {
  const key = normTeam(name);
  if (!key || asked.has(key)) return officialCrestPath(name);
  asked.add(key);
  if (pending.has(key)) return pending.get(key)!;
  const job = (async () => {
    try {
      const api = (await fetch(`/api/crest?name=${encodeURIComponent(name)}`)
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null)) as { path?: string; remote?: string } | null;
      let path = api?.path || api?.remote || null;
      if (!path && typeof window !== "undefined" && /localhost|127\.0\.0\.1/.test(window.location.hostname)) {
        path = await findCrestOnline(name);
      }
      if (path && isUsablePath(path)) {
        remember(name, path);
        return path;
      }
    } catch {
      /* keep heraldry fallback */
    }
    return null;
  })();
  pending.set(key, job);
  return job;
}

export function officialCrestPath(name: string): string | null {
  return resolveCrestPath(name, cache?.byName ?? {});
}

export function useOfficialCrest(name: string): string | null {
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = () => setTick((n) => n + 1);
    listeners.add(unsub);
    void loadIndex();
    return () => {
      listeners.delete(unsub);
    };
  }, []);
  useEffect(() => {
    if (!name) return;
    const hit = officialCrestPath(name);
    if (!hit) void askServer(name);
  }, [name]);
  return officialCrestPath(name);
}

export function preloadOfficialCrests() {
  if (typeof window !== "undefined") void loadIndex();
}
