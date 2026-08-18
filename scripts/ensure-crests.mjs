#!/usr/bin/env node
/**
 * Keep public/crests/index.json fat and mapped to LOCAL /crests/ss-ID.png files.
 * Downloads any missing SofaScore badges. Never shrinks a good index.
 * Safe to re-run on boot.
 */
import { createWriteStream } from "node:fs";
import { readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { sofascoreBadge } from "../src/lib/crest-online.ts";

const INDEX = "public/crests/index.json";
const OUT = "public/crests";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const LEGAL = new Set([
  "fc",
  "cf",
  "sc",
  "cs",
  "afc",
  "cfc",
  "sfc",
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
  "club",
  "futebol",
  "football",
  "fodbold",
  "istanbul",
  "bern",
  "prague",
]);

const PINNED = {
  monza: "/crests/ss-2729.png",
  "ac monza": "/crests/ss-2729.png",
  "club brugge": "/crests/ss-2888.png",
  "cercle brugge": "/crests/ss-2929.png",
  "fenerbahce istanbul": "/crests/ss-3052.png",
  fenerbahce: "/crests/ss-3052.png",
  "besiktas istanbul": "/crests/ss-3050.png",
  besiktas: "/crests/ss-3050.png",
  sonderjyske: "/crests/ss-1295.png",
  "sonderjyske fodbold": "/crests/ss-1295.png",
  "imt new belgrade": "/crests/ss-308176.png",
  "lokomotiv pd": "/crests/ss-3272.png",
  sabadell: "/crests/ss-24335.png",
  "cd sabadell": "/crests/ss-24335.png",
  brondby: "/crests/ss-1281.png",
  "brondby if": "/crests/ss-1281.png",
  "tigre victoria": "/crests/ss-7628.png",
  tigre: "/crests/ss-7628.png",
};

function norm(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/ł/g, "l")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function nameKeys(name) {
  const n = norm(String(name).replace(/\s*\([^)]*\)\s*/g, " "));
  if (!n) return [];
  const keys = new Set([n]);
  const parts = n.split(" ").filter((p) => p && !LEGAL.has(p));
  if (parts.length) keys.add(parts.join(" "));
  if (parts.length >= 2) keys.add(parts.slice(-2).join(" "));
  return [...keys];
}

function sofaId(path) {
  if (!path) return null;
  return String(path).match(/ss-(\d+)\.png/)?.[1] ?? String(path).match(/\/team\/(\d+)\/image/)?.[1] ?? null;
}

function toLocal(path) {
  const id = sofaId(path);
  if (id) return `/crests/ss-${id}.png`;
  if (String(path || "").startsWith("/crests/")) return path;
  return null;
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

async function download(url, dest) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "image/png,image/webp,image/*,*/*",
      Referer: "https://www.sofascore.com/",
      Origin: "https://www.sofascore.com",
    },
    signal: AbortSignal.timeout(16_000),
  });
  if (!res.ok || !res.body) throw new Error(`dl ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  const st = await stat(dest);
  if (st.size < 250) {
    await unlink(dest).catch(() => undefined);
    throw new Error("tiny");
  }
}

async function ensureFile(localPath) {
  const id = sofaId(localPath);
  const file = localPath.replace("/crests/", "");
  const dest = join(OUT, file);
  try {
    const st = await stat(dest);
    if (st.size >= 250) return true;
  } catch {
    /* missing */
  }
  if (!id) return false;
  try {
    await download(`https://img.sofascore.com/api/v1/team/${id}/image`, dest);
    return true;
  } catch (err) {
    console.warn("ensure-crests dl fail", file, err.message || err);
    return false;
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

// Remap every SofaScore URL onto a same-origin file.
for (const [k, v] of Object.entries(byName)) {
  const local = toLocal(v);
  if (local) byName[k] = local;
}

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
    const local = toLocal(url);
    if (!local) continue;
    for (const k of nameKeys(n)) byName[k] = local;
    added += 1;
  }
  await new Promise((r) => setTimeout(r, 40));
}

// Download local files for every team currently on the boards, plus any missing ss- files we already know.
const needed = new Set();
for (const n of names) {
  for (const k of nameKeys(n)) {
    if (byName[k]) needed.add(byName[k]);
  }
}
for (const v of Object.values(PINNED)) needed.add(v);

let downloaded = 0;
const queue = [...needed];
for (let i = 0; i < queue.length; i += 6) {
  const chunk = queue.slice(i, i + 6);
  const results = await Promise.all(chunk.map((p) => ensureFile(p)));
  downloaded += results.filter(Boolean).length;
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
console.log("ensure-crests wrote", mapped, "added", added, "files", downloaded);
