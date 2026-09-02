import { cn } from "@/lib/utils";

export function PriceChip({
  value,
  compact,
}: {
  value: number | string | null | undefined;
  compact?: boolean;
}) {
  if (value == null || value === "") return null;
  const label = typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : String(value);
  if (compact) {
    return <span className="odds-chip shrink-0">{label}</span>;
  }
  return (
    <span className={cn("price-chip")}>
      <span className="price-chip-label">Odds</span>
      <span className="price-chip-value">{label}</span>
    </span>
  );
}
