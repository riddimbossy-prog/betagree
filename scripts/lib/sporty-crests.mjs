/** Cache official SportyBet team-page crests as same-origin GitHub Pages assets. */
import { createWriteStream } from "node:fs";
import { mkdir, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { sportyTeamDetails } from "./sportybet.mjs";

const ROOT = join(import.meta.dirname, "../..");
const OUT = join(ROOT, "public/crests");
const INDEX = join(OUT, "index.json");
// SportyBet's team-details response currently points at these image CDNs.
const SPORTY_CREST_HOSTS = new Set(["s.sporty.net", "s.football.com", "www.flashscore.com"]);
const LEGAL = new Set(["fc", "cf", "sc", "cs", "afc", "cfc", "sfc", "fk", "club", "cd", "de", "del", "la", "el"]);

export function sportyCrestFile(teamId) {
  const id = String(teamId || "").match(/^sr:competitor:(\d+)$/)?.[1];
  return id ? `sb-${id}.png` : null;
}

export function isTrustedSportyCrestUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && SPORTY_CREST_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

function norm(name) {
  return String(name || "").toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
    .replace(/ø/g, "o").replace(/æ/g, "ae").replace(/œ/g, "oe").replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

export function sportyNameKeys(name) {
  const n = norm(String(name || "").replace(/\s*\([^)]*\)\s*/g, " "));
  if (!n) return [];
  const keys = new Set([n]);
  const parts = n.split(" ").filter((p) => p && !LEGAL.has(p));
  if (parts.length) keys.add(parts.join(" "));
  if (parts.length >= 2) keys.add(parts.slice(-2).join(" "));
  return [...keys];
}

async function fileOk(file) {
  try { return (await stat(join(OUT, file))).size >= 250; } catch { return false; }
}

async function download(url, file) {
  if (!isTrustedSportyCrestUrl(url)) throw new Error("untrusted SportyBet crest URL");
  const dest = join(OUT, file);
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "image/png,image/*,*/*", Referer: "https://www.sportybet.com/" },
    signal: AbortSignal.timeout(15_000),
  });
  const type = res.headers.get("content-type") || "";
  if (!res.ok || !res.body || !type.startsWith("image/")) throw new Error(`crest ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  if (!(await fileOk(file))) {
    await unlink(dest).catch(() => undefined);
    throw new Error("tiny crest");
  }
}

async function loadIndex() {
  try { return JSON.parse(await readFile(INDEX, "utf8")); } catch { return { byName: {} }; }
}

async function mapPool(items, limit, fn) {
  let cursor = 0;
  const out = new Array(items.length);
  async function worker() {
    while (cursor < items.length) { const i = cursor++; out[i] = await fn(items[i]); }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

/** Returns teamId -> local path and merges exact SportyBet names into the crest index. */
export async function cacheSportyCrests(events, { concurrency = 8 } = {}) {
  await mkdir(OUT, { recursive: true });
  const index = await loadIndex();
  index.byName ??= {};
  const teams = new Map();
  for (const item of events ?? []) {
    const ev = item.ev ?? item;
    if (ev?.homeTeamId) teams.set(ev.homeTeamId, ev.homeTeamName);
    if (ev?.awayTeamId) teams.set(ev.awayTeamId, ev.awayTeamName);
  }

  const localById = new Map();
  let saved = 0;
  await mapPool([...teams], concurrency, async ([teamId, boardName]) => {
    const file = sportyCrestFile(teamId);
    if (!file) return;
    try {
      const ready = await fileOk(file);
      const details = ready ? null : await sportyTeamDetails(teamId);
      const url = String(details?.logoUri || "");
      if (!ready && url) {
        await download(url, file);
        saved += 1;
      }
      if (!(await fileOk(file))) return;
      const path = `/crests/${file}`;
      localById.set(teamId, path);
      for (const name of [boardName, details?.name, details?.shortName]) {
        for (const key of sportyNameKeys(name)) index.byName[key] = path;
      }
    } catch (err) {
      console.warn("sporty crest miss", teamId, boardName, err?.message || err);
    }
  });

  const body = JSON.stringify({ ...index, mapped: Object.keys(index.byName).length, updatedAt: new Date().toISOString(), source: "sportybet+existing" });
  JSON.parse(body);
  await writeFile(`${INDEX}.tmp`, body);
  await rename(`${INDEX}.tmp`, INDEX);
  return { localById, teams: teams.size, saved };
}
