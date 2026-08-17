import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FormRowCard } from "@/components/form-row";
import { BoardState, LiveBar } from "@/components/live-bar";
import { Input } from "@/components/ui/input";
import { FORM_METRICS, FORM_VENUES, formBoardId } from "@/lib/form-meta";
import { useFormBoard } from "@/lib/live/use-live";
import { useTodayOnly } from "@/lib/store";
import type { FormMetric, FormPole, FormVenue } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/form")({ component: FormPage });

function FormPage() {
  const { data, error, loading } = useFormBoard();
  const [pole, setPole] = useState<FormPole>("most");
  const [metric, setMetric] = useState<FormMetric>("wins");
  const [venue, setVenue] = useState<FormVenue>("overall");
  const todayOnly = useTodayOnly();
  const [q, setQ] = useState("");

  const board = data?.boards[formBoardId(pole, metric)];
  const sourceRows = board?.[venue] ?? [];
  const playing = sourceRows.filter((r) => r.playingToday).length;
  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return sourceRows.filter((row) => {
      if (todayOnly && !row.playingToday) return false;
      if (!query) return true;
      return (
        row.team.toLowerCase().includes(query) ||
        row.league.toLowerCase().includes(query) ||
        (row.opponent ?? "").toLowerCase().includes(query)
      );
    });
  }, [sourceRows, todayOnly, q]);

  const title = board?.title ?? `${pole === "most" ? "Most" : "Least"} ${metric}`;
  const unit = board?.unit ?? "Wins";

  return (
    <div className="flex flex-col gap-8">
      <header className="max-w-2xl">
        <LiveBar fetchedAt={data?.fetchedAt} />
        <h1 className="mt-2 text-4xl font-semibold">
          Current <span className="font-serif italic font-normal">form</span>
        </h1>
        <p className="mt-3 text-muted-foreground">
          Season-to-date league tables. Cups and Europe are out. Teams marked Today
          have a fixture on this board.
        </p>
        <p className="mt-2 text-sm text-subtle">
          {loading ? "Reading form…" : `${rows.length} teams · ${playing} playing today`}
        </p>
      </header>

      <div className="glass flex rounded-full p-1">
        {(["most", "least"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPole(p)}
            className={cn(
              "flex-1 rounded-full px-4 py-2.5 text-sm font-semibold capitalize",
              pole === p ? "glass-purpure text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="chip-row">
        {FORM_METRICS.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMetric(m.id)}
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm",
              metric === m.id ? "glass-purpure font-semibold text-primary-foreground" : "glass text-muted-foreground",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="glass flex rounded-full p-1">
        {FORM_VENUES.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setVenue(v.id)}
            className={cn(
              "rounded-full px-3 py-2 text-sm",
              venue === v.id ? "bg-foreground font-semibold text-background" : "text-muted-foreground",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Find a team or league"
        className="h-12 rounded-full px-5"
        aria-label="Filter teams"
      />

      <BoardState
        loading={loading && !data}
        error={error}
        empty={!loading && !error && rows.length === 0}
        emptyLabel={todayOnly ? "Nobody on this list is playing today." : "Form table is empty for this cut."}
      />

      {rows.length ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-2xl font-semibold">
              {title.split(" ")[0]}{" "}
              <span className="font-serif italic font-normal">{title.split(" ").slice(1).join(" ")}</span>
            </h2>
            <Link to="/trends" className="text-sm text-muted-foreground">
              Trends
            </Link>
          </div>
          <ul className="flex flex-col gap-3">
            {rows.map((row) => (
              <li key={`${row.rank}-${row.team}-${row.league}`}>
                <FormRowCard row={row} unit={unit} highlight={row.rank === 1} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs text-subtle">
        League matches only. Refreshed with the live board.
      </p>
    </div>
  );
}
