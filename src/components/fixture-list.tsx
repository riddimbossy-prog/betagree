import type { ConsensusItem, Fixture } from "@/lib/types";
import { formatDecimal, formatPct } from "@/lib/odds";
import { Crest } from "@/components/crest";
import { TimeChip } from "@/components/trend-card";
import { ConsensusChip } from "@/components/consensus-chip";
import { usePickSheet } from "@/components/pick-sheet";
import { bandOf } from "@/lib/consensus";

export function FixtureList({
  fixtures,
  byFixture,
}: {
  fixtures: Fixture[];
  byFixture: Map<string, ConsensusItem[]>;
}) {
  const sheet = usePickSheet();
  return (
    <ul className="flex flex-col gap-3">
      {fixtures.map((f) => {
        const rows = byFixture.get(f.id) ?? [];
        const top = rows.find((c) => c.market === "1x2") ?? rows[0];
        const band = top ? bandOf(top) : null;
        return (
          <li key={f.id}>
            <button
              type="button"
              onClick={() =>
                sheet.open({
                  id: f.id,
                  home: f.home.name,
                  away: f.away.name,
                  homeLogo: f.home.logo,
                  awayLogo: f.away.logo,
                  league: f.league,
                  kickoffIso: f.start,
                  label: top?.label ?? `${f.away.name} vs ${f.home.name}`,
                  odds: top
                    ? top.selection === "home"
                      ? f.home.ml
                      : top.selection === "away"
                        ? f.away.ml
                        : f.drawMl
                    : f.home.ml,
                  sources: ["form", "odds"],
                  why: top
                    ? `${top.label}. ${top.count} of ${top.coverage} tip sites land here (${formatPct(top.pct)}). ${bandOf(top) === "high" ? "High consensus." : bandOf(top) === "medium" ? "Medium consensus." : "Low consensus — the sites are split."} The sheet stays here.`
                    : `${f.away.name} visit ${f.home.name} in ${f.league}. No site overlap yet.`,
                })
              }
              className="glass block w-full min-w-0 overflow-hidden rounded-3xl p-3 text-left fold:p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                {f.live ? (
                  <span className="rounded-full bg-gules px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-hot-foreground uppercase">
                    {f.detail || "Live"}
                  </span>
                ) : (
                  <TimeChip raw={null} iso={f.start} />
                )}
                <span className="truncate text-xs text-subtle">{f.league}</span>
                {top ? (
                  <span className="ml-auto">
                    <ConsensusChip
                      pct={top.pct}
                      count={top.count}
                      coverage={top.coverage}
                      band={band}
                      compact
                    />
                  </span>
                ) : null}
              </div>
              <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 fold:gap-3">
                <span className="flex min-w-0 items-center gap-1.5 fold:gap-2">
                  <Crest name={f.away.name} logo={f.away.logo} size="xs" className="fold:h-14 fold:w-11" />
                  <span className="truncate text-xs font-medium fold:text-sm">{f.away.name}</span>
                </span>
                <span className="px-1 text-base font-bold tabular fold:text-xl">
                  {f.away.score ?? "–"} : {f.home.score ?? "–"}
                </span>
                <span className="flex min-w-0 items-center justify-end gap-1.5 fold:gap-2">
                  <span className="truncate text-right text-xs font-medium fold:text-sm">{f.home.name}</span>
                  <Crest name={f.home.name} logo={f.home.logo} size="xs" className="fold:h-14 fold:w-11" />
                </span>
              </div>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span className="odds-chip bg-secondary">{formatDecimal(f.away.ml)}</span>
                <span className="odds-chip bg-secondary">{formatDecimal(f.drawMl)}</span>
                <span className="odds-chip bg-secondary">{formatDecimal(f.home.ml)}</span>
              </div>
              {top ? (
                <p className="mt-3 text-sm text-or">{top.label}</p>
              ) : (
                <p className="mt-3 text-xs text-subtle">No consensus</p>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
