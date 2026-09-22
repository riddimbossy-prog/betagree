#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { sofascoreBadge } from "../src/lib/crest-online.ts";

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function walk(o, names) {
  if (!o) return;
  if (Array.isArray(o)) {
    for (const x of o) walk(x, names);
    return;
  }
  if (typeof o === "object") {
    for (const k of ["home", "away", "name", "team", "favorite"]) {
      const v = o[k];
      if (typeof v === "string") names.add(v);
      if (v && typeof v === "object" && typeof v.name === "string") names.add(v.name);
    }
    for (const v of Object.values(o)) if (v && typeof v === "object") walk(v, names);
  }
}

const names = new Set();
for (const f of ["public/data/slate.json", "public/data/streaks.json", "public/data/form.json", "public/data/trends.json"]) {
  walk(JSON.parse(await readFile(f, "utf8")), names);
}

const idx = JSON.parse(await readFile("public/crests/index.json", "utf8"));
idx.byName ||= {};
const missing = [...names].filter((n) => n && !idx.byName[norm(n)]);
console.log("unique", names.size, "unmapped", missing.length);

let added = 0;
const fail = [];
for (let i = 0; i < missing.length; i += 3) {
  const chunk = missing.slice(i, i + 3);
  const res = await Promise.all(chunk.map(async (n) => [n, await sofascoreBadge(n)]));
  for (const [n, url] of res) {
    if (!url) {
      fail.push(n);
      continue;
    }
    idx.byName[norm(n)] = url;
    added += 1;
  }
  if (i % 24 === 0) console.log("progress", i + chunk.length, "/", missing.length, "added", added);
  await new Promise((r) => setTimeout(r, 50));
}

idx.mapped = Object.keys(idx.byName).length;
idx.updatedAt = new Date().toISOString();
const out = JSON.stringify(idx);
JSON.parse(out); // refuse to write corrupt JSON
await writeFile("public/crests/index.json", out);
console.log("added", added, "mapped", idx.mapped, "fail", fail.length);
if (fail.length) console.log("fail", fail.join(" | "));
