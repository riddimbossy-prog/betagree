import { ConsensusChip } from "@/components/consensus-chip";
import { Crest } from "@/components/crest";
import { MatchSides } from "@/components/match-sides";
import { usePickSheet } from "@/components/pick-sheet";
import { SettleChip } from "@/components/settle-chip";
import { TimeChip } from "@/components/trend-card";
import { formBarWidth } from "@/lib/form-meta";
import type { FormBoardRow } from "@/lib/form-consensus";
import type { FormRow } from "@/lib/types";
import { cn } from "@/lib/utils";

function matchHome(row: FormRow | FormBoardRow) {
  return row.home || row.team;
}

function matchAway(row: FormRow | FormBoardRow) {
  return row.away || row.opponent || "—";
}

function briefFromForm(row: FormBoardRow, unit: string) {
  return {
    id: row.fixtureId ?? row.team,
    home: matchHome(row),
    away: matchAway(row),
    homeLogo: row.homeLogo ?? (row.home && row.team === row.home ? row.logo : null),
    awayLogo: row.awayLogo ?? (row.away && row.team === row.away ? row.logo : null),
    league: row.league,
    kickoffIso: row.kickoff ?? null,
    label: row.boardLabel ?? `${row.team} · ${row.display} ${unit}`,
    odds: row.price ?? null,
    sources: ["form", ...(row.boardLabel ? (["odds"] as const) : [])] as ("form" | "odds")[],
    why:
      row.why ??
      `${row.team} ranks #${row.rank} for ${unit.toLowerCase()} in ${row.league} (${row.display}).`,
  };
}

export function FormRowCard({
  row,
  unit,
  highlight,
}: {
  row: FormRow | FormBoardRow;
  unit: string;
  highlight?: boolean;
}) {
  const sheet = usePickSheet();
  const tipped = row as FormBoardRow;
  return (
    <button
      type="button"
      onClick={() => sheet.open(briefFromForm(tipped, unit))}
      className={cn(
        "glass-lift flex w-full min-w-0 flex-col gap-2 overflow-hidden rounded-3xl p-3 text-left fold:p-4",
        highlight ? "glass-purpure text-primary-foreground" : "glass",
      )}
    >
      <div className="flex w-full min-w-0 items-center gap-2 fold:gap-3">
        <span className="w-6 shrink-0 text-base font-semibold tabular text-subtle fold:w-8 fold:text-lg">{row.rank}</span>
        <Crest name={row.team} logo={row.logo} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold leading-tight break-words fold:text-base">{row.team}</span>
          <span className={cn("block truncate text-xs", highlight ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {row.league}
            {row.home && row.away ? ` · ${row.home} vs ${row.away}` : row.opponent ? ` · vs ${row.opponent}` : ""}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-serif text-2xl italic tabular leading-none text-or">{row.display}</span>
          <span className={cn("block text-[10px] font-semibold uppercase tracking-wide", highlight ? "text-primary-foreground/70" : "text-subtle")}>
            {unit}
          </span>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <span className="block h-full rounded-full bg-or" style={{ width: `${formBarWidth(row)}%` }} />
      </div>
      {tipped.boardLabel ? (
        <div className="flex flex-wrap items-center gap-2">
          {tipped.pct != null ? (
            <ConsensusChip
              pct={tipped.pct}
              count={tipped.tipCount ?? 0}
              coverage={tipped.coverage ?? 0}
              band={tipped.band}
              compact
            />
          ) : null}
          {tipped.settle ? <SettleChip status={tipped.settle} compact /> : null}
          <span className="text-sm font-semibold text-or">{tipped.boardLabel}</span>
        </div>
      ) : null}
    </button>
  );
}

export function FormMatchCard({
  row,
  unit,
}: {
  row: FormBoardRow;
  unit: string;
}) {
  const sheet = usePickSheet();
  return (
    <button
      type="button"
      onClick={() => sheet.open(briefFromForm(row, unit))}
      className="glass glass-lift block w-full min-w-0 overflow-hidden rounded-3xl p-3 text-left fold:p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        {row.kickoff ? <TimeChip raw={null} iso={row.kickoff} compact /> : null}
        <span className="min-w-0 flex-1 text-sm leading-tight text-subtle break-words">{row.league}</span>
        {row.pct != null ? (
          <ConsensusChip pct={row.pct} count={row.tipCount ?? 0} coverage={row.coverage ?? 0} band={row.band} compact />
        ) : null}
      </div>
      <MatchSides
        className="mt-3"
        home={matchHome(row)}
        away={matchAway(row)}
        homeLogo={row.homeLogo ?? (row.team === matchHome(row) ? row.logo : null)}
        awayLogo={row.awayLogo ?? (row.team === matchAway(row) ? row.logo : null)}
        pick={row.team}
        center={<span className="text-xs font-semibold uppercase tracking-wide text-subtle">vs</span>}
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {row.settle ? <SettleChip status={row.settle} compact /> : null}
        {row.price != null ? <span className="odds-chip">{row.price.toFixed(2)}</span> : null}
        <p className="text-sm font-semibold text-or">{row.boardLabel}</p>
      </div>
    </button>
  );
}

