import { Crest } from "@/components/crest";
import { PriceChip } from "@/components/price-chip";
import { briefFromTrend, usePickSheet } from "@/components/pick-sheet";
import { formatBoardTime } from "@/lib/format";
import type { DeskSource, TrendPick } from "@/lib/types";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<DeskSource, string> = {
  form: "Form",
  odds: "Odds",
};

export function SourcePills({ sources, invert }: { sources: DeskSource[]; invert?: boolean }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {sources.map((s) => (
        <span
          key={s}
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
            invert
              ? "bg-primary-foreground/15 text-primary-foreground backdrop-blur-md"
              : s === "form"
                ? "glass-purpure text-primary-foreground"
                : "glass-azure text-primary-foreground",
          )}
        >
          {SOURCE_LABEL[s]}
        </span>
      ))}
    </span>
  );
}

export function TimeChip({
  raw,
  iso,
  invert,
}: {
  raw?: string | null;
  iso?: string | null;
  invert?: boolean;
}) {
  const { clock, day } = formatBoardTime(raw, iso);
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase tabular",
        invert ? "bg-primary-foreground/15 text-primary-foreground backdrop-blur-md" : "glass-or text-or",
      )}
    >
      {day ? <span className="font-medium opacity-80">{day}</span> : null}
      <span>{clock}</span>
    </span>
  );
}

export function TrendCard({ pick, highlight }: { pick: TrendPick; highlight?: boolean }) {
  const sheet = usePickSheet();
  return (
    <button
      type="button"
      onClick={() => sheet.open(briefFromTrend(pick))}
      className={cn(
        "glass-lift block w-full min-w-0 overflow-hidden rounded-3xl p-3 text-left fold:p-5",
        highlight ? "glass-purpure text-primary-foreground" : "glass",
      )}
    >
      <div className="mt-1 flex items-center gap-3">
        <Crest name={pick.home} logo={pick.homeLogo && pick.homeLogo === pick.awayLogo ? null : pick.homeLogo} size="xs" className="shrink-0 fold:h-16 fold:w-[3.25rem]" />
        <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <PriceChip value={pick.odds} />
          <TimeChip raw={pick.kickoff} iso={pick.kickoffIso} invert={highlight} />
          <span className={cn("max-w-full truncate text-center text-sm", highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {pick.league}
          </span>
        </div>
        <Crest name={pick.away} logo={pick.awayLogo && pick.awayLogo === pick.homeLogo ? null : pick.awayLogo} size="xs" className="shrink-0 fold:h-16 fold:w-[3.25rem]" />
      </div>
      <p className="mt-3 truncate text-center text-base font-semibold">
        {pick.home} <span className="text-subtle">vs</span> {pick.away}
      </p>
      <p className="mt-3 text-center text-lg font-semibold">{pick.label}</p>
    </button>
  );
}

export function TrendEmpty({ label }: { label: string }) {
  return (
    <p className="glass rounded-3xl px-4 py-8 text-center text-sm text-muted-foreground">
      No {label} today.
    </p>
  );
}
