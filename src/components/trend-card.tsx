import { Crest } from "@/components/crest";
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
              ? "bg-white/20 text-white"
              : s === "form"
                ? "bg-purpure text-primary-foreground"
                : "bg-azure text-primary-foreground shadow-[0_0_0_1px_hsl(40_58%_62%/0.65)]",
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
        "inline-flex items-baseline gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase tabular",
        invert ? "bg-white/20 text-white" : "bg-or/15 text-or",
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
        "block w-full rounded-3xl p-5 text-left shadow-border transition-[box-shadow] duration-150 hover:shadow-border-hover",
        highlight ? "bg-primary text-primary-foreground" : "bg-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <SourcePills sources={pick.sources} invert={highlight} />
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-semibold tabular",
            highlight ? "bg-white/20 text-white" : "bg-or text-crest-foreground",
          )}
        >
          {pick.odds.toFixed(2)}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Crest name={pick.home} logo={pick.homeLogo} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <TimeChip raw={pick.kickoff} iso={pick.kickoffIso} invert={highlight} />
            <span className={cn("truncate text-sm", highlight ? "text-white/70" : "text-muted-foreground")}>
              {pick.league}
            </span>
          </div>
          <p className="mt-1 truncate font-semibold">
            {pick.home} <span className="text-subtle">vs</span> {pick.away}
          </p>
        </div>
        <Crest name={pick.away} logo={pick.awayLogo} />
      </div>
      <p className="mt-4 text-base font-semibold">{pick.label}</p>
      <p className={cn("mt-1 text-sm", highlight ? "text-white/70" : "text-muted-foreground")}>
        {pick.statLabel}
      </p>
    </button>
  );
}

export function TrendEmpty({ label }: { label: string }) {
  return (
    <p className="rounded-3xl bg-card px-4 py-8 text-center text-sm text-muted-foreground">
      No {label} today cleared 70% with odds 1.20–1.55.
    </p>
  );
}
