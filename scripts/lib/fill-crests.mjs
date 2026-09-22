#!/usr/bin/env node
/**
 * Resolve every board club to a local /crests/*.png.
 * Order: already-mapped file → SofaScore → ESPN logo on the fixture →
 * Wikipedia → TheSportsDB → web image search (same query as Google Images).
 */
import { createWriteStream } from "node:fs";
import { readdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { findCrestOnline, sofascoreBadge, apiFootballHit, footballDataBadge, hasFootballApi } from "../../src/lib/crest-online.ts";

const ROOT = join(import.meta.dirname, "../..");
const OUT = join(ROOT, "public/crests");
const INDEX = join(OUT, "index.json");
const DATA = join(ROOT, "public/data");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const LEGAL = new Set([
  "fc", "cf", "sc", "cs", "afc", "cfc", "sfc", "ifc", "fk", "kf", "sk", "bk",
  "if", "ff", "ac", "cd", "ce", "jk", "bsc", "the", "de", "do", "da", "di",
  "del", "la", "el", "club", "clube", "futebol", "football", "fodbold", "soccer",
]);

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

function slug(name) {
  return norm(name).replace(/\s+/g, "-").slice(0, 48) || "club";
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

function shorten(name) {
  const n = String(name).replace(/\s*\([^)]*\)\s*/g, " ").trim();
  const parts = n.split(/\s+/);
  const out = [n];
  if (parts.length >= 2) out.push(parts.slice(0, -1).join(" "));
  if (parts.length >= 2) out.push(parts[0]);
  return [...new Set(out.filter(Boolean))];
}

function walkNames(o, names) {
  if (!o) return;
  if (Array.isArray(o)) {
    for (const x of o) walkNames(x, names);
    return;
  }
  if (typeof o !== "object") return;
  for (const k of ["home", "away", "name", "team", "favorite"]) {
    const v = o[k];
    if (typeof v === "string" && v.length > 1) names.add(v);
    if (v && typeof v === "object" && typeof v.name === "string") names.add(v.name);
  }
  for (const v of Object.values(o)) if (v && typeof v === "object") walkNames(v, names);
}

function walkEspn(o, logos) {
  if (!o) return;
  if (Array.isArray(o)) {
    for (const x of o) walkEspn(x, logos);
    return;
  }
  if (typeof o !== "object") return;
  for (const side of ["home", "away"]) {
    const t = o[side];
    if (t && typeof t === "object" && typeof t.name === "string" && typeof t.logo === "string" && t.logo.startsWith("http")) {
      logos.set(norm(t.name), t.logo);
    }
  }
  for (const v of Object.values(o)) if (v && typeof v === "object") walkEspn(v, logos);
}

async function loadIndex() {
  try {
    return JSON.parse(await readFile(INDEX, "utf8"));
  } catch {
    return { byName: {} };
  }
}

async function fileOk(localPath) {
  if (!localPath?.startsWith("/crests/")) return false;
  try {
    const st = await stat(join(OUT, localPath.replace("/crests/", "")));
    return st.size >= 250;
  } catch {
    return false;
  }
}

async function download(url, dest) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "image/png,image/webp,image/jpeg,image/*,*/*",
      Referer: "https://www.sofascore.com/",
    },
    signal: AbortSignal.timeout(16_000),
  });
  if (!res.ok || !res.body) throw new Error(`dl ${res.status}`);
  const type = res.headers.get("content-type") || "";
  if (type.includes("text/html") || type.includes("application/json")) throw new Error("not image");
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  const st = await stat(dest);
  if (st.size < 250) {
    await unlink(dest).catch(() => undefined);
    throw new Error("tiny");
  }
  const fromApi = /api-sports\.io|crests\.football-data\.org/i.test(url);
  if (st.size > 160000 && !fromApi) {
    await unlink(dest).catch(() => undefined);
    throw new Error("too-big");
  }
}

async function saveRemote(url, destRel) {
  const dest = join(OUT, destRel);
  if (await fileOk(`/crests/${destRel}`)) return `/crests/${destRel}`;
  await download(url, dest);
  return `/crests/${destRel}`;
}

async function commonsBadge(name) {
  const q = `${name} football club logo`;
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*" +
    `&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=${encodeURIComponent(q)}` +
    "&prop=imageinfo&iiprop=url|mime|size";
  const res = await fetch(url, { headers: { "User-Agent": "BetagreeCrestBot/1.0" }, signal: AbortSignal.timeout(12_000) });
  if (!res.ok) return null;
  const json = await res.json();
  const pages = Object.values(json.query?.pages ?? {});
  for (const page of pages) {
    const title = String(page.title ?? "").toLowerCase();
    if (!/logo|crest|badge|shield|coat/.test(title)) continue;
    if (/jersey|kit|shirt|player|flag of|map/.test(title)) continue;
    const info = page.imageinfo?.[0];
    const src = info?.url;
    if (src && /^https?:/.test(src)) return src;
  }
  return null;
}

function mappedPath(byName, name) {
  for (const k of nameKeys(name)) {
    if (byName[k]) return byName[k];
  }
  return null;
}

function stampLogos(o, byName) {
  if (!o) return;
  if (Array.isArray(o)) {
    for (const x of o) stampLogos(x, byName);
    return;
  }
  if (typeof o !== "object") return;
  for (const side of ["home", "away"]) {
    const t = o[side];
    if (t && typeof t === "object" && typeof t.name === "string") {
      const path = mappedPath(byName, t.name);
      if (path?.startsWith("/crests/")) t.logo = path;
    }
  }
  if (typeof o.name === "string" && typeof o.logo === "string" && o.logo.startsWith("http")) {
    const path = mappedPath(byName, o.name);
    if (path?.startsWith("/crests/")) o.logo = path;
  }
  for (const v of Object.values(o)) if (v && typeof v === "object") stampLogos(v, byName);
}

function remember(byName, name, path) {
  for (const k of nameKeys(name)) {
    const cur = byName[k];
    if (String(path).startsWith("/crests/af-")) {
      byName[k] = path;
      continue;
    }
    if (cur?.startsWith("/crests/af-")) continue;
    byName[k] = path;
  }
}

export async function collectBoardClubs() {
  const names = new Set();
  const espn = new Map();
  let files = [];
  try {
    files = (await readdir(DATA)).filter((f) => f.endsWith(".json"));
  } catch {
    files = ["slate.json", "streaks.json", "form.json", "trends.json"];
  }
  for (const f of files) {
    try {
      const raw = JSON.parse(await readFile(join(DATA, f), "utf8"));
      walkNames(raw, names);
      walkEspn(raw, espn);
    } catch {
      /* skip */
    }
  }
  const skip =
    /^(poisson|elo|fortress|value|contrarian|clean|grit|blend|both|run|high|medium|low|over|under|yes|no|bounce|cut|today|tomorrow|week|eredivisie|pro league|championship|allsvenskan|liga profesional|chinese super league|brasileirao|brasileirão|liga portugal|austria bundesliga|superliga|super lig|süper lig|premiership|premier league|la liga|serie a|serie b|bundesliga|ligue 1|ligue 2|mls|liga mx|primeira liga|scottish premiership)$/i;
  return {
    names: [...names].filter((n) => n && !skip.test(n) && !/^\d+$/.test(n) && n.length > 2),
    espn,
  };
}

export async function fillCrests({ limit = 80, priority = [] } = {}) {
  const apis = {
    football: hasFootballApi(),
    stats: Boolean(process.env.STATS_API_KEY || process.env.FOOTBALL_DATA_KEY || process.env.FOOTBALL_DATA_API_KEY),
  };
  console.log("fill-crests apis", apis);
  const idx = await loadIndex();
  const byName = { ...(idx.byName ?? {}) };
  const { names, espn } = await collectBoardClubs();
  const all = [...new Set([...priority, ...names])];

  const missing = [];
  const needFile = [];
  for (const name of all) {
    const path = mappedPath(byName, name);
    if (!path) {
      missing.push(name);
      continue;
    }
    if (!(await fileOk(path))) needFile.push({ name, path });
  }

  let saved = 0;
  const failed = [];

  for (const { name, path } of needFile) {
    const id = sofaId(path);
    try {
      if (String(path).startsWith("/crests/af-")) {
        const af = String(path).match(/af-(\d+)\.png/)?.[1];
        if (af) {
          await saveRemote(`https://media.api-sports.io/football/teams/${af}.png`, `af-${af}.png`);
          saved += 1;
        }
      } else if (id) {
        await saveRemote(`https://img.sofascore.com/api/v1/team/${id}/image`, `ss-${id}.png`);
        saved += 1;
      }
    } catch {
      failed.push(name);
    }
  }

  const force = apis.football ? priority.filter(Boolean) : [];
  const queue = [...new Set([...force, ...missing])].slice(0, limit);
  for (let i = 0; i < queue.length; i += 1) {
    const name = queue[i];
    let local = null;
    try {
      const hit = await apiFootballHit(name);
      if (hit?.id) {
        local = await saveRemote(hit.logo, `af-${hit.id}.png`);
      }
    } catch {
      /* next */
    }
    if (!local) {
      try {
        const stats = await footballDataBadge(name);
        if (stats) local = await saveRemote(stats, `web-${slug(name)}.png`);
      } catch {
        /* next */
      }
    }
    if (!local) {
      try {
        for (const q of shorten(name)) {
          const sofa = await sofascoreBadge(q);
          if (sofa) {
            const id = sofaId(sofa);
            if (id) {
              local = await saveRemote(sofa, `ss-${id}.png`);
              break;
            }
          }
        }
      } catch {
        /* next */
      }
    }
    if (!local) {
      const espnUrl = espn.get(norm(name));
      if (espnUrl) {
        try {
          local = await saveRemote(espnUrl, `web-${slug(name)}.png`);
        } catch {
          /* next */
        }
      }
    }
    if (!local && !apis.football) {
      try {
        const found = await findCrestOnline(name);
        if (found) {
          const id = sofaId(found);
          local = await saveRemote(found, id ? `ss-${id}.png` : `web-${slug(name)}.png`);
        }
      } catch {
        /* next */
      }
    }
    if (!local && !apis.football) {
      try {
        const commons = await commonsBadge(name);
        if (commons) local = await saveRemote(commons, `web-${slug(name)}.png`);
      } catch {
        /* next */
      }
    }
    if (local) {
      remember(byName, name, local);
      saved += 1;
      console.log("fill-crests", name, "->", local);
    } else {
      failed.push(name);
      console.log("fill-crests miss", name);
    }
    if (i % 8 === 7) {
      await writeFile(
        INDEX,
        JSON.stringify({ byName, mapped: Object.keys(byName).length, updatedAt: new Date().toISOString(), source: "fill-crests" }),
      );
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  const mapped = Object.keys(byName).length;
  const body = JSON.stringify({
    byName,
    mapped,
    updatedAt: new Date().toISOString(),
    source: "fill-crests",
  });
  await writeFile(`${INDEX}.tmp`, body);
  await rename(`${INDEX}.tmp`, INDEX);

  for (const f of ["slate.json", "streaks.json", "form.json", "trends.json", "bankers.json"]) {
    try {
      const p = join(DATA, f);
      const raw = JSON.parse(await readFile(p, "utf8"));
      stampLogos(raw, byName);
      await writeFile(p, JSON.stringify(raw));
    } catch {
      /* skip */
    }
  }

  const still = [];
  for (const name of all) {
    const path = mappedPath(byName, name);
    if (!path || !(await fileOk(path))) still.push(name);
  }

  return {
    clubs: all.length,
    missingBefore: missing.length,
    saved,
    stillMissing: still,
    mapped,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await fillCrests({ limit: Number(process.env.CREST_FILL_LIMIT || 120) });
  console.log(JSON.stringify({ ...report, stillMissing: report.stillMissing.slice(0, 30) }, null, 2));
}
