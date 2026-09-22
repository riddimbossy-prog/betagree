import { BAND_META, bandOf, type ConsensusBand } from "@/lib/consensus";
import { formatPct } from "@/lib/odds";
import { cn } from "@/lib/utils";

export const BAND_TONE: Record<ConsensusBand, string> = {
  high: "glass-high text-band-high-foreground",
  medium: "glass-medium text-band-medium-foreground",
  low: "glass-low text-band-low-foreground",
};

export const BAND_OUTLINE: Record<ConsensusBand, string> = {
  high: "border border-band-high/80 text-band-high bg-transparent",
  medium: "border border-band-medium/80 text-band-medium bg-transparent",
  low: "border border-band-low/80 text-band-low bg-transparent",
};

export const BAND_BAR: Record<ConsensusBand, string> = {
  high: "bg-band-high",
  medium: "bg-band-medium",
  low: "bg-band-low",
};

export function ConsensusChip({
  pct,
  count,
  coverage,
  band,
  compact = false,
}: {
  pct: number;
  count: number;
  coverage: number;
  band?: ConsensusBand | null;
  compact?: boolean;
}) {
  const resolved = bandOf({ band, pct });
  return (
    <span
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold",
        BAND_TONE[resolved],
      )}
    >
      {BAND_META[resolved].label}
      <span className="tabular opacity-80">
        {count}/{coverage}
        {compact ? "" : ` · ${formatPct(pct)}`}
      </span>
    </span>
  );
}
