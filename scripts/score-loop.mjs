#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

const ROOT = join(import.meta.dirname, "..");
const LIVE = "https://img.sofascore.com/api/v1/sport/football/events/live";
const EVENT = "https://img.sofascore.com/api/v1/event/";
const SEARCH = "https://img.sofascore.com/api/v1/search/all";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const YOUTH = /\b(u1[5-9]|u2[0-3]|reserve|reserves|ii|iii|women|vrouwen|w)\b/i;
const INTERVAL = 10_000;
const TMP = join(tmpdir(), "board-scores.json");
const PUBLIC = join(ROOT, "public/data/scores.json");

function slatePaths() {
  const today = new Date().toISOString().slice(0, 10);
  return [join(ROOT, `public/data/slate-${today}.json`), join(ROOT, "public/data/slate.json")];
}

function headers() {
  return {
    "User-Agent": UA,
    Accept: "application/json",
    Origin: "https://www.sofascore.com",
    Referer: "https://www.sofascore.com/",
  };
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function core(s) {
  return norm(s)
    .replace(/\b(fc|cf|sc|afc|cfc|fk|sk|ac|cd|c d|the|de|do|da|club|united|city|football|sporting|atletico|atl)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameScore(query, result) {
  const q = core(query);
  const r = core(result);
  if (!q || !r) return 0;
  if (q === r) return 1;
  if (r.startsWith(q) || q.startsWith(r)) return 0.9;
  if (q.length >= 5 && r.includes(q)) return 0.8;
  if (r.length >= 5 && q.includes(r)) return 0.78;
  const qt = new Set(q.split(" ").filter((t) => t.length > 1));
  const rt = new Set(r.split(" ").filter((t) => t.length > 1));
  if (!qt.size || !rt.size) return 0;
  let hit = 0;
  for (const t of qt) if (rt.has(t)) hit += 1;
  return hit / Math.max(qt.size, rt.size);
}

function youthMismatch(a, b) {
  return YOUTH.test(a) !== YOUTH.test(b);
}

function goals(side) {
  const n = side?.current ?? side?.display;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function clock(ev) {
  const st = ev.status ?? {};
  const type = String(st.type ?? "");
  const desc = String(st.description ?? "");
  if (type === "finished" || st.code === 100) return "FT";
  if (st.code === 31 || /half/i.test(desc)) return "HT";
  if (type === "notstarted") return "Scheduled";
  const t = ev.time ?? ev.statusTime ?? {};
  const start = Number(t.currentPeriodStartTimestamp ?? ev.currentPeriodStartTimestamp ?? 0);
  const initial = Number(t.initial ?? 0);
  if (!start) return desc || "Live";
  const mins = Math.max(1, Math.floor((Date.now() / 1000 - start + initial) / 60));
  return `${mins}'`;
}

function teamLogo(team) {
  const id = team?.id;
  if (!id) return null;
  return `https://img.sofascore.com/api/v1/team/${id}/image`;
}

function toPatch(ev) {
  const home = ev.homeTeam?.name;
  const away = ev.awayTeam?.name;
  const hs = goals(ev.homeScore);
  const as = goals(ev.awayScore);
  if (!home || !away || hs == null || as == null) return null;
  const type = String(ev.status?.type ?? "");
  const live = type === "inprogress";
  const status = live ? "in" : type === "finished" ? "post" : "pre";
  return {
    home,
    away,
    homeScore: hs,
    awayScore: as,
    live,
    status,
    detail: clock(ev),
    homeLogo: teamLogo(ev.homeTeam),
    awayLogo: teamLogo(ev.awayTeam),
  };
}

async function getJson(url) {
  const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(8_000) });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

function pairScore(home, away, patch) {
  if (youthMismatch(home, patch.home) || youthMismatch(away, patch.away)) return { score: 0, swap: false };
  const hh = nameScore(home, patch.home);
  const aa = nameScore(away, patch.away);
  const ha = nameScore(home, patch.away);
  const ah = nameScore(away, patch.home);
  const straight = Math.min(hh, aa);
  const swapped = Math.min(ha, ah);
  if (straight >= swapped) return { score: straight, swap: false };
  return { score: swapped, swap: true };
}

function matchPatch(home, away, patches) {
  let best = null;
  for (const patch of patches) {
    const hit = pairScore(home, away, patch);
    if (hit.score < 0.78) continue;
    if (!best || hit.score > best.score) best = { patch, swap: hit.swap, score: hit.score };
  }
  return best;
}

const idCache = new Map();

async function searchPatch(fixture) {
  const key = `${norm(fixture.home.name)}|${norm(fixture.away.name)}|${fixture.start.slice(0, 10)}`;
  let id = idCache.get(key);
  if (!id) {
    const q = encodeURIComponent(`${fixture.home.name} ${fixture.away.name}`);
    const data = await getJson(`${SEARCH}?q=${q}&page=0`);
    const events = (data.results ?? []).filter((r) => r.type === "event" && r.entity).map((r) => r.entity);
    let best = null;
    for (const ev of events) {
      const hit = pairScore(fixture.home.name, fixture.away.name, {
        home: ev.homeTeam?.name ?? "",
        away: ev.awayTeam?.name ?? "",
      });
      if (hit.score < 0.84) continue;
      const ts = Number(ev.startTimestamp ?? 0) * 1000;
      const start = Date.parse(fixture.start);
      if (Number.isFinite(start) && ts && Math.abs(ts - start) > 18 * 3600_000) continue;
      if (!best || hit.score > best.score) best = ev;
    }
    if (!best?.id) return null;
    id = best.id;
    idCache.set(key, id);
  }
  const full = await getJson(`${EVENT}${id}`);
  return toPatch(full.event ?? full);
}

async function tick() {
  const liveData = await getJson(LIVE);
  const live = (liveData.events ?? [])
    .map(toPatch)
    .filter(Boolean)
    .filter((p) => !YOUTH.test(p.home) && !YOUTH.test(p.away));
  let fixtures = [];
  for (const path of slatePaths()) {
    try {
      fixtures = JSON.parse(await readFile(path, "utf8")).fixtures ?? [];
      if (fixtures.length) break;
    } catch {
      /* try next dated slate */
    }
  }
  const extra = [];
  for (const f of fixtures) {
    if (matchPatch(f.home.name, f.away.name, live)) continue;
    const start = Date.parse(f.start);
    if (!Number.isFinite(start) || start > Date.now() - 8 * 60_000) continue;
    try {
      const patch = await searchPatch(f);
      if (patch) extra.push(patch);
    } catch {
      /* skip one miss */
    }
  }
  const patches = [...live, ...extra];
  const board = [];
  const seen = new Set();
  for (const patch of live) {
    const key = `${patch.home}|${patch.away}`;
    if (seen.has(key)) continue;
    seen.add(key);
    board.push(patch);
  }
  for (const f of fixtures) {
    const hit = matchPatch(f.home.name, f.away.name, patches);
    if (!hit) continue;
    const key = `${hit.patch.home}|${hit.patch.away}`;
    if (seen.has(key)) continue;
    seen.add(key);
    board.push(hit.patch);
  }
  const pack = { fetchedAt: new Date().toISOString(), scores: board };
  const body = JSON.stringify(pack);
  await writeFile(TMP, body);
  await writeFile(PUBLIC, body);
  return pack.scores.length;
}

async function loop() {
  for (;;) {
    const t0 = Date.now();
    try {
      const n = await tick();
      console.log(`scores ${n} in ${Date.now() - t0}ms`);
    } catch (err) {
      console.warn("score tick failed", err.message);
    }
    const wait = Math.max(2_000, INTERVAL - (Date.now() - t0));
    await new Promise((r) => setTimeout(r, wait));
  }
}

await loop();
