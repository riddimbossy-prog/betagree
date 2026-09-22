#!/usr/bin/env node
/**
 * One scrape pass: PrimaTips + BetExplorer form, SofaScore last-5 splits, SportyBet odds.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildStreaks } from "./fetch-streaks.mjs";
import { buildStreakAccuracy } from "./analyze-streak-accuracy.mjs";
import { buildOddsBook } from "./lib/attach-odds.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "public", "data");
const today = new Date().toISOString().slice(0, 10);
const started = Date.now();

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

function write(name, data) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), JSON.stringify(data));
}

const log = [];
function step(name, ok, extra = "") {
  const line = `${ok ? "ok" : "fail"} ${name}${extra ? ` · ${extra}` : ""}`;
  log.push(line);
  console.log(line);
}

const slate = readSlate();
const report = { startedAt: new Date().toISOString(), date: today, steps: log, ok: true };
let book = null;

try {
  book = await buildOddsBook(slate.fixtures ?? []);
  write("odds.json", book);
  step("odds", true, `${book.matched}/${book.events} sporty · ${Object.keys(book.byFixture ?? {}).length} priced`);
} catch (err) {
  report.ok = false;
  step("odds", false, err.message || String(err));
}

try {
  const trends = await buildTrends({
    fixtures: slate.fixtures ?? [],
    date: today,
    dateLabel: slate.dateLabel,
    odds: book,
  });
  write("trends.json", trends);
  const n = Object.values(trends.counts ?? {}).reduce((a, b) => a + Number(b || 0), 0);
  step("trends", true, `${n} picks · ${trends.games} games`);
} catch (err) {
  report.ok = false;
  step("trends", false, err.message || String(err));
}

try {
  const form = await buildFormBoard({
    fixtures: slate.fixtures ?? [],
    date: today,
    dateLabel: slate.dateLabel,
  });
  if (Object.values(form.boards ?? {}).some((b) => (b.overall?.length ?? 0) > 0)) {
    write("form.json", form);
    step("form", true, `${form.playingToday} playing`);
  } else step("form", true, "empty — kept previous");
} catch (err) {
  report.ok = false;
  step("form", false, err.message || String(err));
}

try {
  const streaks = await buildStreaks();
  write("streaks.json", streaks);
  step(
    "streaks",
    true,
    `2+ ${streaks.counts.twoYes} · o25 ${streaks.counts.threeNo} · tomorrow ${streaks.counts.tomorrow} · weekly ${streaks.counts.weekly}`,
  );
} catch (err) {
  report.ok = false;
  step("streaks", false, err.message || String(err));
}

try {
  const accuracy = await buildStreakAccuracy();
  write("streak-accuracy.json", accuracy);
  step(
    "accuracy",
    true,
    `n=${accuracy.sample} 2+ ${(accuracy.rule2.rate * 100).toFixed(0)}% o25 ${(accuracy.ruleOver.rate * 100).toFixed(0)}%`,
  );
} catch (err) {
  report.ok = false;
  step("accuracy", false, err.message || String(err));
}

report.finishedAt = new Date().toISOString();
report.ms = Date.now() - started;
write("scrape.json", report);
console.log(`scrape done in ${Math.round(report.ms / 1000)}s`);
