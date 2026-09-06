import { backedTeam, MatchSides } from "@/components/match-sides";
import { briefFromScan, usePickSheet } from "@/components/pick-sheet";
import { PriceChip } from "@/components/price-chip";
import { TimeChip } from "@/components/trend-card";
import type { FlashPick } from "@/lib/types";
import { cn } from "@/lib/utils";

export const FLASH_LABEL: Record<string, string> = {
  goals: "Over 2.5",
  topTwo: "Draw or over 2.5",
  win: "Favourite to win",
  twoPlus: "Favourite 2+",
};
export const FLASH_ORDER = ["topTwo", "goals", "win", "twoPlus"] as const;

export function flashKind(pick: FlashPick) {
  if (pick.rule === "FLASH_TOP2_DRAW_OVER25") return "topTwo";
  if (pick.rule === "FLASH_DRAW_OVER25") return "goals";
  if (pick.rule === "FLASH_WIN_BTTS_NO") return "win";
  return "twoPlus";
}

const tone: Record<string, string> = {
  goals: "glass-amber text-primary-foreground",
  topTwo: "glass-purpure text-primary-foreground",
  win: "glass-lime text-primary-foreground",
  twoPlus: "glass-high text-band-high-foreground",
};

export function FlashCard({ pick }: { pick: FlashPick }) {
  const sheet = usePickSheet();
  const kind = flashKind(pick);
  return (
    <button type="button" onClick={() => sheet.open(briefFromScan(pick))}
      className="glass glass-lift block w-full min-w-0 overflow-hidden rounded-2xl px-3 py-2.5 text-left fold:rounded-3xl fold:px-4 fold:py-3">
      <div className="flex min-w-0 items-center justify-between gap-2">
        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase", tone[kind])}>{FLASH_LABEL[kind]}</span>
        <div className="flex min-w-0 items-center gap-1.5"><PriceChip value={pick.price} compact /><TimeChip iso={pick.kickoff} compact /></div>
      </div>
      <MatchSides className="mt-2" home={pick.home} away={pick.away} homeLogo={pick.homeLogo} awayLogo={pick.awayLogo}
        pick={backedTeam(pick.selection, pick.home, pick.away)} />
      <p className="mt-1.5 truncate text-xs text-muted-foreground"><span className="font-semibold text-or">{pick.label}</span><span> · {pick.league}</span></p>
    </button>
  );
}
