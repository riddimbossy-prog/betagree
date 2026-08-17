import { useEffect } from "react";
import { CalendarDays } from "lucide-react";
import { readTodayOnly, useTodayFilter } from "@/lib/store";
import { cn } from "@/lib/utils";

export function PlayingTodayChip({ className }: { className?: string }) {
  const todayOnly = useTodayFilter((s) => s.todayOnly);
  const setTodayOnly = useTodayFilter((s) => s.setTodayOnly);
  const toggleToday = useTodayFilter((s) => s.toggleToday);

  useEffect(() => {
    const stored = readTodayOnly();
    if (stored !== todayOnly) setTodayOnly(stored);
    // Hydrate once from session so a full reload keeps the filter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
