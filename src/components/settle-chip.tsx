import { Badge } from "@/components/ui/badge";
import { SETTLE_META, type SettleStatus } from "@/lib/settle";
import { cn } from "@/lib/utils";

const TONE: Record<SettleStatus, "win" | "loss" | "default"> = {
  won: "win",
  lost: "loss",
  pending: "default",
};

export function SettleChip({
  status,
  compact,
  className,
}: {
  status: SettleStatus;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Badge
      variant={TONE[status]}
      className={cn("uppercase tracking-wide", compact && "px-2 py-0 text-[10px]", className)}
    >
      {SETTLE_META[status].label}
    </Badge>
  );
}
