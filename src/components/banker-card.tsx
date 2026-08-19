import { Crest } from "@/components/crest";
import { TimeChip } from "@/components/trend-card";
import type { BankerRulePick } from "@/lib/types";
import { cn } from "@/lib/utils";

export const PICK_LABEL: Record<string, string> = {
  win: "To win",
  "not-win": "Not to win",
  over25: "Over 2.5",
  over15: "Over 1.5",
};

export const PICK_ORDER = ["win", "not-win", "over25", "over15"] as const;

const PICK_CHIP: Record<string, string> = {
  win: "glass-or text-or",
  "not-win": "glass-azure text-primary-foreground",
  over25: "glass-high text-band-high-foreground",
  over15: "glass-lime text-primary-foreground",
};

export function pickKind(pick: BankerRulePick) {
  if (pick.kind) return pick.kind;
  if (pick.rule === "HOME_STRAIGHT_WIN") return "win";
  if (pick.rule === "AWAY_TEAM_NOT_TO_WIN") return "not-win";
  if (pick.rule === "BALANCED_HIGH_SCORING_OVER25" || pick.selection === "Over 2.5") return "over25";
  return "over15";
}

function TeamCol({
  name,
  logo,
  align,
}: {
  name: string;
  logo: string | null;
  align: "left" | "right";
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
      <Crest name={name} logo={logo} size="xs" className="shrink-0 fold:h-16 fold:w-[3.25rem]" />
      <p className="min-w-0 truncate text-sm font-semibold fold:text-base">{name}</p>
    </div>
  );
}

export function BankerCard({ pick }: { pick: BankerRulePick }) {
  const kind = pickKind(pick);
  const sameLogo = Boolean(pick.homeLogo && pick.homeLogo === pick.awayLogo);
  return (
    <article className="glass glass-lift block w-full min-w-0 overflow-hidden rounded-3xl p-3 text-left fold:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase", PICK_CHIP[kind] ?? "glass")}>
          {PICK_LABEL[kind] ?? "Banker"}
        </span>
        <TimeChip iso={pick.kickoff} />
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 fold:gap-3">
        <TeamCol name={pick.home} logo={sameLogo ? null : pick.homeLogo} align="left" />
        <div className="flex min-w-[5.5rem] flex-col items-center px-1">
          <span className="max-w-[9rem] text-center text-sm font-semibold leading-tight fold:text-base">
            {pick.label || pick.displaySelection || pick.selection}
          </span>
          <span className="mt-1 max-w-full truncate text-[11px] text-muted-foreground">{pick.league}</span>
        </div>
        <TeamCol name={pick.away} logo={sameLogo ? null : pick.awayLogo} align="right" />
      </div>
    </article>
  );
}

export const RULE_LABEL = PICK_LABEL;
export const RULE_ORDER = PICK_ORDER;
