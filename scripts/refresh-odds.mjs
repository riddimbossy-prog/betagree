#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildOddsBook } from "./lib/attach-odds.mjs";

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
  return { fixtures: [] };
}

const slate = readSlate();
const book = await buildOddsBook(slate.fixtures ?? []);
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "odds.json"), JSON.stringify(book));
console.log(
  `odds ${book.matched}/${book.events} matched · 1x2 ${book.counts.one} dc ${book.counts.dc} dnb ${book.counts.dnb} ou ${book.counts.ou} btts ${book.counts.btts}`,
);
