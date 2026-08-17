export type ConsensusBand = "high" | "medium" | "low";

export const SITE_COUNT = 22;

export const BAND_META: Record<
  ConsensusBand,
  { id: ConsensusBand; label: string; blurb: string; floor: string }
> = {
  high: { id: "high", label: "High", blurb: "70%+ of tip sites on the same pick", floor: "70%+" },
  medium: { id: "medium", label: "Medium", blurb: "50–69% of tip sites", floor: "50–69%" },
  low: { id: "low", label: "Low", blurb: "Split board — under half the sites", floor: "<50%" },
};

export function consensusBand(pct: number): ConsensusBand {
  if (pct >= 0.7) return "high";
  if (pct >= 0.5) return "medium";
  return "low";
}

export function bandOf(item: { band?: ConsensusBand | null; pct: number }): ConsensusBand {
  return item.band ?? consensusBand(item.pct);
}
