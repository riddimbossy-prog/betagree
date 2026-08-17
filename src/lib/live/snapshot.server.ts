import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { FormPayload, LedgerPayload, SlatePayload, StreaksPayload, TrendsPayload } from "../types";
import { applySlateScores, type ScorePatch } from "./score-apply";
import { mergeLiveFixtures } from "./merge-live";
import type { AppSnapshot } from "./snapshot-context";

async function readJson<T>(path: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as T;
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
  return mergeLiveFixtures(applySlateScores(slate, scores), scores);
}

export async function loadAppSnapshot(): Promise<AppSnapshot> {
  const root = process.cwd();
  const [slate, form, trends, streaks, ledger] = await Promise.all([
    loadBoardSnapshot(),
    readJson<FormPayload>(join(root, "public/data/form.json")),
    readJson<TrendsPayload>(join(root, "public/data/trends.json")),
    readJson<StreaksPayload>(join(root, "public/data/streaks.json")),
    readJson<LedgerPayload>(join(root, "public/data/ledger.json")),
  ]);
  return { slate, form, trends, streaks, ledger };
}
