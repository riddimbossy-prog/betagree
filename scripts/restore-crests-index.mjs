#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const parts = [];
for (let i = 0; i < 4; i++) {
  parts.push(await readFile(join(root, `public/crests/index.b64.${i}.txt`), "utf8"));
}
const json = inflateSync(Buffer.from(parts.join("").trim(), "base64")).toString("utf8");
const dest = join(root, "public/crests/index.json");
await writeFile(dest, json);
const n = Object.keys(JSON.parse(json).byName).length;
console.log("restored crest index", n, "teams");
