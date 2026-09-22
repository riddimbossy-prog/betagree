import type { TrendCategory } from "@/lib/types";

export const FORM_ODDS_FROM = 1.19;
export const FORM_ODDS_TO = 1.55;

export type FormFamily = "result" | "goals" | "gg" | "half";

export const FAMILY_META: { id: FormFamily; label: string }[] = [
  { id: "result", label: "Result" },
  { id: "goals", label: "Totals" },
  { id: "gg", label: "GG" },
  { id: "half", label: "First half" },
];

export const CATEGORY_META: {
  id: TrendCategory;
  label: string;
  blurb: string;
  pole: "best" | "worst";
  family: FormFamily;
}[] = [
  { id: "wins", pole: "best", family: "result", label: "Best to win", blurb: "Venue last 5 at 80%+ wins, price 1.19–1.55." },
  { id: "undefeated", pole: "best", family: "result", label: "Undefeated", blurb: "Unbeaten in last 5 home or away games." },
  { id: "over15", pole: "best", family: "goals", label: "Over 1.5", blurb: "Both last 5s agree Over 1.5 at 80%+." },
  { id: "over25", pole: "best", family: "goals", label: "Over 2.5", blurb: "Both last 5s agree Over 2.5 at 80%+." },
  { id: "over35", pole: "best", family: "goals", label: "Over 3.5", blurb: "Both last 5s agree Over 3.5 at 80%+." },
  { id: "gg", pole: "best", family: "gg", label: "GG", blurb: "Both last 5s both-teams-scored at 80%+." },
  { id: "ht_over05", pole: "best", family: "half", label: "HT Over 0.5", blurb: "Both last 5 first halves Over 0.5 at 80%+." },
  { id: "ht_over15", pole: "best", family: "half", label: "HT Over 1.5", blurb: "Both last 5 first halves Over 1.5 at 80%+." },
  { id: "ht_gg", pole: "best", family: "half", label: "HT GG", blurb: "Both last 5 first halves saw both teams score." },
  { id: "losses", pole: "worst", family: "result", label: "Fade losses", blurb: "Venue last 5 losses 80%+ — opponent is the pick." },
  { id: "winless", pole: "worst", family: "result", label: "Fade winless", blurb: "Venue last 5 without a win — opponent if 1.19–1.55." },
  { id: "under15", pole: "worst", family: "goals", label: "Under 1.5", blurb: "Both last 5s agree Under 1.5 at 80%+." },
  { id: "under25", pole: "worst", family: "goals", label: "Under 2.5", blurb: "Both last 5s agree Under 2.5 at 80%+." },
  { id: "under35", pole: "worst", family: "goals", label: "Under 3.5", blurb: "Both last 5s agree Under 3.5 at 80%+." },
  { id: "ng", pole: "worst", family: "gg", label: "NG", blurb: "Both last 5s finished without GG at 80%+." },
  { id: "ht_under05", pole: "worst", family: "half", label: "HT Under 0.5", blurb: "Both last 5 first halves Under 0.5 at 80%+." },
  { id: "ht_under15", pole: "worst", family: "half", label: "HT Under 1.5", blurb: "Both last 5 first halves Under 1.5 at 80%+." },
];
