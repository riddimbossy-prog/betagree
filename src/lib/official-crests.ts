import { useEffect, useState } from "react";

type CrestIndex = { byName: Record<string, string> };

let cache: CrestIndex | null = null;
const listeners = new Set<() => void>();

export function normTeam(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function emit() {
  for (const fn of listeners) fn();
}

async function loadIndex() {
  if (cache) return cache;
  try {
    const res = await fetch("/crests/index.json");
    const json = res.ok ? await res.json() : { byName: {} };
    cache = { byName: json.byName ?? {} };
  } catch {
    cache = { byName: {} };
  }
  emit();
  return cache;
}

export function officialCrestPath(name: string): string | null {
  if (!cache) return null;
  return cache.byName[normTeam(name)] ?? null;
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
