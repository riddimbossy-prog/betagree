import { cn } from "@/lib/utils";
import type { TrendPick } from "@/lib/types";

const TONE: Record<string, string> = {
  W: "bg-lime text-background",
  D: "bg-amber text-background",
  L: "bg-rose text-hot-foreground",
};

function Pills({ results }: { results?: string[] }) {
  if (!results?.length) return <span className="text-xs text-subtle">—</span>;
  return (
    <span className="flex gap-1">
      {results.map((r, i) => (
        <span
          key={`${r}-${i}`}
          className={cn("grid size-5 place-items-center rounded-md text-[10px] font-bold fold:size-6", TONE[r] ?? "bg-secondary")}
        >
          {r}
        </span>
      ))}
    </span>
  );
}

function Cell({ hits, n }: { hits?: number; n?: number }) {
  if (n == null || hits == null) return <span className="text-subtle">—</span>;
  const ok = n > 0 && hits / n >= 0.8;
  return <span className={cn("tabular", ok ? "font-semibold text-or" : "text-muted-foreground")}>{hits}/{n}</span>;
}

export function Last5Strip({ last5, home, away }: { last5: NonNullable<TrendPick["last5"]>; home: string; away: string }) {
  const lines = ["1.5", "2.5", "3.5"];
  const htLines = ["0.5", "1.5"];
  const homeSplit = last5.homeHome?.n ? last5.homeHome : last5.home;
  const awaySplit = last5.awayAway?.n ? last5.awayAway : last5.away;
  const table = last5.table;
  return (
    <div className="space-y-3">
      {table?.home?.rank && table?.away?.rank ? (
        <p className="text-xs text-subtle">
          Table {table.home.rank}/{table.size} vs {table.away.rank}/{table.size}
          {table.homeHome?.rank && table.awayAway?.rank
            ? ` · home ${table.homeHome.rank} / away ${table.awayAway.rank}`
            : ""}
        </p>
      ) : null}
      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">{home} <span className="text-subtle">home</span></span>
          <Pills results={homeSplit.results} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-semibold">{away} <span className="text-subtle">away</span></span>
          <Pills results={awaySplit.results} />
        </div>
        {last5.h2h?.results?.length ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-subtle">H2H last {last5.h2h.n}</span>
            <Pills results={last5.h2h.results} />
          </div>
        ) : null}
      </div>
      <div className="sheet-scroll">
      <table className="w-full min-w-[18rem] text-center text-xs">
        <thead>
          <tr className="text-subtle">
            <th className="pb-1 text-left font-medium">Venue last 5</th>
            {lines.map((l) => (
              <th key={l} className="pb-1 font-medium">
                O/U {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            [`${home} (H)`, homeSplit],
            [`${away} (A)`, awaySplit],
            last5.h2h ? ["H2H", last5.h2h] : null,
          ]
            .filter(Boolean)
            .map((row) => {
              const [label, side] = row as [string, { ou: Record<string, { over: number; under: number; n: number }> }];
              return (
                <tr key={label}>
                  <td className="truncate py-1 text-left text-muted-foreground">{label}</td>
                  {lines.map((l) => (
                    <td key={l} className="py-1">
                      <Cell hits={side.ou[l]?.over} n={side.ou[l]?.n} />
                      <span className="text-subtle"> / </span>
                      <Cell hits={side.ou[l]?.under} n={side.ou[l]?.n} />
                    </td>
                  ))}
                </tr>
              );
            })}
        </tbody>
      </table>
      </div>
      <div className="sheet-scroll">
      <table className="w-full min-w-[16rem] text-center text-xs">
        <thead>
          <tr className="text-subtle">
            <th className="pb-1 text-left font-medium">First half</th>
            {htLines.map((l) => (
              <th key={l} className="pb-1 font-medium">
                HT {l}
              </th>
            ))}
            <th className="pb-1 font-medium">HT GG</th>
          </tr>
        </thead>
        <tbody>
          {([
            [`${home} (H)`, homeSplit] as const,
            [`${away} (A)`, awaySplit] as const,
          ]).map(([label, side]) => (
            <tr key={`ht-${label}`}>
              <td className="truncate py-1 text-left text-muted-foreground">{label}</td>
              {htLines.map((l) => (
                <td key={l} className="py-1">
                  <Cell hits={side.htOu?.[l]?.over} n={side.htOu?.[l]?.n} />
                  <span className="text-subtle"> / </span>
                  <Cell hits={side.htOu?.[l]?.under} n={side.htOu?.[l]?.n} />
                </td>
              ))}
              <td className="py-1">
                <Cell
                  hits={side.htBttsRate != null && side.n ? Math.round(side.htBttsRate * side.n) : undefined}
                  n={side.n}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {last5.agree?.length ? (
        <p className="text-base text-or">
          {last5.agree
            .slice(0, 2)
            .map((a) => `${a.side === "over" ? "Over" : "Under"} ${a.line}`)
            .join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
