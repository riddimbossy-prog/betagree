import { Link } from "@tanstack/react-router";
import { Crest } from "@/components/crest";
import type { DeskSource, TrendPick } from "@/lib/types";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<DeskSource, string> = {
  primatips: "PrimaTips",
  betexplorer: "BetExplorer",
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
              : s === "primatips"
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground",
          )}
        >
          {SOURCE_LABEL[s]}
        </span>
      ))}
    </span>
  );
}

export function TrendCard({ pick, highlight }: { pick: TrendPick; highlight?: boolean }) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <SourcePills sources={pick.sources} invert={highlight} />
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-semibold tabular",
            highlight ? "bg-white/20 text-white" : "bg-primary text-primary-foreground",
          )}
        >
          {pick.odds.toFixed(2)}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Crest logo={pick.homeLogo} abbr={pick.home.slice(0, 3)} size="sm" />
        <div className="min-w-0 flex-1">
          <p className={cn("truncate text-sm", highlight ? "text-white/70" : "text-muted-foreground")}>
            {pick.kickoff ? `${pick.kickoff} · ` : ""}
            {pick.league}
          </p>
          <p className="truncate font-semibold">
            {pick.home} <span className="text-subtle">vs</span> {pick.away}
          </p>
        </div>
        <Crest logo={pick.awayLogo} abbr={pick.away.slice(0, 3)} size="sm" />
      </div>
      <p className="mt-4 text-base font-semibold">{pick.label}</p>
      <p className={cn("mt-1 text-sm", highlight ? "text-white/70" : "text-muted-foreground")}>
        {pick.statLabel}
      </p>
    </>
  );

  const className = cn(
    "block rounded-3xl p-5 shadow-border transition-[box-shadow] duration-150 hover:shadow-border-hover",
    highlight ? "bg-primary text-primary-foreground" : "bg-card",
  );

  if (pick.fixtureId) {
    return (
      <Link to="/fixtures/$id" params={{ id: pick.fixtureId }} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <a href={pick.url} target="_blank" rel="noreferrer" className={className}>
      {inner}
    </a>
  );
}

export function TrendEmpty({ label }: { label: string }) {
  return (
    <p className="rounded-3xl bg-card px-4 py-8 text-center text-sm text-muted-foreground">
      No {label} today cleared 70% with odds 1.20–1.55.
    </p>
  );
}
