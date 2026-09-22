import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SlatePayload, StreaksPayload, TrendsPayload } from "../types";
import { applySlateScores, type ScorePatch } from "./score-apply";
import { mergeLiveFixtures } from "./merge-live";
import type { AppSnapshot } from "./snapshot-context";

import { parseJsonLoose } from "../safe-fetch";
import { hydrateSlate } from "./slim-slate";

async function readJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = parseJsonLoose<T | null>(raw, null);
    return parsed;
  } catch {
    return null;
  }
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export async function loadBoardSnapshot(): Promise<SlatePayload> {
  const root = process.cwd();
  const today = todayUtc();
  const slate =
    (await readJson<SlatePayload>(join(root, `public/data/slate-${today}.json`))) ??
    (await readJson<SlatePayload>(join(root, "public/data/slate.json")));
  if (!slate) {
    return {
      date: today,
      dateLabel: today,
      fetchedAt: new Date().toISOString(),
      fixtures: [],
      picks: [],
      consensus: [],
      desks: [],
    };
  }
  const pack = await readJson<{ scores?: ScorePatch[] }>(join(root, "public/data/scores.json"));
  const scores = pack?.scores ?? [];
  return hydrateSlate(mergeLiveFixtures(applySlateScores(slate, scores), scores));
}

export async function loadAppSnapshot(): Promise<AppSnapshot> {
  const [slate, trends, streaks] = await Promise.all([
    loadBoardSnapshot(),
    readJson<TrendsPayload>(join(process.cwd(), "public/data/trends.json")),
    readJson<StreaksPayload>(join(process.cwd(), "public/data/streaks.json")),
  ]);
  return { slate, form: null, trends, streaks, ledger: null };
}
