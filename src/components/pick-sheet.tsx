import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Crest } from "@/components/crest";
import { Last5Strip } from "@/components/last5-strip";
import { PriceChip } from "@/components/price-chip";
import { formatBoardTime } from "@/lib/format";
import { formatDecimal } from "@/lib/odds";
import type { DeskSource, FormRow, SportyScanPick, TrendPick } from "@/lib/types";
import { cn } from "@/lib/utils";

export type PickBrief = {
  id: string;
  home: string;
  away?: string | null;
  homeLogo?: string | null;
  awayLogo?: string | null;
  league?: string | null;
  kickoff?: string | null;
  kickoffIso?: string | null;
  label: string;
  stat?: string | null;
  odds?: number | null;
  last5?: TrendPick["last5"];
  why?: string;
  sources?: DeskSource[];
};

function priceLabel(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return null;
  if (n >= 1.01 && n <= 30) return n.toFixed(2);
  return formatDecimal(n);
}

type Ctx = {
  open: (brief: PickBrief) => void;
};

const PickCtx = createContext<Ctx | null>(null);

export function usePickSheet() {
  const ctx = useContext(PickCtx);
  if (!ctx) throw new Error("PickProvider missing");
  return ctx;
}

export function briefFromTrend(pick: TrendPick): PickBrief {
  return {
    id: pick.id,
    home: pick.home,
    away: pick.away,
    homeLogo: pick.homeLogo,
    awayLogo: pick.awayLogo,
    league: pick.league,
    kickoff: pick.kickoff,
    kickoffIso: pick.kickoffIso,
    label: pick.label,
    stat: pick.statLabel,
    odds: pick.odds,
    last5: pick.last5 ?? null,
    why: "",
  };
}

export function briefFromForm(row: FormRow, unit: string): PickBrief {
  return {
    id: `form:${row.team}:${row.league}`,
    home: row.team,
    away: row.opponent,
    homeLogo: row.logo,
    league: row.league,
    label: `${row.team} · ${row.display} ${unit.toLowerCase()}`,
    stat: `${row.count}/${row.matches}`,
    why: "",
  };
}

export function briefFromScan(pick: SportyScanPick): PickBrief {
  return {
    id: `scan:${pick.fixtureId}:${pick.rule}`,
    home: pick.home,
    away: pick.away,
    homeLogo: pick.homeLogo,
    awayLogo: pick.awayLogo,
    league: pick.league,
    kickoffIso: pick.kickoff,
    label: pick.label,
    odds: pick.price,
    why: (pick.reasons ?? []).join(" · "),
  };
}

export function PickProvider({ children }: { children: ReactNode }) {
  const [brief, setBrief] = useState<PickBrief | null>(null);
  const api = useMemo(() => ({ open: setBrief }), []);
  const time = brief ? formatBoardTime(brief.kickoff, brief.kickoffIso) : null;
  const price = brief ? priceLabel(brief.odds) : null;

  return (
    <PickCtx.Provider value={api}>
      {children}
      <Dialog.Root open={Boolean(brief)} onOpenChange={(next) => !next && setBrief(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-[hsl(240_16%_4%/0.45)] backdrop-blur-md" />
          <Dialog.Content className="glass-strong fixed inset-x-2 z-50 max-h-[min(86dvh,42rem)] overflow-y-auto rounded-[28px] text-card-foreground outline-none bottom-[max(4.5rem,env(safe-area-inset-bottom))] fold:inset-auto fold:top-1/2 fold:left-1/2 fold:w-[min(32rem,92vw)] fold:-translate-x-1/2 fold:-translate-y-1/2 fold:bottom-auto lg:max-h-[min(88dvh,44rem)]">
            {brief ? (
              <>
                <div className="glass-purpure relative px-5 pt-5 pb-6 text-primary-foreground">
                  <Dialog.Close className="glass absolute top-3 right-3 grid size-10 place-items-center rounded-full text-primary-foreground">
                    <X className="size-5" />
                    <span className="sr-only">Close</span>
                  </Dialog.Close>
                  <p className="text-sm tracking-[0.18em] text-or uppercase">Pick</p>
                  <Dialog.Title className="mt-2 pr-12 text-3xl font-semibold tracking-tight">
                    {brief.label}
                  </Dialog.Title>
                  {brief.league ? <p className="mt-1 text-sm text-primary-foreground/70">{brief.league}</p> : null}
                </div>

                <div className="space-y-4 px-5 pt-5 pb-6">
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <Crest name={brief.home} logo={brief.homeLogo} size="sm" className="fold:h-24 fold:w-[4.75rem]" />
                      <span className="max-w-32 text-center text-sm font-semibold leading-tight break-words">{brief.home}</span>
                    </div>
                    <div className="pb-8 text-center">
                      <p className="font-serif text-3xl italic text-or">{brief.away ? "vs" : "form"}</p>
                      {time ? (
                        <div className="glass-or mt-2 inline-flex flex-col items-center rounded-full px-3 py-1 text-or">
                          {time.day ? (
                            <span className="text-[10px] tracking-wide uppercase">{time.day}</span>
                          ) : null}
                          <span className="text-lg font-semibold tabular">{time.clock}</span>
                        </div>
                      ) : null}
                    </div>
                    {brief.away ? (
                      <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                        <Crest name={brief.away} logo={brief.awayLogo} size="sm" className="fold:h-24 fold:w-[4.75rem]" />
                        <span className="max-w-32 text-center text-sm font-semibold leading-tight break-words">{brief.away}</span>
                      </div>
                    ) : (
                      <div className="flex-1" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {price ? <PriceChip value={price} /> : null}
                    {brief.league ? <span className="text-base text-muted-foreground">{brief.league}</span> : null}
                  </div>

                  <Dialog.Description className="sr-only">{brief.label}</Dialog.Description>

                  {brief.last5 ? <Last5Strip last5={brief.last5} home={brief.home} away={brief.away ?? ""} /> : null}
                </div>
              </>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </PickCtx.Provider>
  );
}
