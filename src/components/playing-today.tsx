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
        "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm",
        todayOnly ? "glass-gules font-semibold text-hot-foreground" : "glass text-muted-foreground",
        className,
      )}
    >
      <CalendarDays className="size-4" />
      {todayOnly ? "Today only" : "Playing today"}
    </button>
  );
}
