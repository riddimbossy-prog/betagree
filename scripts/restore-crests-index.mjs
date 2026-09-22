#!/usr/bin/env node
/**
 * Restore public/crests/index.json from the durable b64 shards.
 * If shards are corrupt / truncated, fall back to the live site index
 * so a bad commit can never blank crests again.
 */
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "public/crests/index.json");

const PINNED = {
  monza: "/crests/ac-monza.png",
  "ac monza": "/crests/ac-monza.png",
  "associazione calcio monza": "/crests/ac-monza.png",
  "club brugge": "/crests/club-brugge.png",
  "club brugge kv": "/crests/club-brugge.png",
  "cercle brugge": "/crests/cercle-brugge.png",
  "cercle brugge ksv": "/crests/cercle-brugge.png",
};

function applyPinned(json) {
  const data = typeof json === "string" ? JSON.parse(json) : json;
  data.byName = data.byName || {};
  for (const [k, v] of Object.entries(PINNED)) data.byName[k] = v;
  return data;
}

async function fromShards() {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    parts.push(await readFile(join(root, `public/crests/index.b64.${i}.txt`), "utf8"));
  }
  const json = inflateSync(Buffer.from(parts.join("").trim(), "base64")).toString("utf8");
  return applyPinned(json);
}

async function fromLive() {
  const res = await fetch("https://betagree.com/crests/index.json", {
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`live index HTTP ${res.status}`);
  return applyPinned(await res.json());
}

async function fromExisting() {
  const raw = await readFile(dest, "utf8");
  if (raw.includes("PLACEHOLDER")) throw new Error("PLACEHOLDER index");
  const data = applyPinned(JSON.parse(raw));
  if (Object.keys(data.byName || {}).length < 200) throw new Error("thin index");
  return data;
}

let data = null;
let source = "";
for (const [label, fn] of [
  ["shards", fromShards],
  ["existing", fromExisting],
  ["live", fromLive],
]) {
  try {
    data = await fn();
    source = label;
    break;
  } catch (err) {
    console.warn(`crest restore via ${label} failed:`, err.message || err);
  }
}

if (!data) {
  console.error("Could not restore crest index from shards, disk, or live site");
  process.exit(1);
}

const n = Object.keys(data.byName).length;
if (n < 200) {
  console.error("crest index too small after restore:", n);
  process.exit(1);
}

await writeFile(dest, JSON.stringify(data));
console.log("restored crest index", n, "teams via", source);
