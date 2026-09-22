import { CalendarDays } from "lucide-react";
import { useTodayFilter } from "@/lib/today-filter";
import { cn } from "@/lib/utils";

export function PlayingTodayChip({ className }: { className?: string }) {
  const { todayOnly, toggleToday } = useTodayFilter();

  return (
    <button
      type="button"
      onClick={toggleToday}
      aria-pressed={todayOnly}
      aria-label={todayOnly ? "Show every kickoff" : "Show only games playing today"}
      data-today-only={todayOnly ? "1" : "0"}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs fold:min-h-11 fold:gap-2 fold:px-4 fold:text-sm",
        todayOnly ? "glass-gules font-semibold text-hot-foreground" : "glass text-muted-foreground",
        className,
      )}
    >
      <CalendarDays className="size-4" />
      <span>Today</span>
    </button>
  );
}
