#!/usr/bin/env node
/**
 * Pull SportyBet 2+ / 3+ Goals Streak prices, join league tables,
 * and keep only matches that clear the user's bands:
 *   2+ Yes  1.19–1.40  AND favorite's opponent PPG < 1.2
 *   3+      (Yes + No) / 2 in 1.90–2.10  → assign Over 2.5 goals
 */
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { namesMatch as matchNames } from "./lib/names-match.mjs";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "public/data/streaks.json");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const SB = "https://www.sportybet.com/api/ng/factsCenter";
const ESPN = "https://site.web.api.espn.com/apis/v2/sports/soccer";
const PAGE = 80;
const HORIZON_DAYS = 8;

const TWO_YES = { from: 1.19, to: 1.4 };
const THREE_AVG = { from: 1.9, to: 2.1 };
/** Opponent of the favorite must average under this PPG for 2+ picks. */
const OPP_PPG_MAX = 1.2;
