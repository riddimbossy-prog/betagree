import type { StreakAccuracy, StreakAccuracyRate } from "@/lib/types";
import { formatPct } from "@/lib/odds";
import { cn } from "@/lib/utils";

function RateTile({
  label,
  row,
  tone,
}: {
  label: string;
  row?: StreakAccuracyRate | null;
  tone: string;
}) {
  if (!row || !row.n) return null;
  return (
    <div className={cn("min-w-0 rounded-2xl p-3 fold:p-4", tone)}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 font-serif text-3xl italic tabular leading-none">{formatPct(row.rate)}</p>
      <p className="mt-1 text-xs tabular opacity-80">
        {row.hits}/{row.n}
      </p>
    </div>
  );
}

export function StreakAccuracyBoard({ data }: { data?: StreakAccuracy | null }) {
  if (!data?.sample) return null;
  const top = data.leagues.filter((l) => l.rule2.n >= 3).slice(0, 6);
  return (
    <section>
      <h2 className="text-2xl font-semibold">
        Hit <span className="font-serif italic font-normal">rate</span>
      </h2>
      <p className="mt-1 text-sm text-subtle">
        Last {data.windowDays} days · {data.sample} finished
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 fold:grid-cols-4">
        <RateTile label="2+ rule" row={data.rule2} tone="glass-lime text-primary-foreground" />
        <RateTile label="Over 2.5 rule" row={data.ruleOver} tone="glass-amber text-primary-foreground" />
        <RateTile label="All 2+" row={data.twoPlus} tone="glass-purpure text-primary-foreground" />
        <RateTile label="All over 2.5" row={data.over25} tone="glass-azure text-primary-foreground" />
      </div>
      {top.length ? (
        <ul className="mt-3 grid gap-2 fold:grid-cols-2">
          {top.map((row) => (
            <li key={row.name} className="glass flex items-center justify-between gap-2 rounded-2xl px-3 py-2">
              <span className="min-w-0 truncate text-sm font-semibold">{row.name}</span>
              <span className="shrink-0 text-right text-sm tabular text-or">
                {formatPct(row.rule2.rate)}
                <span className="ml-1 text-xs text-subtle">
                  {row.gpg != null ? `${row.gpg.toFixed(1)} gpg` : `${row.rule2.hits}/${row.rule2.n}`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
