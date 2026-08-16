import type { TrendCategory } from "@/lib/types";

export const CATEGORY_META: { id: TrendCategory; label: string; blurb: string }[] = [
  { id: "wins", label: "Most wins", blurb: "Season win rate of 70%+ and the side is priced 1.20–1.55." },
  { id: "losses", label: "Most losses", blurb: "Fade a 70%+ losing side — the opponent is the short price." },
  { id: "winless", label: "Winless", blurb: "No-win rate of 70%+. The other side is the pick, only if it is 1.20–1.55." },
  { id: "undefeated", label: "Undefeated", blurb: "Unbeaten in 70%+ of league games and still a short favourite." },
  { id: "over25", label: "Over 2.5", blurb: "Over 2.5 in 70%+ of league games, over price 1.20–1.55." },
  { id: "under25", label: "Under 2.5", blurb: "Under 2.5 in 70%+ of league games, under price 1.20–1.55." },
  { id: "gg", label: "GG", blurb: "Both teams scored in 70%+ of recent games, GG priced 1.20–1.55." },
];
