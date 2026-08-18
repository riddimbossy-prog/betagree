#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTrends } from "./lib/desks.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "public", "data");
const today = new Date().toISOString().slice(0, 10);

function readSlate() {
  for (const name of [`slate-${today}.json`, "slate.json"]) {
    try {
      return JSON.parse(readFileSync(join(dir, name), "utf8"));
    } catch {
      /* next */
    }
  }
  return { fixtures: [], dateLabel: today };
}

function readJson(name) {
  try {
    return JSON.parse(readFileSync(join(dir, name), "utf8"));
  } catch {
    return null;
  }
}

const slate = readSlate();
const trends = await buildTrends({
  fixtures: slate.fixtures ?? [],
  date: today,
  dateLabel: slate.dateLabel,
  odds: readJson("odds.json"),
});
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "trends.json"), JSON.stringify(trends));
const n = Object.values(trends.counts ?? {}).reduce((a, b) => a + b, 0);
console.log(`trends ${today} · ${n} picks · bankers ${trends.bankers?.length ?? 0} · games ${trends.games}`);
