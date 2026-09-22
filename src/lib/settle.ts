import type { Fixture } from "@/lib/types";
import { parseTotalSelection, type PresentedTip } from "@/lib/consensus";

export type SettleStatus = "won" | "lost" | "pending";

export const SETTLE_META: Record<SettleStatus, { label: string; blurb: string }> = {
  won: { label: "Won", blurb: "The board tip cashed at full time." },
  lost: { label: "Lost", blurb: "The board tip missed at full time." },
  pending: { label: "Pending", blurb: "Not settled — still to play, in play, or a void (DNB draw / total on the line)." },
};

export function isFixtureSettled(fixture: Fixture): boolean {
  if (fixture.live) return false;
  const status = String(fixture.status || "").toLowerCase();
  if (status === "pre" || status === "in") return false;
  if (fixture.home.score == null || fixture.away.score == null) return false;
  return status === "post" || status === "final" || /ft|aet|pen|full/i.test(fixture.detail || "");
}

export function settleBoardTip(
  tip: Pick<PresentedTip, "boardMarket" | "boardSelection">,
  fixture: Fixture,
): SettleStatus {
  if (!isFixtureSettled(fixture)) return "pending";
  const hs = fixture.home.score;
  const as = fixture.away.score;
  if (hs == null || as == null) return "pending";

  const market = tip.boardMarket;
  const sel = String(tip.boardSelection);

  if (market === "1x2") {
    const out = hs > as ? "home" : as > hs ? "away" : "draw";
    return sel === out ? "won" : "lost";
  }

  if (market === "dnb") {
    if (hs === as) return "pending";
    const out = hs > as ? "home" : "away";
    return sel === out ? "won" : "lost";
  }

  if (market === "dc") {
    if (sel === "1X") return hs >= as ? "won" : "lost";
    if (sel === "X2") return as >= hs ? "won" : "lost";
    if (sel === "12") return hs !== as ? "won" : "lost";
    return "pending";
  }

  if (market === "total") {
    const { side, line } = parseTotalSelection(sel, fixture.total ?? 2.5);
    const goals = hs + as;
    if (goals === line) return "pending";
    const over = goals > line;
    return (side === "over" ? over : !over) ? "won" : "lost";
  }

  if (market === "btts") {
    const yes = hs > 0 && as > 0;
    return (sel === "yes" ? yes : !yes) ? "won" : "lost";
  }

  return "pending";
}

export function settleRank(status: SettleStatus) {
  if (status === "pending") return 0;
  if (status === "won") return 1;
  return 2;
}
