import { Crest } from "@/components/crest";
import { briefFromForm, usePickSheet } from "@/components/pick-sheet";
import { formBarWidth } from "@/lib/form-meta";
import type { FormRow as FormRowData } from "@/lib/types";
import { cn } from "@/lib/utils";

export function FormRowCard({
  row,
  unit,
  highlight,
}: {
  row: FormRowData;
  unit: string;
  highlight?: boolean;
}) {
  const sheet = usePickSheet();
  return (
    <button
      type="button"
      onClick={() => sheet.open(briefFromForm(row, unit))}
      className={cn(
        "flex w-full items-center gap-3 rounded-3xl p-4 text-left shadow-border transition-[box-shadow] duration-150 hover:shadow-border-hover",
        highlight ? "bg-primary text-primary-foreground" : "bg-card",
      )}
    >
      <span className="w-8 shrink-0 text-lg font-semibold tabular text-subtle">{row.rank}</span>
      <Crest name={row.team} logo={row.logo} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{row.team}</p>
        <p className={cn("truncate text-sm", highlight ? "text-white/70" : "text-muted-foreground")}>
          {row.league || "League"}
          {row.playingToday && row.opponent ? ` · vs ${row.opponent}` : ""}
        </p>
        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/10">
          <span className="block h-full rounded-full bg-or" style={{ width: `${formBarWidth(row)}%` }} />
        </span>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-lg font-semibold tabular">{row.display || "—"}</p>
        <p className={cn("text-xs tabular", highlight ? "text-white/70" : "text-muted-foreground")}>
          {row.count}/{row.matches} {unit.toLowerCase()}
        </p>
        {row.playingToday ? (
          <span
            className={cn(
              "mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
              highlight ? "bg-white/20 text-white" : "bg-hot text-hot-foreground",
            )}
          >
            Today
          </span>
        ) : null}
      </div>
    </button>
  );
}
