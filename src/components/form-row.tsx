import { Crest } from "@/components/crest";
import { usePickSheet } from "@/components/pick-sheet";
import type { FormRow } from "@/lib/types";
import { cn } from "@/lib/utils";

function briefFromForm(row: FormRow, unit: string) {
  return {
    id: row.fixtureId ?? row.team,
    home: row.team,
    away: row.opponent ?? "—",
    homeLogo: row.logo,
    awayLogo: null as string | null,
    league: row.league,
    kickoffIso: null as string | null,
    label: `${row.team} · ${row.display} ${unit}`,
    odds: null as number | null,
    sources: ["form"] as ("form" | "odds")[],
    why: `${row.team} ranks #${row.rank} for ${unit.toLowerCase()} in ${row.league} (${row.display}).`,
  };
}

export function FormRowCard({
  row,
  unit,
  highlight,
}: {
  row: FormRow;
  unit: string;
  highlight?: boolean;
}) {
  const sheet = usePickSheet();
  return (
    <button
      type="button"
      onClick={() => sheet.open(briefFromForm(row, unit))}
      className={cn(
        "glass-lift flex w-full min-w-0 items-center gap-2 overflow-hidden rounded-3xl p-3 text-left fold:gap-3 fold:p-4",
        highlight ? "glass-purpure text-primary-foreground" : "glass",
      )}
    >
      <span className="w-6 shrink-0 text-base font-semibold tabular text-subtle fold:w-8 fold:text-lg">{row.rank}</span>
      <Crest name={row.team} logo={row.logo} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold fold:text-base">{row.team}</span>
        <span className={cn("block truncate text-xs", highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {row.league}
          {row.opponent ? ` · vs ${row.opponent}` : ""}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-serif text-2xl italic tabular leading-none text-or">{row.display}</span>
        <span className={cn("block text-[10px] font-semibold uppercase tracking-wide", highlight ? "text-primary-foreground/70" : "text-subtle")}>
          {unit}
        </span>
      </span>
    </button>
  );
}
