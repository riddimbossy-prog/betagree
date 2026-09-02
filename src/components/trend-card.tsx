import { backedTeam, MatchSides } from "@/components/match-sides";
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
  compact,
}: {
  raw?: string | null;
  iso?: string | null;
  invert?: boolean;
  compact?: boolean;
}) {
  const { clock, day } = formatBoardTime(raw, iso);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-baseline gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase tabular",
        invert ? "bg-primary-foreground/15 text-primary-foreground backdrop-blur-md" : "glass-or text-or",
      )}
    >
      {day ? <span className={cn("font-medium opacity-80", compact && "hidden fold:inline")}>{day}</span> : null}
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
        "glass-lift block w-full min-w-0 overflow-hidden rounded-2xl px-3 py-2.5 text-left fold:rounded-3xl fold:px-4 fold:py-3",
        highlight ? "glass-purpure text-primary-foreground" : "glass",
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="min-w-0 truncate text-sm font-semibold">{pick.label}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          <PriceChip value={pick.odds} compact />
          <TimeChip raw={pick.kickoff} iso={pick.kickoffIso} invert={highlight} compact />
        </div>
      </div>
      <MatchSides
        className="mt-2"
        home={pick.home}
        away={pick.away}
        homeLogo={pick.homeLogo}
        awayLogo={pick.awayLogo}
        pick={backedTeam(pick.selection, pick.home, pick.away)}
      />
      <div className="mt-1.5 flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className={cn("min-w-0 truncate text-xs", highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {pick.league}
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <SourcePills sources={pick.sources} invert={highlight} />
          <span className={cn("text-xs font-semibold tabular", highlight ? "text-primary-foreground/80" : "text-muted-foreground")}>
            {Math.round(pick.rate * 100)}%
          </span>
        </div>
      </div>
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
