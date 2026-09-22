#!/usr/bin/env node
import { createWriteStream } from "node:fs";
import { readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "public/crests");
const INDEX = join(OUT, "index.json");
const BASE = "https://img.sofascore.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const EXTRA = [
  "Manchester City",
  "Manchester United",
  "Paris Saint-Germain",
  "Inter Milan",
  "FC Porto",
  "Celtic",
  "Rangers",
  "AFC Bournemouth",
  "Club Brugge",
  "Cercle Brugge",
  "Casa Pia",
  "Fenerbahce",
  "AS Saint-Etienne",
  "St Mirren",
  "St Johnstone",
  "Tigres UANL",
  "Guadalajara",
  "Club Tijuana",
  "Santos Laguna",
  "PSV Eindhoven",
  "FC Midtjylland",
  "Grenoble Foot 38",
  "Hull City",
  "Coventry City",
  "AC Monza",
  "Stade Rennais",
  "SC Cambuur",
  "Konyaspor",
  "Persik Kediri",
  "East Bengal",
  "BK Hacken",
  "Halmstads BK",
  "SL Benfica",
  "Atlante",
  "Randers FC",
  "Inter Miami",
  "Toronto FC",
  "Man City",
  "Man Utd",
  "PSG",
  "Inter",
  "Porto",
  "Casa Pia Lisbon",
  "Fenerbahce Istanbul",
  "Saint-Etienne",
  "St Mirren FC",
  "St. Johnstone FC",
  "CD Guadalajara",
  "Club Tijuana de Caliente",
  "PSV Eindhoven",
  "April 25",
  "Ayeyawady",
  "Sikkim Police",
  "Starting11 FC",
  "Grassrunners FC",
  "Abuja Kings FA",
  "Howlers SC",
  "Red Panda FC",
  "WFC Kharkiv",
  "Ladomyr",
  "Kharaatsai",
  "Sang Mustang FC",
  "Rajshahi Stars",
  "FC Jurong",
];

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function scoreName(query, result) {
  const q = norm(query);
  const r = norm(result);
  if (!q || !r) return 0;
  if (q === r) return 1;
  if (r.startsWith(q) || q.startsWith(r)) return 0.9;
  const qt = q.split(" ").filter((t) => t.length > 2);
  const rt = r.split(" ").filter((t) => t.length > 2);
  if (!qt.length || !rt.length) return 0;
  let hit = 0;
  for (const t of qt) if (rt.includes(t)) hit += 1;
  return hit / Math.max(qt.length, rt.length);
}

async function download(url, dest) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "image/png,image/*", Referer: "https://www.sofascore.com/" },
    signal: AbortSignal.timeout(16_000),
  });
  if (!res.ok || !res.body) throw new Error(`dl ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  const st = await stat(dest);
  if (st.size < 250) throw new Error("tiny");
}

const index = JSON.parse(await readFile(INDEX, "utf8"));
index.byName ??= {};

const names = new Set(EXTRA);
for (const file of ["streaks.json", "scores.json", "slate-2026-08-17.json"]) {
  try {
    const raw = JSON.parse(await readFile(join(ROOT, "public/data", file), "utf8"));
    for (const f of raw.fixtures ?? []) {
      names.add(f.home?.name);
      names.add(f.away?.name);
    }
    for (const s of raw.scores ?? []) {
      names.add(s.home);
      names.add(s.away);
    }
    for (const p of [...(raw.twoYes ?? []), ...(raw.threeNo ?? [])]) {
      names.add(p.home);
      names.add(p.away);
    }
  } catch {
    /* skip */
  }
}

let hit = 0;
let miss = 0;
for (const name of [...names].filter(Boolean)) {
  const key = norm(name);
  if (index.byName[key]?.includes("/crests/ss-")) {
    continue;
  }
  try {
    const data = await fetch(`${BASE}/api/v1/search/all?q=${encodeURIComponent(name)}`, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
        Origin: "https://www.sofascore.com",
        Referer: "https://www.sofascore.com/",
      },
      signal: AbortSignal.timeout(12_000),
    }).then((r) => r.json());
    let best = null;
    for (const item of data.results ?? []) {
      if (item.type !== "team") continue;
      const e = item.entity ?? {};
      if (e.sport?.slug && e.sport.slug !== "football") continue;
      const s = Math.max(scoreName(name, e.name || ""), scoreName(name, e.shortName || ""));
      if (s < 0.62 || !e.id) continue;
      if (!best || s > best.s || (s === best.s && (e.userCount || 0) > best.users)) {
        best = { e, s, users: e.userCount || 0 };
      }
    }
    if (!best) {
      miss += 1;
      console.log("miss", name);
      continue;
    }
    const file = `ss-${best.e.id}.png`;
    const dest = join(OUT, file);
    try {
      await stat(dest);
    } catch {
      await download(`${BASE}/api/v1/team/${best.e.id}/image`, dest);
    }
    const path = `/crests/${file}`;
    index.byName[key] = path;
    index.byName[norm(best.e.name)] = path;
    if (best.e.shortName) index.byName[norm(best.e.shortName)] = path;
    hit += 1;
    console.log("hit", name, "->", best.e.name, best.e.id, best.s.toFixed(2));
    if (hit % 6 === 0) await writeFile(INDEX, JSON.stringify(index));
  } catch (err) {
    miss += 1;
    console.log("err", name, err.message);
  }
  await new Promise((r) => setTimeout(r, 120));
}

index.mapped = Object.keys(index.byName).length;
index.fetchedAt = new Date().toISOString();
await writeFile(INDEX, JSON.stringify(index));
console.log({ hit, miss, mapped: index.mapped });
