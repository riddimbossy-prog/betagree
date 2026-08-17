#!/usr/bin/env node
/**
 * Remove polluted crest mappings (players, list pages, national teams, etc.)
 * Run: node scripts/clean-crests-index.mjs
 * Then re-run: node scripts/fetch-sofascore-crests.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const INDEX = join(import.meta.dirname, "../public/crests/index.json");

const BAD_TITLE =
  /footballer|born \d{4}|list of |national (football|soccer) team|in european football|disambiguation|manager|coach|politician|musician|actor|referee|\bcup$/i;
const BAD_FILE =
  /footballer|list-of-|national-football-team|in-european-football|mertesacker|martens|ascacibar|gyomber|zahzu|leyes|davids|urozov|levi-footballer|silva-footballer|luciano-footballer|2025-norwegian/i;

const index = JSON.parse(await readFile(INDEX, "utf8"));
index.byName ??= {};
index.files ??= {};

const removed = [];
for (const [k, v] of Object.entries(index.byName)) {
  const file = String(v || "").replace(/^\/crests\//, "");
  const title = index.files[file] || "";
  if (BAD_TITLE.test(title) || BAD_FILE.test(file) || BAD_FILE.test(k) || BAD_TITLE.test(k)) {
    removed.push({ k, v, title });
    delete index.byName[k];
  }
}
for (const f of Object.keys(index.files)) {
  if (BAD_FILE.test(f) || BAD_TITLE.test(index.files[f] || "")) delete index.files[f];
}

index.mapped = Object.keys(index.byName).length;
index.cleanedAt = new Date().toISOString();
index.cleanedCount = (index.cleanedCount || 0) + removed.length;
await writeFile(INDEX, JSON.stringify(index));
console.log("removed", removed.length, "mapped", index.mapped);
for (const r of removed.slice(0, 30)) console.log(" -", r.k, "->", r.title);
