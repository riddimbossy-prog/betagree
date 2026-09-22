import { MatchSides } from "@/components/match-sides";
import { PriceChip } from "@/components/price-chip";
import { formatBoardTime } from "@/lib/format";
import type { StreakPick, StreakPole } from "@/lib/types";
import { cn } from "@/lib/utils";

function PoleChip({ rank, size, pole }: { rank: number; size: number; pole: StreakPole | null }) {
  if (!pole) {
    return (
      <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold tabular text-muted-foreground glass">
        {rank}/{size}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide tabular",
        pole === "top" ? "glass-or text-or" : "glass-cyan text-background",
      )}
    >
      {pole === "top" ? "Top" : "Bottom"} {rank}/{size}
    </span>
  );
}

function shortLabel(pick: StreakPick) {
  if (pick.market === "2+") return "2+ Yes";
  if (pick.pick === "Over") return "Over 2.5";
  if (pick.pick === "Under") return "Under 2.5";
  return pick.label;
}

export function StreakCard({ pick }: { pick: StreakPick }) {
  const home = pick.table.home;
  const away = pick.table.away;
  const { clock, day } = formatBoardTime(null, pick.kickoff);
  return (
    <article className="glass glass-lift block w-full min-w-0 overflow-hidden rounded-2xl px-3 py-2.5 text-left fold:rounded-3xl fold:px-4 fold:py-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
            pick.market === "2+"
              ? "glass-purpure text-primary-foreground"
              : pick.pick === "Over"
                ? "glass-high text-band-high-foreground"
                : "glass-or text-or",
          )}
        >
          {shortLabel(pick)}
        </span>
        <div className="flex min-w-0 items-center gap-1.5">
          <PriceChip value={pick.odds} compact />
          <span className="glass-or inline-flex shrink-0 items-baseline gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide tabular text-or">
            {day ? <span className="hidden font-medium opacity-80 fold:inline">{day}</span> : null}
            <span>{clock}</span>
          </span>
        </div>
      </div>

      <MatchSides
        className="mt-2"
        home={pick.home}
        away={pick.away}
        homeLogo={pick.homeLogo}
        awayLogo={pick.awayLogo}
      />

      <div className="mt-1.5 flex min-w-0 items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs text-muted-foreground">
          {pick.league}
          {pick.scoring?.heat === "hot" ? " · hot" : pick.scoring?.heat === "cold" ? " · tight" : ""}
        </p>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
          {home ? <PoleChip rank={home.rank} size={pick.table.size} pole={home.pole} /> : null}
          {away ? <PoleChip rank={away.rank} size={pick.table.size} pole={away.pole} /> : null}
        </div>
      </div>
    </article>
  );
}
