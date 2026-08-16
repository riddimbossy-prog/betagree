export function PriceChip({ value }: { value: number | string }) {
  const label = typeof value === "number" && Number.isFinite(value) ? value.toFixed(2) : String(value);
  return (
    <span className="price-chip">
      <span className="price-chip-label">Odds</span>
      <span className="price-chip-value">{label}</span>
    </span>
  );
}
