import { backedTeam, MatchSides } from "@/components/match-sides";
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

function shortPick(pick: BankerRulePick, kind: string) {
  if (kind === "win") return "Home";
  if (kind === "not-win") return pick.selection || "Home or Draw";
  if (kind === "over25") return "Over 2.5";
  if (kind === "over15") return "Over 1.5";
  return pick.selection || "Banker";
}

export function BankerCard({ pick }: { pick: BankerRulePick }) {
  const kind = pickKind(pick);
  return (
    <article className="glass glass-lift block w-full min-w-0 overflow-hidden rounded-2xl px-3 py-2.5 text-left fold:rounded-3xl fold:px-4 fold:py-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase", PICK_CHIP[kind] ?? "glass")}>
          {PICK_LABEL[kind] ?? "Banker"}
        </span>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="hidden min-w-0 truncate text-xs font-semibold text-or fold:inline">{shortPick(pick, kind)}</span>
          <TimeChip iso={pick.kickoff} compact />
        </div>
      </div>

      <MatchSides
        className="mt-2"
        home={pick.home}
        away={pick.away}
        homeLogo={pick.homeLogo}
        awayLogo={pick.awayLogo}
        pick={backedTeam(pick.selection, pick.home, pick.away) ?? (kind === "win" ? pick.home : undefined)}
      />

      <p className="mt-1.5 truncate text-xs text-muted-foreground">
        <span className="font-semibold text-or fold:hidden">{shortPick(pick, kind)} · </span>
        {pick.league}
      </p>
    </article>
  );
}

export const RULE_LABEL = PICK_LABEL;
export const RULE_ORDER = PICK_ORDER;
