#!/usr/bin/env node
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "public/crests");
const INDEX = join(OUT, "index.json");
const UA = "BetagreeCrestBot/1.0 (https://betagree.com; official football crests)";

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function slug(s) {
  return norm(s).replace(/\s+/g, "-").slice(0, 72) || "club";
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
  if (r.includes(q) || q.includes(r)) return 0.88;
  const qt = tokens(q);
  const rt = tokens(r);
  if (!qt.size || !rt.size) return 0;
  let hit = 0;
  for (const t of qt) if (rt.has(t)) hit += 1;
  return hit / Math.max(qt.size, rt.size);
}

function expandNames(name) {
  const out = [name];
  const swaps = [
    [/\s+Jrs?$/i, " Juniors"],
    [/\s+Utd\.?$/i, " United"],
    [/^U\. de /i, "Universidad de "],
    [/^U\. /i, "Universidad "],
    [/^Atl\. /i, "Atletico "],
    [/^Dep\. /i, "Deportivo "],
    [/^Sp\. /i, "Sportivo "],
    [/^Lok\. /i, "Lokomotiv "],
    [/^Ind\. /i, "Independiente "],
    [/ W$/, ""],
    [/ RJ$/, ""],
    [/ SP$/, ""],
    [/ BA$/, ""],
    [/ PE$/, ""],
    [/ CE$/, ""],
    [/ MT$/, ""],
    [/ MA$/, ""],
    [/\s+As\.$/i, " Asuncion"],
  ];
  for (const [re, to] of swaps) out.push(name.replace(re, to));
  const known = {
    Brann: "SK Brann",
    "Brann Bergen": "SK Brann",
    "Legia Warszawa": "Legia Warsaw",
    Lillestrom: "Lillestrom SK",
    "Santos SP": "Santos FC",
    "San Lorenzo": "San Lorenzo de Almagro",
    "Newcastle Utd": "Newcastle United",
    "Minnesota Utd": "Minnesota United FC",
    "Sporting Kansas": "Sporting Kansas City",
    Stabaek: "Stabaek Fotball",
    HamKam: "Hamarkameratene",
    "Godoy Cruz": "Godoy Cruz Antonio Tomba",
    "Vasco da Gama RJ": "Vasco da Gama",
    "U. de Chile": "Universidad de Chile",
    "U. Catolica": "Universidad Catolica",
    "Argentinos Jrs": "Argentinos Juniors",
    "CA Belgrano": "Belgrano de Cordoba",
    Stromsgodset: "Stromsgodset IF",
    "KI Klaksvik": "Klaksvikar Itrottarfelag",
    "KR Reykjavik": "Knattspyrnufelag Reykjavikur",
    "Valur Reykjavik": "Valur",
    "Vikingur Reykjavik": "Vikingur Reykjavik",
    "SJ Earthquakes": "San Jose Earthquakes",
    "Orlando City": "Orlando City SC",
    "Philadelphia Un": "Philadelphia Union",
    "Olimpia As.": "Club Olimpia",
    "Fortaleza CE": "Fortaleza Esporte Clube",
    "Juventude RS": "Esporte Clube Juventude",
    "Criciuma SC": "Criciuma Esporte Clube",
    "Ponte Preta SP": "Ponte Preta",
    "Bahia BA": "Esporte Clube Bahia",
    "Vitoria BA": "Esporte Clube Vitoria",
    "KuPS Kuopio": "KuPS",
    "GAIS Goteborg": "GAIS",
    "HB Koge": "HB Koge",
    "Lok. Moscow": "Lokomotiv Moscow",
  };
  if (known[name]) out.push(known[name]);
  return [...new Set(out.filter(Boolean))];
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

function mapName(index, name, path) {
  index.byName[norm(name)] = path;
}

async function getJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(16_000),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function download(url, dest) {
  const clean = url.replace(/[?&]utm_[^&]+/g, "").replace(/\?$/, "");
  let last = "dl";
  for (let i = 0; i < 4; i++) {
    const res = await fetch(clean, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(20_000) });
    if (res.status === 429) {
      last = "429";
      await new Promise((r) => setTimeout(r, 4000 * (i + 1)));
      continue;
    }
    if (!res.ok || !res.body) throw new Error(`dl ${res.status}`);
    const type = res.headers.get("content-type") || "";
    if (type.includes("text/html")) throw new Error("html");
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    const st = await stat(dest);
    if (st.size < 300) throw new Error("tiny");
    return;
  }
  throw new Error(last);
}

function isClubPage(page) {
  const title = page.title || "";
  const desc = ((page.terms?.description || [])[0] || "").toLowerCase();
  const blob = `${title} ${desc}`;
  if (/season|disambiguation|stadium|city|capital|village|municipality|competition|league season|footballer|manager|coach|player|politician|born |musician|actor|in european football/i.test(blob)) {
    return false;
  }
  return (
    /football club|soccer club|association football|football team|soccer team|football in/i.test(desc) ||
    /\bF\.?C\.?\b|\bS\.?C\.?\b|FK |PFC |AFC |SK |BK /.test(title)
  );
}

async function wikiSearch(name) {
  const queries = [`"${name}" football club`, `${name} F.C.`, name];
  for (const q of queries) {
    const url =
      "https://en.wikipedia.org/w/api.php?action=query&format=json" +
      "&generator=search&gsrlimit=8&gsrsearch=" +
      encodeURIComponent(q) +
      "&prop=pageimages|pageterms&piprop=thumbnail&pithumbsize=320&wbptterms=description";
    const data = await getJson(url);
    const pages = Object.values(data.query?.pages || {}).sort((a, b) => (a.index ?? 99) - (b.index ?? 99));
    const hit = pages
      .filter(isClubPage)
      .map((p) => ({ p, s: scoreName(name, p.title) }))
      .filter((x) => x.s >= 0.55)
      .sort((a, b) => b.s - a.s)[0];
    if (hit) return hit.p;
    await new Promise((r) => setTimeout(r, 80));
  }
  return null;
}

async function wikiSummary(title) {
  const url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title);
  const data = await getJson(url);
  return data.originalimage?.source || data.thumbnail?.source || null;
}

async function loadNames() {
  const names = new Set();
  const dataDir = join(ROOT, "public/data");
  const files = ["slate.json", "slate-2026-08-16.json", "slate-2026-08-17.json", "form.json", "trends.json"];
  const espn = [];
  for (const file of files) {
    let raw;
    try {
      raw = JSON.parse(await readFile(join(dataDir, file), "utf8"));
    } catch {
      continue;
    }
    for (const f of raw.fixtures ?? []) {
      for (const side of [f.home, f.away]) {
        if (!side?.name) continue;
        names.add(side.name);
        if (side.logo) espn.push({ name: side.name, logo: side.logo, id: side.id });
      }
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
  return { names: [...names].sort((a, b) => a.localeCompare(b)), espn };
}

async function harvestEspn(index, espn) {
  let n = 0;
  for (const row of espn) {
    const key = norm(row.name);
    if (index.byName[key]) continue;
    const file = `espn-${row.id || slug(row.name)}.png`;
    const dest = join(OUT, file);
    try {
      await stat(dest);
    } catch {
      try {
        await download(row.logo, dest);
      } catch {
        continue;
      }
    }
    const path = `/crests/${file}`;
    mapName(index, row.name, path);
    index.files[file] = row.name;
    n += 1;
  }
  return n;
}

async function fetchOfficial(index, name) {
  for (const q of expandNames(name)) {
    const page = await wikiSearch(q);
    if (!page) continue;
    let src = page.thumbnail?.source || null;
    if (!src) src = await wikiSummary(page.title);
    if (!src) continue;
    const file = `${slug(page.title)}.png`;
    const dest = join(OUT, file);
    try {
      await stat(dest);
    } catch {
      await download(src, dest);
    }
    const path = `/crests/${file}`;
    mapName(index, name, path);
    mapName(index, page.title, path);
    index.files[file] = page.title;
    return page.title;
  }
  return null;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const index = await loadIndex();
  index.byName ??= {};
  index.files ??= {};
  const persist = async () => {
    try {
      await saveIndex(index);
    } catch (err) {
      console.error("save failed", err);
    }
  };
  const { names, espn } = await loadNames();
  const espnN = await harvestEspn(index, espn);
  await persist();
  console.log("espn harvested", espnN, "mapped", Object.keys(index.byName).length, "todo", names.filter((n) => !index.byName[norm(n)]).length);

  let hit = 0;
  let miss = 0;
  let skip = 0;
  for (const name of names) {
    if (index.byName[norm(name)]) {
      skip += 1;
      continue;
    }
    try {
      const title = await fetchOfficial(index, name);
      if (title) {
        hit += 1;
        console.log("hit", name, "->", title);
        await persist();
      } else {
        miss += 1;
        console.log("miss", name);
      }
    } catch (err) {
      miss += 1;
      console.log("err", name, String(err?.message || err));
      await persist();
      await new Promise((r) => setTimeout(r, 1200));
    }
    await new Promise((r) => setTimeout(r, 220));
  }
  index.counts = { names: names.length, hit, miss, skip, mapped: Object.keys(index.byName).length };
  await persist();
  console.log(index.counts);
}

await main();
