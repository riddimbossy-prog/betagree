import { Crest } from "@/components/crest";
import { formatBoardTime } from "@/lib/format";
import type { BankerRulePick } from "@/lib/types";
import { cn } from "@/lib/utils";

export const RULE_LABEL: Record<string, string> = {
  HOME_STRAIGHT_WIN: "Straight Win",
  AWAY_TEAM_NOT_TO_WIN: "Team Not to Win",
  AWAY_STRENGTH_OVER15: "Away Strength · O1.5",
  BALANCED_HIGH_SCORING_OVER25: "Balanced Teams · O2.5",
  BALANCED_LOW_SCORING_OVER15: "Balanced Teams · O1.5",
};

function leagueClass(x?: string) {
  if (x === "high-scoring") return "High scoring";
  if (x === "low-scoring-draw-heavy") return "Low + draw heavy";
  if (x === "neutral") return "Neutral";
  return "Insufficient";
}

function pos(split?: { position?: number; size?: number } | null) {
  return Number.isFinite(Number(split?.position)) ? `#${split?.position}/${split?.size || "—"}` : "—";
}

function Metric({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <span className="flex min-w-0 flex-col">
      <small className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</small>
      <b className="tabular text-sm">{value ?? "—"}</b>
    </span>
  );
}

export function BankerCard({ pick }: { pick: BankerRulePick }) {
  const { clock, day } = formatBoardTime(null, pick.kickoff);
  const home = pick.metrics?.home;
  const away = pick.metrics?.away;
  const league = pick.metrics?.league;
  return (
    <article className="glass-lift overflow-hidden rounded-3xl p-4 fold:p-5">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold tracking-wide uppercase">
        <span className="truncate text-muted-foreground">
          {pick.country ? `${pick.country} · ` : ""}
          {pick.league}
        </span>
        <span className="glass-purpure shrink-0 rounded-full px-2.5 py-0.5 text-primary-foreground">
          {RULE_LABEL[pick.rule] ?? pick.rule}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <Crest name={pick.home} logo={pick.homeLogo} size="sm" />
          <b className="max-w-full truncate text-center text-sm">{pick.home}</b>
        </div>
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">vs</span>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <Crest name={pick.away} logo={pick.awayLogo} size="sm" />
          <b className="max-w-full truncate text-center text-sm">{pick.away}</b>
        </div>
      </div>

      <div className="glass-lime mt-4 rounded-2xl px-3 py-3 text-center text-primary-foreground">
        <small className="block text-[10px] font-semibold tracking-wide uppercase">Rule signal</small>
        <b className="text-lg">{pick.displaySelection || pick.selection}</b>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <section className="rounded-2xl bg-foreground/5 px-3 py-3">
          <h4 className="mb-2 text-[11px] font-semibold tracking-wide uppercase">{pick.home} · home</h4>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="PPG" value={home?.ppg} />
            <Metric label="GF avg" value={home?.avgGF} />
            <Metric label="GA avg" value={home?.avgGA} />
            <Metric label="Loss" value={home?.lossRate != null ? `${home.lossRate}%` : "—"} />
            <Metric label="Rank" value={pos(pick.homeSplit)} />
            <Metric label="Form" value={home?.record} />
          </div>
        </section>
        <section className="rounded-2xl bg-foreground/5 px-3 py-3">
          <h4 className="mb-2 text-[11px] font-semibold tracking-wide uppercase">{pick.away} · away</h4>
          <div className="grid grid-cols-3 gap-2">
            <Metric label="PPG" value={away?.ppg} />
            <Metric label="GF avg" value={away?.avgGF} />
            <Metric label="GA avg" value={away?.avgGA} />
            <Metric label="Loss" value={away?.lossRate != null ? `${away.lossRate}%` : "—"} />
            <Metric label="Rank" value={pos(pick.awaySplit)} />
            <Metric label="Form" value={away?.record} />
          </div>
        </section>
      </div>

      <p className={cn("mt-3 text-xs text-muted-foreground")}>
        <b className="text-foreground">{leagueClass(league?.class)}</b>
        {" · "}
        League avg goals {league?.avgGoals ?? "—"} · O2.5 {league?.over25Rate ?? "—"}% · Draws {league?.drawRate ?? "—"}%
      </p>

      {pick.reasons?.length ? (
        <ul className="mt-3 space-y-1 text-sm text-subtle">
          {pick.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      ) : null}

      <footer className="mt-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase tabular">
        {day ? `${day} · ` : ""}
        {clock}
      </footer>
    </article>
  );
}
