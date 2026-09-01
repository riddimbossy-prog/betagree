import { MatchSides } from "@/components/match-sides";
import { briefFromScan, usePickSheet } from "@/components/pick-sheet";
import { TimeChip } from "@/components/trend-card";
import { PriceChip } from "@/components/price-chip";
import type { SportyScanPick } from "@/lib/types";
import { cn } from "@/lib/utils";

export const SCAN_LABEL: Record<string, string> = {
  win: "To win",
  under25: "Under 2.5",
  gg: "GG",
  twoPlus: "2+ goals",
  dnb: "Draw no bet",
};

export const SCAN_ORDER = ["win", "twoPlus", "dnb", "gg", "under25"] as const;

const SCAN_CHIP: Record<string, string> = {
  win: "glass-or text-or",
  under25: "glass-azure text-primary-foreground",
  gg: "glass-purpure text-primary-foreground",
  twoPlus: "glass-high text-band-high-foreground",
  dnb: "glass-lime text-primary-foreground",
};

export function scanKind(pick: SportyScanPick) {
  if (pick.rule === "FAV_WIN") return "win";
  if (pick.rule === "WEAK_UNDER25") return "under25";
  if (pick.rule === "GG_TEAM_O05") return "gg";
  if (pick.rule === "HOME_2PLUS") return "twoPlus";
  if (pick.rule === "AWAY_DNB") return "dnb";
  return "win";
}

export function ScanCard({ pick }: { pick: SportyScanPick }) {
  const sheet = usePickSheet();
  const kind = scanKind(pick);
  return (
    <button
      type="button"
      onClick={() => sheet.open(briefFromScan(pick))}
      className="glass glass-lift block w-full min-w-0 overflow-hidden rounded-3xl p-3 text-left fold:p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase", SCAN_CHIP[kind] ?? "glass")}>
          {SCAN_LABEL[kind] ?? pick.label}
        </span>
        <TimeChip iso={pick.kickoff} compact />
      </div>

      <MatchSides
        className="mt-3"
        home={pick.home}
        away={pick.away}
        homeLogo={pick.homeLogo}
        awayLogo={pick.awayLogo}
        center={
          <>
            <span className="text-center text-sm font-semibold leading-tight fold:text-base">{pick.label}</span>
            <PriceChip value={pick.price} />
            <span className="mt-1 w-full text-center text-[11px] leading-tight text-muted-foreground break-words">{pick.league}</span>
          </>
        }
      />
    </button>
  );
}
