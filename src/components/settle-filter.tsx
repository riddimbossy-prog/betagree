import { Button } from "@/components/ui/button";
import { SETTLE_META, type SettleStatus } from "@/lib/settle";

export type SettleFilter = SettleStatus | "all" | "settled";

export const SETTLE_FILTERS: { id: SettleFilter; label: string }[] = [
  { id: "pending", label: SETTLE_META.pending.label },
  { id: "won", label: SETTLE_META.won.label },
  { id: "lost", label: SETTLE_META.lost.label },
  { id: "settled", label: "Settled" },
  { id: "all", label: "All" },
];

export function matchesSettle(status: SettleStatus, filter: SettleFilter) {
  if (filter === "all") return true;
  if (filter === "settled") return status === "won" || status === "lost";
  return status === filter;
}

export function SettleFilterBar({
  value,
  onChange,
  counts,
}: {
  value: SettleFilter;
  onChange: (next: SettleFilter) => void;
  counts: Record<SettleFilter, number>;
}) {
  return (
    <div className="chip-row" role="group" aria-label="Won, lost, or pending">
      {SETTLE_FILTERS.map((item) => (
        <Button
          key={item.id}
          type="button"
          size="sm"
          variant={value === item.id ? "default" : "outline"}
          onClick={() => onChange(item.id)}
          aria-pressed={value === item.id}
        >
          {item.label}
          <span className="tabular opacity-70">{counts[item.id] ?? 0}</span>
        </Button>
      ))}
    </div>
  );
}
