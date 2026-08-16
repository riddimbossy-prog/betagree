#!/usr/bin/env node
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "public/crests");
const INDEX = join(OUT, "index.json");
const BASE = "https://img.sofascore.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokens(s) {
  return new Set(
    norm(s)
      .split(" ")
      .filter((t) => t && t.length > 1 && !["fc", "cf", "sc", "afc", "cfc", "fk", "sk", "ac", "the", "de", "do", "club", "united", "city", "football"].includes(t)),
  );
}

function scoreName(query, result) {
  const q = norm(query);
  const r = norm(result);
  if (!q || !r) return 0;
  if (q === r) return 1;
  if (r.startsWith(q + " ") || r.endsWith(" " + q) || r.includes(" " + q + " ")) return 0.92;
  if (q.length >= 6 && (r.startsWith(q) || q.startsWith(r))) return 0.86;
  const qt = tokens(q);
  const rt = tokens(r);
  if (!qt.size || !rt.size) return 0;
  let hit = 0;
  for (const t of qt) if (rt.has(t)) hit += 1;
  return hit / Math.max(qt.size, rt.size);
}

function searchQuery(name) {
  return name
    .replace(/\s+Jrs?$/i, " Juniors")
    .replace(/\s+Utd\.?$/i, " United")
    .replace(/^U\. de /i, "Universidad de ")
    .replace(/^U\. /i, "Universidad ")
    .replace(/^Atl\. /i, "Atletico ")
    .replace(/^Dep\. /i, "Deportivo ")
    .replace(/^Sp\. /i, "Sportivo ")
    .replace(/^Lok\. /i, "Lokomotiv ")
    .replace(/^Ind\. /i, "Independiente ")
    .replace(/ W$/, "")
    .replace(/ (RJ|SP|BA|PE|CE|MT|MA)$/i, "");
}

async function loadIndex() {
  try {
    return JSON.parse(await readFile(INDEX, "utf8"));
  } catch {
    return { byName: {}, files: {} };
  }
}

async function saveIndex(index) {
  index.fetchedAt = new Date().toISOString();
  index.mapped = Object.keys(index.byName).length;
  await writeFile(INDEX, JSON.stringify(index));
}

async function getJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json", Origin: "https://www.sofascore.com", Referer: "https://www.sofascore.com/" },
    signal: AbortSignal.timeout(16_000),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function download(url, dest) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "image/png,image/*", Referer: "https://www.sofascore.com/" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok || !res.body) throw new Error(`dl ${res.status}`);
  const type = res.headers.get("content-type") || "";
  if (type.includes("text/html") || type.includes("json")) throw new Error(type);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  const st = await stat(dest);
  if (st.size < 250) throw new Error("tiny");
}

async function loadNames() {
  const names = new Set();
  const dataDir = join(ROOT, "public/data");
  for (const file of ["slate.json", "slate-2026-08-16.json", "slate-2026-08-17.json", "form.json", "trends.json"]) {
    let raw;
    try {
      raw = JSON.parse(await readFile(join(dataDir, file), "utf8"));
    } catch {
      continue;
    }
    for (const f of raw.fixtures ?? []) {
      if (f.home?.name) names.add(f.home.name);
      if (f.away?.name) names.add(f.away.name);
    }
    for (const board of Object.values(raw.boards ?? {})) {
      for (const venue of ["overall", "home", "away"]) {
        for (const row of board[venue] ?? []) if (row.team) names.add(row.team);
      }
    }
    for (const list of Object.values(raw.categories ?? {})) {
      for (const p of list) {
        if (p.home) names.add(p.home);
        if (p.away) names.add(p.away);
        if (p.team) names.add(p.team);
      }
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function pickTeam(name, results) {
  const wantWomen = /\bW$/.test(name);
  const candidates = [];
  for (const item of results || []) {
    if (item.type !== "team") continue;
    const e = item.entity || {};
    const sportSlug = e.sport?.slug || "";
    if (sportSlug && sportSlug !== "football") continue;
    if (e.sport?.id && e.sport.id !== 1) continue;
    const label = e.name || "";
    if (/\b(U1[0-9]|U2[0-3]|reserve|reserves|\bXI\b|\bII\b)\b/i.test(label) && !/u1|reserve|\b2\b/i.test(name)) continue;
    if (/\b2\b/.test(label) && !/\b2\b/.test(name)) continue;
    if (wantWomen && e.gender === "M") continue;
    if (!wantWomen && e.gender === "F") continue;
    const s = Math.max(scoreName(name, label), scoreName(searchQuery(name), label), scoreName(name, e.shortName || ""));
    if (s < 0.5) continue;
    candidates.push({ e, s, users: e.userCount || 0 });
  }
  candidates.sort((a, b) => b.s - a.s || b.users - a.users);
  return candidates[0] || null;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const index = await loadIndex();
  index.byName ??= {};
  index.files ??= {};
  const names = await loadNames();
  let hit = 0;
  let miss = 0;
  let skip = 0;

  for (const name of names) {
    const key = norm(name);
    const existing = index.byName[key] || "";
    if (existing.includes("/crests/ss-")) {
      skip += 1;
      continue;
    }
    try {
      const q = searchQuery(name);
      const data = await getJson(`${BASE}/api/v1/search/all?q=${encodeURIComponent(q)}`);
      const picked = pickTeam(name, data.results);
      if (!picked) {
        miss += 1;
        console.log("miss", name);
        await new Promise((r) => setTimeout(r, 140));
        continue;
      }
      const id = picked.e.id;
      const file = `ss-${id}.png`;
      const dest = join(OUT, file);
      try {
        await stat(dest);
      } catch {
        await download(`${BASE}/api/v1/team/${id}/image`, dest);
      }
      const path = `/crests/${file}`;
      index.byName[key] = path;
      index.byName[norm(picked.e.name)] = path;
      index.files[file] = picked.e.name;
      hit += 1;
      console.log("hit", name, "->", picked.e.name, id, picked.s.toFixed(2));
      if (hit % 8 === 0) await saveIndex(index);
    } catch (err) {
      miss += 1;
      console.log("err", name, String(err?.message || err));
      await new Promise((r) => setTimeout(r, 600));
    }
    await new Promise((r) => setTimeout(r, 140));
  }

  index.counts = { names: names.length, hit, miss, skip, mapped: Object.keys(index.byName).length, source: "official" };
  await saveIndex(index);
  console.log(index.counts);
}

await main();
