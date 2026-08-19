export function PriceChip({ value }: { value: number | string | null | undefined }) {
  if (value == null || value === "") return null;
  const label = typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : String(value);
  return (
    <span className="price-chip">
      <span className="price-chip-label">Odds</span>
      <span className="price-chip-value">{label}</span>
    </span>
  );
}
