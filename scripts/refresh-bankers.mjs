#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildBankerBoard } from "./lib/banker-board.mjs";

const ROOT = join(import.meta.dirname, "..");
const DATA = join(ROOT, "public/data");

async function readJson(name) {
  try {
    return JSON.parse(await readFile(join(DATA, name), "utf8"));
  } catch {
    return null;
  }
}

const idx = (await readJson("index.json")) ?? {};
const today = idx.today || new Date().toISOString().slice(0, 10);
const tomorrow = idx.tomorrow || new Date(Date.now() + 86400_000).toISOString().slice(0, 10);
const todaySlate = (await readJson(`slate-${today}.json`)) ?? (await readJson("slate.json")) ?? { fixtures: [] };
const tomSlate = (await readJson(`slate-${tomorrow}.json`)) ?? { fixtures: [] };

const fixtures = [];
const seen = new Set();
for (const f of [...(todaySlate.fixtures ?? []), ...(tomSlate.fixtures ?? [])]) {
  if (!f?.id || seen.has(f.id)) continue;
  seen.add(f.id);
  fixtures.push(f);
}

const board = await buildBankerBoard({
  fixtures,
  date: today,
  dateLabel: todaySlate.dateLabel || today,
});
mkdirSync(DATA, { recursive: true });
writeFileSync(join(DATA, "bankers.json"), JSON.stringify(board));
console.log(
  `bankers v2 ${today}/${tomorrow} scanned ${board.scanned} analyzed ${board.analyzed} qualified ${board.picks.length} skips ${JSON.stringify(board.meta.skips)}`,
);
