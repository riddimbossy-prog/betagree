#!/usr/bin/env node
/**
 * Nightly prep — run the day before a board goes live.
 *
 *   1. Refresh today's live board (fixtures, consensus, form, trends, odds)
 *   2. Write tomorrow's slate while ESPN still has the list
 *   3. Refresh streaks (tomorrow-first)
 *   4. Fill crests for tomorrow's clubs first, then today, then the rest
 *   5. Verify every tomorrow club has a local badge file
 *   6. Write public/data/prepare.json
 *
 *   node scripts/prepare-next-day.mjs
 *   node scripts/prepare-next-day.mjs --crests-only
 *   node scripts/prepare-next-day.mjs --board-only
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fillCrests } from "./lib/fill-crests.mjs";

const ROOT = join(import.meta.dirname, "..");
const DATA = join(ROOT, "public/data");
const crestsOnly = process.argv.includes("--crests-only");
const boardOnly = process.argv.includes("--board-only");

const steps = [];

function run(file) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const child = spawn(process.execPath, [file], { cwd: ROOT, stdio: "inherit" });
    child.on("exit", (code) => {
      const ms = Date.now() - started;
      if (code === 0) resolve(ms);
      else reject(Object.assign(new Error(`${file} exited ${code}`), { ms }));
    });
  });
}

async function step(id, label, fn) {
  const started = Date.now();
  process.stdout.write(`prepare-next-day [${id}] ${label}…\n`);
  try {
    const extra = await fn();
    const rec = { id, label, ok: true, ms: Date.now() - started, ...extra };
    steps.push(rec);
    console.log(`prepare-next-day [${id}] ok ${rec.ms}ms`);
    return rec;
  } catch (err) {
    const rec = { id, label, ok: false, ms: Date.now() - started, error: err.message };
    steps.push(rec);
    console.warn(`prepare-next-day [${id}] fail`, err.message);
    return rec;
  }
}

async function readJson(rel, fallback = null) {
  try {
    return JSON.parse(await readFile(join(ROOT, rel), "utf8"));
  } catch {
    return fallback;
  }
}

function teamsFromSlate(slate) {
  const names = [];
  for (const f of slate?.fixtures ?? []) {
    if (f.home?.name) names.push(f.home.name);
    if (f.away?.name) names.push(f.away.name);
  }
  for (const p of slate?.picks ?? []) {
    if (p.home) names.push(p.home);
    if (p.away) names.push(p.away);
    if (p.favorite) names.push(typeof p.favorite === "string" ? p.favorite : p.favorite?.name);
  }
  return [...new Set(names.filter(Boolean))];
}

if (!crestsOnly) {
  await step("1-board", "refresh today + write tomorrow slate", async () => {
    const ms = await run("scripts/refresh-board.mjs");
    return { childMs: ms };
  });
  await step("2-streaks", "refresh streaks (tomorrow first)", async () => {
    const ms = await run("scripts/fetch-streaks.mjs");
    return { childMs: ms };
  });
  await step("2b-bankers", "banker rules v2 for today + tomorrow", async () => {
    const ms = await run("scripts/refresh-bankers.mjs");
    return { childMs: ms };
  });
}

const idx = (await readJson("public/data/index.json", {})) ?? {};
const today = idx.today ?? new Date().toISOString().slice(0, 10);
const tomorrow =
  idx.tomorrow ?? new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
const todaySlate = await readJson(`public/data/slate-${today}.json`, await readJson("public/data/slate.json", {}));
const tomSlate = await readJson(`public/data/slate-${tomorrow}.json`, { fixtures: [], consensus: [] });
const todayTeams = teamsFromSlate(todaySlate);
const tomTeams = teamsFromSlate(tomSlate);

let crests = {
  clubs: 0,
  missingBefore: 0,
  saved: 0,
  stillMissing: [],
  mapped: 0,
  tomorrowMissing: tomTeams,
};

if (!boardOnly) {
  await step("3-crests", "fill badges — tomorrow first", async () => {
    crests = await fillCrests({
      limit: Number(process.env.CREST_FILL_LIMIT || 160),
      priority: [...tomTeams, ...todayTeams],
    });
    return { saved: crests.saved, still: crests.stillMissing.length };
  });
}

const verify = { tomorrow: [], today: [] };
if (!boardOnly) {
  await step("4-verify", "check tomorrow clubs have local files", async () => {
    const again = await fillCrests({ limit: 0, priority: tomTeams });
    const missTom = tomTeams.filter((n) => again.stillMissing.includes(n));
    const missToday = todayTeams.filter((n) => again.stillMissing.includes(n));
    verify.tomorrow = missTom;
    verify.today = missToday;
    crests.tomorrowMissing = missTom;
    return { tomorrowMissing: missTom.length, todayMissing: missToday.length };
  });
}

const ready =
  (tomSlate.fixtures?.length ?? 0) > 0 && (crests.tomorrowMissing?.length ?? tomTeams.length) === 0;

const report = {
  preparedAt: new Date().toISOString(),
  today,
  tomorrow,
  ready,
  fixtures: {
    today: todaySlate.fixtures?.length ?? idx.days?.[today]?.fixtures ?? 0,
    tomorrow: tomSlate.fixtures?.length ?? idx.days?.[tomorrow]?.fixtures ?? 0,
  },
  consensus: {
    today: todaySlate.consensus?.length ?? idx.days?.[today]?.consensus ?? 0,
    tomorrow: tomSlate.consensus?.length ?? idx.days?.[tomorrow]?.consensus ?? 0,
  },
  teams: { today: todayTeams.length, tomorrow: tomTeams.length },
  crests: {
    ...crests,
    tomorrowMissing: verify.tomorrow,
    todayMissing: verify.today,
  },
  steps,
};
mkdirSync(DATA, { recursive: true });
writeFileSync(join(DATA, "prepare.json"), JSON.stringify(report));

console.log(
  `prepare-next-day: ${ready ? "READY" : "NOT READY"} · ${tomorrow} ${report.fixtures.tomorrow} fixtures / ${report.consensus.tomorrow} tips · crests missing tomorrow ${verify.tomorrow.length}`,
);
if (verify.tomorrow.length) {
  console.log("prepare-next-day tomorrow gaps:", verify.tomorrow.slice(0, 24).join(" · "));
}

if (!existsSync(join(DATA, "slate.json"))) process.exitCode = 1;
if (!ready && process.env.PREPARE_STRICT === "1") process.exitCode = 2;
