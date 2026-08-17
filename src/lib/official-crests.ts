import { useEffect, useState } from "react";

type CrestIndex = { byName: Record<string, string> };

let cache: CrestIndex | null = null;
const listeners = new Set<() => void>();

/** Paths that came from bad Wikipedia hits (players, lists, national teams). */
const BAD_PATH =
  /footballer|list-of-|national-football-team|in-european-football|mertesacker|martens|ascacibar|gyomber|zahzu|leyes|davids|urozov|levi-footballer|silva-footballer|luciano-footballer|2025-norwegian|malawi-national/i;

export function normTeam(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isUsablePath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (BAD_PATH.test(path)) return false;
  return true;
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

export function officialCrestPath(name: string): string | null {
  if (!cache) return null;
  const path = cache.byName[normTeam(name)] ?? null;
  return isUsablePath(path) ? path : null;
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
  return officialCrestPath(name);
}

export function preloadOfficialCrests() {
  if (typeof window !== "undefined") void loadIndex();
}
