import { BAND_META, bandOf, type ConsensusBand } from "@/lib/consensus";
import { formatPct } from "@/lib/odds";
import { cn } from "@/lib/utils";

const TONE: Record<ConsensusBand, string> = {
  high: "glass-or text-or",
  medium: "glass-azure text-primary-foreground",
  low: "bg-secondary text-muted-foreground",
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
        TONE[resolved],
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
