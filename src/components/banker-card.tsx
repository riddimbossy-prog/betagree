import { Crest } from "@/components/crest";
import { TimeChip } from "@/components/trend-card";
import type { BankerMetrics, BankerRulePick } from "@/lib/types";
import { cn } from "@/lib/utils";

export const RULE_LABEL: Record<string, string> = {
  HOME_STRAIGHT_WIN: "Straight Win",
  AWAY_TEAM_NOT_TO_WIN: "Not to Win",
  AWAY_STRENGTH_OVER15: "Away · O1.5",
  BALANCED_HIGH_SCORING_OVER25: "Balanced · O2.5",
  BALANCED_LOW_SCORING_OVER15: "Balanced · O1.5",
};

export const RULE_ORDER = [
  "HOME_STRAIGHT_WIN",
  "AWAY_TEAM_NOT_TO_WIN",
  "BALANCED_HIGH_SCORING_OVER25",
  "BALANCED_LOW_SCORING_OVER15",
  "AWAY_STRENGTH_OVER15",
] as const;

const RULE_CHIP: Record<string, string> = {
  HOME_STRAIGHT_WIN: "glass-or text-or",
  AWAY_TEAM_NOT_TO_WIN: "glass-azure text-primary-foreground",
  AWAY_STRENGTH_OVER15: "glass-lime text-primary-foreground",
  BALANCED_HIGH_SCORING_OVER25: "glass-high text-band-high-foreground",
  BALANCED_LOW_SCORING_OVER15: "glass-lime text-primary-foreground",
};

function leagueClass(x?: string) {
  if (x === "high-scoring") return "High scoring";
  if (x === "low-scoring-draw-heavy") return "Low + draws";
  if (x === "neutral") return "Neutral";
  return null;
}

function pos(split?: { position?: number; size?: number } | null) {
  return Number.isFinite(Number(split?.position)) ? `#${split?.position}` : "—";
}

function num(v: number | null | undefined, digits = 2) {
  return v == null || Number.isNaN(Number(v)) ? "—" : Number(v).toFixed(digits);
}

function TeamCol({
  name,
  logo,
  split,
  align,
}: {
  name: string;
  logo: string | null;
  split?: { position?: number; size?: number } | null;
  align: "left" | "right";
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
      <Crest name={name} logo={logo} size="xs" className="shrink-0 fold:h-16 fold:w-[3.25rem]" />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold fold:text-base">{name}</p>
        <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase tabular">{pos(split)}</p>
      </div>
    </div>
  );
}

function Stat({
  label,
  home,
  away,
  homeOk,
  awayOk,
}: {
  label: string;
  home: string;
  away: string;
  homeOk?: boolean;
  awayOk?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-2 text-sm">
      <span className={cn("tabular font-semibold", homeOk ? "text-foreground" : "text-muted-foreground")}>{home}</span>
      <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
      <span className={cn("text-right tabular font-semibold", awayOk ? "text-foreground" : "text-muted-foreground")}>{away}</span>
    </div>
  );
}

function factorOk(rule: string, side: "home" | "away", key: "ppg" | "gf" | "ga" | "loss", m?: BankerMetrics) {
  if (!m) return false;
  if (rule === "HOME_STRAIGHT_WIN") {
    if (side === "home" && key === "ppg") return Number(m.ppg) >= 2.5;
    if (side === "home" && key === "gf") return Number(m.avgGF) >= 2.5;
    if (side === "home" && key === "ga") return Number(m.avgGA) < 1.2;
    if (side === "away" && key === "ppg") return Number(m.ppg) < 1;
    if (side === "away" && key === "ga") return Number(m.avgGA) >= 2;
    if (side === "away" && key === "loss") return Number(m.lossRate) >= 60;
  }
  if (rule === "AWAY_TEAM_NOT_TO_WIN") {
    if (side === "home" && key === "ppg") return Number(m.ppg) >= 1.5;
    if (side === "away" && key === "ppg") return Number(m.ppg) < 1;
    if (side === "away" && key === "ga") return Number(m.avgGA) >= 2.5;
    if (side === "away" && key === "loss") return Number(m.lossRate) >= 80;
  }
  if (rule === "AWAY_STRENGTH_OVER15" && side === "away") {
    if (key === "ppg") return Number(m.ppg) >= 1.5;
    if (key === "gf") return Number(m.avgGF) >= 2;
    if (key === "ga") return Number(m.avgGA) >= 1;
  }
  if (rule.startsWith("BALANCED")) {
    if (key === "ppg") return Number(m.ppg) >= 1.5;
    if (key === "gf") return Number(m.avgGF) >= 2;
  }
  return false;
}

export function BankerCard({ pick, compact }: { pick: BankerRulePick; compact?: boolean }) {
  const home = pick.metrics?.home;
  const away = pick.metrics?.away;
  const league = pick.metrics?.league;
  const sameLogo = Boolean(pick.homeLogo && pick.homeLogo === pick.awayLogo);
  const tone = RULE_CHIP[pick.rule] ?? "glass-purpure text-primary-foreground";
  const heat = leagueClass(league?.class);

  return (
    <article className="glass glass-lift block w-full min-w-0 overflow-hidden rounded-3xl p-3 text-left fold:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase", tone)}>
          {RULE_LABEL[pick.rule] ?? pick.rule}
        </span>
        <TimeChip iso={pick.kickoff} />
      </div>

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 fold:gap-3">
        <TeamCol name={pick.home} logo={sameLogo ? null : pick.homeLogo} split={pick.homeSplit} align="left" />
        <div className="flex min-w-[5.5rem] flex-col items-center px-1">
          <span className="max-w-[9rem] text-center text-sm font-semibold leading-tight fold:text-base">
            {pick.displaySelection || pick.selection}
          </span>
          <span className="mt-1 max-w-full truncate text-[11px] text-muted-foreground">{pick.league}</span>
        </div>
        <TeamCol name={pick.away} logo={sameLogo ? null : pick.awayLogo} split={pick.awaySplit} align="right" />
      </div>

      {compact ? null : (
        <>
          <div className="mt-4 space-y-1.5 rounded-2xl bg-foreground/5 px-3 py-3">
            <Stat
              label="PPG"
              home={num(home?.ppg)}
              away={num(away?.ppg)}
              homeOk={factorOk(pick.rule, "home", "ppg", home)}
              awayOk={factorOk(pick.rule, "away", "ppg", away)}
            />
            <Stat
              label="GF"
              home={num(home?.avgGF)}
              away={num(away?.avgGF)}
              homeOk={factorOk(pick.rule, "home", "gf", home)}
              awayOk={factorOk(pick.rule, "away", "gf", away)}
            />
            <Stat
              label="GA"
              home={num(home?.avgGA)}
              away={num(away?.avgGA)}
              homeOk={factorOk(pick.rule, "home", "ga", home)}
              awayOk={factorOk(pick.rule, "away", "ga", away)}
            />
            <Stat
              label="Loss"
              home={home?.lossRate != null ? `${Math.round(home.lossRate)}%` : "—"}
              away={away?.lossRate != null ? `${Math.round(away.lossRate)}%` : "—"}
              homeOk={factorOk(pick.rule, "home", "loss", home)}
              awayOk={factorOk(pick.rule, "away", "loss", away)}
            />
          </div>

          {heat || pick.reasons?.[0] ? (
            <p className="mt-3 text-xs text-subtle">
              {heat ? <span className="font-semibold text-foreground">{heat}. </span> : null}
              {pick.reasons?.[0]}
            </p>
          ) : null}
        </>
      )}
    </article>
  );
}
