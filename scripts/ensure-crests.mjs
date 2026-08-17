#!/usr/bin/env node
/**
 * Keep public/crests/index.json fat, valid, and mapped to SofaScore.
 * Safe to re-run on boot. Never shrinks a good index.
 */
import { readFile, writeFile, rename } from "node:fs/promises";
import { sofascoreBadge } from "../src/lib/crest-online.ts";

const INDEX = "public/crests/index.json";
const LEGAL = new Set(["fc","cf","sc","cs","afc","cfc","sfc","fk","kf","sk","bk","if","ff","ac","cd","ce","jk","club","futebol","football","fodbold","istanbul","bern","prague"]);
const PINNED = {
  monza: "/crests/ac-monza.png",
  "ac monza": "/crests/ac-monza.png",
  "club brugge": "/crests/club-brugge.png",
  "cercle brugge": "/crests/cercle-brugge.png",
  "fenerbahce istanbul": "/crests/ss-3052.png",
  fenerbahce: "/crests/ss-3052.png",
  "besiktas istanbul": "/crests/ss-3050.png",
  besiktas: "/crests/ss-3050.png",
};

function norm(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function nameKeys(name) {
  const n = norm(String(name).replace(/\s*\([^)]*\)\s*/g, " "));
  if (!n) return [];
  const keys = new Set([n]);
  const parts = n.split(" ").filter((p) => p && !LEGAL.has(p));
  if (parts.length) keys.add(parts.join(" "));
  return [...keys];
}

function parseIndex(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    const end = raw.lastIndexOf("}");
    if (end > 0) {
      try {
        return JSON.parse(raw.slice(0, end + 1));
      } catch {
        /* ignore */
      }
    }
    return { byName: {} };
  }
}

function walk(o, names) {
  if (!o) return;
  if (Array.isArray(o)) {
    for (const x of o) walk(x, names);
    return;
  }
  if (typeof o !== "object") return;
  for (const k of ["home", "away", "name", "team", "favorite"]) {
    const v = o[k];
    if (typeof v === "string") names.add(v);
    if (v && typeof v === "object" && typeof v.name === "string") names.add(v.name);
  }
  for (const v of Object.values(o)) if (v && typeof v === "object") walk(v, names);
}

async function loadIndex() {
  try {
    return parseIndex(await readFile(INDEX, "utf8"));
  } catch {
    return { byName: {} };
  }
}

const disk = await loadIndex();
let byName = { ...(disk.byName ?? {}) };
if (Object.keys(byName).length < 200) {
  try {
    const live = await fetch("https://betagree.com/crests/index.json", { signal: AbortSignal.timeout(20_000) }).then((r) => r.json());
    byName = { ...(live.byName ?? {}), ...byName };
    console.log("ensure-crests merged live", Object.keys(live.byName ?? {}).length);
  } catch (err) {
    console.warn("ensure-crests live merge failed", err.message || err);
  }
}
Object.assign(byName, PINNED);

// Copy every mapping onto stripped aliases so "Fenerbahce Istanbul" hits "fenerbahce"
for (const [k, v] of Object.entries(byName)) {
  for (const alias of nameKeys(k)) {
    if (!byName[alias]) byName[alias] = v;
  }
}

const names = new Set();
for (const f of ["public/data/slate.json", "public/data/streaks.json", "public/data/form.json", "public/data/trends.json"]) {
  try {
    walk(JSON.parse(await readFile(f, "utf8")), names);
  } catch {
    /* optional */
  }
}

const missing = [...names].filter((n) => n && nameKeys(n).every((k) => !byName[k]));
console.log("ensure-crests clubs", names.size, "unmapped", missing.length);

let added = 0;
for (let i = 0; i < missing.length; i += 3) {
  const chunk = missing.slice(i, i + 3);
  const res = await Promise.all(chunk.map(async (n) => [n, await sofascoreBadge(n)]));
  for (const [n, url] of res) {
    if (!url) continue;
    for (const k of nameKeys(n)) byName[k] = url;
    added += 1;
  }
  await new Promise((r) => setTimeout(r, 40));
}

const mapped = Object.keys(byName).length;
if (mapped < 50) {
  console.error("ensure-crests refuse tiny index", mapped);
  process.exit(1);
}
const body = JSON.stringify({
  byName,
  mapped,
  updatedAt: new Date().toISOString(),
  source: "ensure-crests",
});
JSON.parse(body);
await writeFile(`${INDEX}.tmp`, body);
await rename(`${INDEX}.tmp`, INDEX);
console.log("ensure-crests wrote", mapped, "added", added);
