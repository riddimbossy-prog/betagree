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
    <article className="glass glass-lift block w-full min-w-0 overflow-hidden rounded-3xl p-3 text-left fold:p-5">
      <div className="flex items-center justify-between gap-2">
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
        <span className="glass-or inline-flex shrink-0 items-baseline gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide tabular text-or">
          {day ? <span className="hidden font-medium opacity-80 fold:inline">{day}</span> : null}
          <span>{clock}</span>
        </span>
      </div>

      <MatchSides
        className="mt-3"
        home={pick.home}
        away={pick.away}
        homeLogo={pick.homeLogo}
        awayLogo={pick.awayLogo}
        center={
          <>
            <PriceChip value={pick.odds} />
            <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-subtle">vs</span>
          </>
        }
      />

      <p className="mt-2 truncate text-center text-xs text-muted-foreground fold:text-sm">
        {pick.league}
        {pick.scoring?.heat === "hot" ? " · hot" : pick.scoring?.heat === "cold" ? " · tight" : ""}
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
        {home ? <PoleChip rank={home.rank} size={pick.table.size} pole={home.pole} /> : null}
        {away ? <PoleChip rank={away.rank} size={pick.table.size} pole={away.pole} /> : null}
      </div>
    </article>
  );
}
