export function parseAmerican(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace("+", "").trim());
  return Number.isFinite(n) && n !== 0 ? n : null;
}

export function americanToImplied(odds: number): number {
  if (!Number.isFinite(odds) || odds === 0) return 0.33;
  if (odds < 0) return -odds / (-odds + 100);
  return 100 / (odds + 100);
}

export function americanProfit(odds: number, stake = 1): number {
  if (!Number.isFinite(odds) || odds === 0) return 0;
  return odds > 0 ? stake * (odds / 100) : stake * (100 / Math.abs(odds));
}

export function formatAmerican(odds: number | null | undefined): string {
  if (odds == null || !Number.isFinite(odds)) return "—";
  const rounded = Math.round(odds);
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

export function formatPct(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(digits)}%`;
}

export function formatUnits(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  const v = n.toFixed(digits);
  return n > 0 ? `+${v}u` : `${v}u`;
}
