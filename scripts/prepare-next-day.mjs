#!/usr/bin/env node
/**
 * Day-before prep: refresh tomorrow's board, then resolve every club crest
 * so the page never goes live with empty shields.
 *
 *   node scripts/prepare-next-day.mjs
 *   node scripts/prepare-next-day.mjs --crests-only
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fillCrests } from "./lib/fill-crests.mjs";

const ROOT = join(import.meta.dirname, "..");
const crestsOnly = process.argv.includes("--crests-only");

function run(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [file], {
      cwd: ROOT,
      stdio: "inherit",
    });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${file} exited ${code}`))));
  });
}

if (!crestsOnly) {
  console.log("prepare-next-day: refreshing board + streaks");
  await run("scripts/refresh-board.mjs");
  try {
    await run("scripts/fetch-streaks.mjs");
  } catch (err) {
    console.warn("prepare-next-day: streaks skipped", err.message);
  }
}

console.log("prepare-next-day: filling crests");
const crests = await fillCrests({ limit: Number(process.env.CREST_FILL_LIMIT || 160) });

let today = "";
let tomorrow = "";
let todayFix = 0;
let tomFix = 0;
try {
  const idx = JSON.parse(await readFile(join(ROOT, "public/data/index.json"), "utf8"));
  today = idx.today ?? "";
  tomorrow = idx.tomorrow ?? "";
  todayFix = idx.days?.[today]?.fixtures ?? 0;
  tomFix = idx.days?.[tomorrow]?.fixtures ?? 0;
} catch {
  /* optional */
}

const report = {
  preparedAt: new Date().toISOString(),
  today,
  tomorrow,
  fixtures: { today: todayFix, tomorrow: tomFix },
  crests,
  ready: crests.stillMissing.length === 0,
};
mkdirSync(join(ROOT, "public/data"), { recursive: true });
writeFileSync(join(ROOT, "public/data/prepare.json"), JSON.stringify(report));
console.log(
  `prepare-next-day: ${tomorrow || "tomorrow"} ${tomFix} fixtures · clubs ${crests.clubs} · saved ${crests.saved} · still missing ${crests.stillMissing.length}`,
);
if (crests.stillMissing.length) {
  console.log("prepare-next-day missing:", crests.stillMissing.slice(0, 24).join(" · "));
}

if (!existsSync(join(ROOT, "public/data/slate.json"))) {
  process.exitCode = 1;
}
