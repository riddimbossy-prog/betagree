import type { PickResult, RecordSlice } from "@/lib/types";
import { formatPct, formatUnits } from "@/lib/odds";
import { cn } from "@/lib/utils";

export function formatRecord(rec: RecordSlice) {
  return `${rec.won}–${rec.lost}${rec.push ? `–${rec.push}` : ""}`;
}

export function RecordLine({ rec, className }: { rec: RecordSlice; className?: string }) {
  if (!rec.n) return <span className={cn("text-subtle", className)}>—</span>;
  return (
    <span className={cn("font-mono tabular", className)}>
      {formatRecord(rec)}{" "}
      <span className="text-subtle">{formatPct(rec.hit)}</span>
    </span>
  );
}

export function Units({ n }: { n: number }) {
  return (
    <span className={cn("font-mono tabular", n > 0 ? "text-win" : n < 0 ? "text-loss" : "text-subtle")}>
      {formatUnits(n)}
    </span>
  );
}

export function FormDots({ form }: { form: PickResult[] }) {
  return (
    <span className="inline-flex gap-0.5" aria-label="Recent 1X2 results">
      {form.map((r, i) => (
        <span
          key={i}
          className={cn(
            "size-1.5 rounded-full",
            r === "won" ? "bg-win" : r === "lost" ? "bg-loss" : "bg-push",
          )}
        />
      ))}
    </span>
  );
}
