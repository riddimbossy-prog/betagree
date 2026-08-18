#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildFormBoard } from "./lib/desks.mjs";

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

const slate = readSlate();
const form = await buildFormBoard({
  fixtures: slate.fixtures ?? [],
  date: today,
  dateLabel: slate.dateLabel,
});

mkdirSync(dir, { recursive: true });
const hasRows = Object.values(form.boards ?? {}).some((b) => (b.overall?.length ?? 0) > 0);
if (!hasRows) {
  console.log("form refresh empty — kept previous file");
  process.exit(0);
}

writeFileSync(join(dir, "form.json"), JSON.stringify(form));
const previewBoard = form.boards?.["most-wins"];
if (previewBoard) {
  writeFileSync(
    join(dir, "form-preview.json"),
    JSON.stringify({
      ...form,
      boards: {
        "most-wins": {
          ...previewBoard,
          overall: (previewBoard.overall ?? []).filter((r) => r.playingToday || r.boardLabel).slice(0, 8),
          home: [],
          away: [],
        },
      },
    }),
  );
}

const playing = form.playingToday ?? 0;
const linked = (form.boards?.["most-wins"]?.overall ?? []).filter((r) => r.fixtureId).length;
console.log(`form refreshed ${today} · playing ${playing} · linked ${linked}`);
