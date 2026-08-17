import { Crest } from "@/components/crest";
import { PriceChip } from "@/components/price-chip";
import { formatBoardTime } from "@/lib/format";
import type { StreakPick, StreakPole } from "@/lib/types";
import { cn } from "@/lib/utils";

function PoleChip({ rank, size, pole }: { rank: number; size: number; pole: StreakPole | null }) {
  if (!pole) {
    return (
      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular text-muted-foreground glass">
        {rank}/{size}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide tabular",
        pole === "top" ? "glass-or text-or" : "glass-azure text-primary-foreground",
      )}
    >
      {pole === "top" ? "Top" : "Bottom"} {rank}/{size}
    </span>
  );
}

export function StreakCard({ pick }: { pick: StreakPick }) {
  const home = pick.table.home;
  const away = pick.table.away;
  const sameLogo = Boolean(pick.homeLogo && pick.homeLogo === pick.awayLogo);
  const { clock, day } = formatBoardTime(null, pick.kickoff);
  return (
    <article className="glass glass-lift block w-full rounded-3xl p-5 text-left">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
            pick.market === "2+"
              ? "glass-purpure text-primary-foreground"
              : pick.pick === "Over"
                ? "glass-high text-band-high-foreground"
                : "glass-or text-or",
          )}
        >
          {pick.label}
        </span>
        <span className="glass-or inline-flex items-baseline gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide tabular text-or">
          {day ? <span className="font-medium opacity-80">{day}</span> : null}
          <span>{clock}</span>
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Crest name={pick.home} logo={sameLogo ? null : pick.homeLogo} />
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-subtle">Kickoff</p>
          <p className="font-serif text-3xl italic tabular leading-none text-or">{clock}</p>
          {day ? <p className="text-xs font-semibold tabular text-muted-foreground">{day}</p> : null}
          <div className="mt-2">
            <PriceChip value={pick.odds} />
          </div>
          <span className="mt-1 max-w-full truncate text-center text-xs text-muted-foreground">{pick.league}</span>
        </div>
        <Crest name={pick.away} logo={sameLogo ? null : pick.awayLogo} />
      </div>

      <p className="mt-3 truncate text-center text-sm font-semibold">
        {pick.home} <span className="text-subtle">vs</span> {pick.away}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {home ? <PoleChip rank={home.rank} size={pick.table.size} pole={home.pole} /> : null}
        {away ? <PoleChip rank={away.rank} size={pick.table.size} pole={away.pole} /> : null}
      </div>

      <p className="mt-3 text-center text-sm text-muted-foreground">
        Favorite {pick.favorite}{" "}
        <span className="tabular font-semibold text-foreground">{pick.favoriteOdds.toFixed(2)}</span>
        {typeof pick.oppPpg === "number" ? (
          <>
            {" "}
            · opp <span className="tabular font-semibold text-foreground">{pick.oppPpg.toFixed(2)}</span> PPG
          </>
        ) : null}
        {pick.pick === "Over" && pick.streakYes != null && pick.streakNo != null ? (
          <>
            {" "}
            · 3+ {pick.streakYes.toFixed(2)}/{pick.streakNo.toFixed(2)}
          </>
        ) : null}
      </p>
    </article>
  );
}
