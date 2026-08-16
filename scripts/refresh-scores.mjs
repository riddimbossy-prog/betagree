#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const LIVE = "https://img.sofascore.com/api/v1/sport/football/events/live";
const EVENT = "https://img.sofascore.com/api/v1/event/";
const SEARCH = "https://img.sofascore.com/api/v1/search/all";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const YOUTH = /\b(u1[5-9]|u2[0-3]|reserve|reserves|ii|iii|women|vrouwen|w)\b/i;

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

function toPatch(ev) {
  const home = ev.homeTeam?.name;
  const away = ev.awayTeam?.name;
  const hs = goals(ev.homeScore);
  const as = goals(ev.awayScore);
  if (!home || !away || hs == null || as == null) return null;
  const type = String(ev.status?.type ?? "");
  const live = type === "inprogress";
  const status = live ? "in" : type === "finished" ? "post" : "pre";
  return { home, away, homeScore: hs, awayScore: as, live, status, detail: clock(ev) };
}

async function getJson(url) {
  const res = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(14_000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
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

function applyPatch(fixture, hit) {
  const { patch, swap } = hit;
  const homeScore = swap ? patch.awayScore : patch.homeScore;
  const awayScore = swap ? patch.homeScore : patch.awayScore;
  return {
    ...fixture,
    live: patch.live,
    status: patch.status,
    detail: patch.detail,
    home: { ...fixture.home, score: homeScore },
    away: { ...fixture.away, score: awayScore },
  };
}

async function searchPatch(fixture) {
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
  const full = await getJson(`${EVENT}${best.id}`);
  return toPatch(full.event ?? full);
}

const liveData = await getJson(LIVE);
const live = (liveData.events ?? []).map(toPatch).filter(Boolean);
console.log("live events", live.length);

const slatePath = join(ROOT, "public/data/slate.json");
const slate = JSON.parse(await readFile(slatePath, "utf8"));
const extra = [];
for (const f of slate.fixtures) {
  if (matchPatch(f.home.name, f.away.name, live)) continue;
  const start = Date.parse(f.start);
  if (!Number.isFinite(start) || start > Date.now() - 8 * 60_000) continue;
  try {
    const patch = await searchPatch(f);
    if (patch) extra.push(patch);
  } catch (err) {
    console.warn("search miss", f.home.name, f.away.name, err.message);
  }
}
const patches = [...live, ...extra];

function applySlate(board) {
  const fixtures = board.fixtures.map((f) => {
    const hit = matchPatch(f.home.name, f.away.name, patches);
    return hit ? applyPatch(f, hit) : f;
  });
  const byId = new Map(fixtures.map((f) => [f.id, f]));
  return {
    ...board,
    fetchedAt: new Date().toISOString(),
    fixtures,
    consensus: (board.consensus ?? []).map((c) => ({
      ...c,
      fixture: byId.get(c.fixture.id) ?? c.fixture,
    })),
  };
}

const next = applySlate(slate);
await writeFile(slatePath, JSON.stringify(next));
const dated = join(ROOT, `public/data/slate-${next.date}.json`);
await writeFile(dated, JSON.stringify(next));
await writeFile(join(ROOT, "public/data/scores.json"), JSON.stringify({ fetchedAt: next.fetchedAt, scores: patches }));

const liveN = next.fixtures.filter((f) => f.live).length;
const scored = next.fixtures.filter((f) => (f.home.score ?? 0) + (f.away.score ?? 0) > 0 || f.status === "post" || f.live);
console.log("wrote scores", patches.length, "live fixtures", liveN, "updated", scored.length);
for (const f of next.fixtures.filter((x) => x.live || x.status === "post")) {
  console.log(`${f.detail.padEnd(6)} ${f.away.name} ${f.away.score} - ${f.home.score} ${f.home.name}`);
}
