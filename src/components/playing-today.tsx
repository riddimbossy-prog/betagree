import { CalendarDays } from "lucide-react";
import { useTodayFilter } from "@/lib/store";
import { cn } from "@/lib/utils";

export function PlayingTodayChip({ className }: { className?: string }) {
  const todayOnly = useTodayFilter((s) => s.todayOnly);
  const toggleToday = useTodayFilter((s) => s.toggleToday);

  return (
    <button
      type="button"
      onClick={toggleToday}
      aria-pressed={todayOnly}
      aria-label="Show only sides playing today"
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm",
        todayOnly ? "glass-gules font-semibold text-hot-foreground" : "glass text-muted-foreground",
        className,
      )}
    >
      <CalendarDays className="size-4" />
      Playing today
    </button>
  );
}
