import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Crest } from "@/components/crest";
import { PriceChip } from "@/components/price-chip";
import { formatBoardTime } from "@/lib/format";
import { formatDecimal, formatPct } from "@/lib/odds";
import type { DeskSource, FormRow, TrendNote, TrendPick } from "@/lib/types";
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
  sources?: DeskSource[];
  sourceNotes?: TrendNote[];
  why: string;
};

const SOURCE_TONE: Record<DeskSource, string> = {
  form: "glass-purpure text-primary-foreground",
  odds: "glass-azure text-primary-foreground",
};

const SOURCE_LABEL: Record<DeskSource, string> = {
  form: "Form",
  odds: "Odds",
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
  const desks = pick.sources.map((s) => SOURCE_LABEL[s]).join(" and ");
  const notes = pick.sourceNotes
    .map((n) => `${SOURCE_LABEL[n.source]} has ${formatPct(n.rate)} over ${n.sample} games`)
    .join(". ");
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
    sources: pick.sources,
    sourceNotes: pick.sourceNotes,
    why: `${pick.label} because ${notes || `${formatPct(pick.rate)} over ${pick.sample} games`}. The price sits in the 1.20–1.55 band${desks ? ` on ${desks}` : ""}.`,
  };
}

export function briefFromForm(row: FormRow, unit: string): PickBrief {
  const today = row.playingToday
    ? row.opponent
      ? ` They play ${row.opponent} today.`
      : " They play today."
    : "";
  return {
    id: `form:${row.team}:${row.league}`,
    home: row.team,
    away: row.opponent,
    homeLogo: row.logo,
    league: row.league,
    label: `${row.team} · ${row.display} ${unit.toLowerCase()}`,
    stat: `${row.count}/${row.matches} ${unit.toLowerCase()}`,
    sources: ["form"],
    why: `${row.team} sit on ${row.display} ${unit.toLowerCase()} across ${row.matches} league games (${row.count} hits). Cups and Europe are out.${today}`,
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
          <Dialog.Content className="glass-strong fixed inset-x-3 bottom-3 z-50 max-h-[88dvh] overflow-y-auto rounded-[28px] text-card-foreground outline-none fold:inset-auto fold:top-1/2 fold:left-1/2 fold:w-[min(32rem,92vw)] fold:-translate-x-1/2 fold:-translate-y-1/2 fold:bottom-auto">
            {brief ? (
              <>
                <div className="glass-purpure relative px-5 pt-5 pb-6 text-primary-foreground">
                  <Dialog.Close className="glass absolute top-3 right-3 grid size-10 place-items-center rounded-full text-primary-foreground">
                    <X className="size-5" />
                    <span className="sr-only">Close</span>
                  </Dialog.Close>
                  <p className="text-xs tracking-[0.18em] text-or uppercase">Pick sheet</p>
                  <Dialog.Title className="mt-2 pr-12 text-2xl font-semibold tracking-tight">
                    {brief.label}
                  </Dialog.Title>
                  {brief.league ? <p className="mt-1 text-sm text-primary-foreground/70">{brief.league}</p> : null}
                </div>

                <div className="space-y-4 px-5 pt-5 pb-6">
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                      <Crest name={brief.home} logo={brief.homeLogo} size="lg" />
                      <span className="max-w-32 truncate text-center text-sm font-semibold">{brief.home}</span>
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
                        <Crest name={brief.away} logo={brief.awayLogo} size="lg" />
                        <span className="max-w-32 truncate text-center text-sm font-semibold">{brief.away}</span>
                      </div>
                    ) : (
                      <div className="flex-1" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(brief.sources ?? []).map((s) => (
                      <span
                        key={s}
                        className={cn(
                          "rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide uppercase",
                          SOURCE_TONE[s],
                        )}
                      >
                        {SOURCE_LABEL[s]}
                      </span>
                    ))}
                    {price ? <PriceChip value={price} /> : null}
                    {brief.league ? <span className="text-sm text-muted-foreground">{brief.league}</span> : null}
                  </div>

                  <Dialog.Description className="text-sm leading-relaxed text-muted-foreground">
                    {brief.why}
                  </Dialog.Description>

                  {brief.sourceNotes?.length ? (
                    <ul className="grid gap-2">
                      {brief.sourceNotes.map((n) => (
                        <li
                          key={n.source}
                          className={cn(
                            "flex items-center justify-between rounded-2xl px-4 py-3",
                            n.source === "odds" ? "glass-azure" : "glass-purpure",
                          )}
                        >
                          <span
                            className={cn(
                              "text-sm font-semibold",
                              n.source === "odds" ? "text-or" : "text-primary-foreground",
                            )}
                          >
                            {SOURCE_LABEL[n.source]}
                          </span>
                          <span className="text-sm tabular">
                            {formatPct(n.rate)} · {n.sample} games
                            {priceLabel(n.odds) ? ` · ${priceLabel(n.odds)}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : brief.stat ? (
                    <p className="rounded-2xl bg-secondary px-4 py-3 text-sm">{brief.stat}</p>
                  ) : null}
                </div>
              </>
            ) : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </PickCtx.Provider>
  );
}
