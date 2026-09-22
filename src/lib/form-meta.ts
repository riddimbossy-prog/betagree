import type { FormMetric, FormPole, FormVenue } from "@/lib/types";

export const FORM_METRICS: { id: FormMetric; label: string }[] = [
  { id: "wins", label: "Wins" },
  { id: "draws", label: "Draws" },
  { id: "losses", label: "Losses" },
  { id: "scored", label: "Scored" },
  { id: "conceded", label: "Conceded" },
];

export const FORM_VENUES: { id: FormVenue; label: string }[] = [
  { id: "overall", label: "All" },
  { id: "home", label: "Home" },
  { id: "away", label: "Away" },
];

export function formBoardId(pole: FormPole, metric: FormMetric) {
  if (metric === "scored") return `${pole}-goals-scored`;
  if (metric === "conceded") return `${pole}-goals-conceded`;
  return `${pole}-${metric}`;
}

export function formBarWidth(row: { valueKind: "pct" | "avg"; rate: number | null }) {
  if (row.rate == null) return 0;
  if (row.valueKind === "avg") return Math.max(6, Math.min(100, (row.rate / 4) * 100));
  const pct = row.rate > 1 ? row.rate : row.rate * 100;
  return Math.max(6, Math.min(100, pct));
}