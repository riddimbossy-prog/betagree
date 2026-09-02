import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendCard } from "@/components/trend-card";
import { BoardState, LiveBar } from "@/components/live-bar";
import { Input } from "@/components/ui/input";
import { isPlayingToday } from "@/lib/format";
import { useTrends } from "@/lib/live/use-live";
import { useTodayOnly } from "@/lib/store";
import { CATEGORY_META, FAMILY_META, type FormFamily } from "@/lib/trend-meta";
import type { FormConsensusRow, TrendCategory, TrendPick } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/form")({ component: FormPage });

type Pole = "best" | "worst";

function FormPage() {
  const { data, error, loading, reload } = useTrends();
  const todayOnly = useTodayOnly();
  const [pole, setPole] = useState<Pole>("best");
  const [family, setFamily] = useState<FormFamily | "all">("all");
  const [metric, setMetric] = useState<TrendCategory | "all">("all");
  const [q, setQ] = useState("");

  const poleCats = CATEGORY_META.filter(
    (c) => c.pole === pole && (family === "all" || c.family === family),
  );

  const cats = useMemo(() => {
    const source = data?.categories;
    if (!source) return undefined;
    const filterList = (list: TrendPick[]) =>
      list.filter((pick) => {
        if (todayOnly && !isPlayingToday(pick.kickoffIso, pick.kickoff, data.date)) return false;
        const query = q.trim().toLowerCase();
        if (!query) return true;
        return (
          pick.home.toLowerCase().includes(query) ||
          pick.away.toLowerCase().includes(query) ||
          pick.team.toLowerCase().includes(query) ||
          pick.league.toLowerCase().includes(query) ||
          pick.label.toLowerCase().includes(query)
        );
      });
    return Object.fromEntries(
      Object.entries(source).map(([key, list]) => [key, filterList(list)]),
    ) as Record<TrendCategory, TrendPick[]>;
  }, [data, todayOnly, q]);

  const visible = poleCats.filter((c) => (metric === "all" || metric === c.id) && (cats?.[c.id]?.length ?? 0) > 0);
  const total = poleCats.reduce((n, c) => n + (cats?.[c.id]?.length ?? 0), 0);

  const agreed = useMemo(() => {
    const query = q.trim().toLowerCase();
    const rows = (data?.consensus ?? []).filter((row) => {
      if (!row.dual) return false;
      if (todayOnly && !isPlayingToday(row.kickoffIso, row.kickoff, data?.date)) return false;
      if (!query) return true;
      return (
        row.home.toLowerCase().includes(query) ||
        row.away.toLowerCase().includes(query) ||
        row.team.toLowerCase().includes(query) ||
        row.league.toLowerCase().includes(query) ||
        row.label.toLowerCase().includes(query)
      );
    });
    if (rows.length) return rows;
    if (!cats) return [] as FormConsensusRow[];
    const dual = Object.values(cats)
      .flat()
      .filter((p) => p.sources.includes("form") && p.sources.includes("odds"));
    const seen = new Set<string>();
    const fallback: FormConsensusRow[] = [];
    for (const p of dual) {
      const key = `${p.home}|${p.away}|${p.selection}`;
      if (seen.has(key)) continue;
      seen.add(key);
      fallback.push({
        team: p.team,
        home: p.home,
        away: p.away,
        league: p.league,
        kickoff: p.kickoff,
        kickoffIso: p.kickoffIso,
        homeLogo: p.homeLogo,
        awayLogo: p.awayLogo,
        fixtureId: p.fixtureId,
        markets: [p.category],
        sources: p.sources,
        rate: p.rate,
        odds: p.odds,
        label: p.label,
        dual: true,
        score: 100,
        pick: p,
      });
    }
    return fallback;
  }, [data, cats, todayOnly, q]);

  return (
    <div className="flex flex-col gap-5 fold:gap-8">
      <header className="max-w-2xl">
        <LiveBar fetchedAt={data?.fetchedAt} />
        <h1 className="mt-2 text-3xl font-semibold fold:text-5xl">
          Current <span className="font-serif italic font-normal">form</span>
        </h1>
        <p className="mt-2 text-base text-subtle">
          {loading && !data
            ? "Loading…"
            : `${total} ${pole === "best" ? "best" : "fade"} picks${todayOnly ? " today" : ""}`}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Season tables and streak desks, then a consensus when both land on the same side. Prices stay 1.19–1.55.
        </p>
      </header>

      <div className="glass flex rounded-full p-1">
        {(
          [
            ["best", "Best to win"],
            ["worst", "Fade worst"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setPole(id);
              setMetric("all");
              setFamily("all");
            }}
            className={cn(
              "flex-1 rounded-full px-4 py-2.5 text-base font-semibold",
              pole === id
                ? id === "best"
                  ? "glass-lime text-primary-foreground"
                  : "glass-rose text-primary-foreground"
                : "text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="chip-row">
        <button
          type="button"
          onClick={() => {
            setFamily("all");
            setMetric("all");
          }}
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm",
            family === "all" ? "glass-cyan font-semibold text-primary-foreground" : "glass text-muted-foreground",
          )}
        >
          All markets
        </button>
        {FAMILY_META.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => {
              setFamily(f.id);
              setMetric("all");
            }}
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm",
              family === f.id
                ? f.id === "result"
                  ? "glass-lime font-semibold text-primary-foreground"
                  : f.id === "goals"
                    ? "glass-amber font-semibold text-primary-foreground"
                    : f.id === "gg"
                      ? "glass-rose font-semibold text-primary-foreground"
                      : "glass-azure font-semibold text-primary-foreground"
                : "glass text-muted-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="chip-row">
        <button
          type="button"
          onClick={() => setMetric("all")}
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm",
            metric === "all" ? "glass-purpure font-semibold text-primary-foreground" : "glass text-muted-foreground",
          )}
        >
          All
        </button>
        {poleCats.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setMetric(c.id)}
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm",
              metric === c.id ? "glass-purpure font-semibold text-primary-foreground" : "glass text-muted-foreground",
            )}
          >
            {c.label}
            <span className="ml-2 tabular text-muted-foreground">{cats?.[c.id]?.length ?? 0}</span>
          </button>
        ))}
      </div>

      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Find a team, league or tip"
        className="h-12 rounded-full px-5"
        aria-label="Filter form picks"
      />

      <BoardState
        loading={loading && !data}
        error={error}
        empty={!loading && !error && total === 0 && agreed.length === 0}
        emptyLabel={
          todayOnly
            ? "Nothing playing today."
            : "No form picks in this view."
        }
        onRetry={reload}
      />

      {agreed.length && family === "all" && metric === "all" && pole === "best" ? (
        <section>
          <div className="mb-4">
            <h2 className="text-2xl font-semibold fold:text-3xl">
              Both <span className="font-serif italic font-normal">desks</span>
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Form tables and streak desks agree on {agreed.length} {agreed.length === 1 ? "side" : "sides"} today. Ranked across every market.
            </p>
          </div>
          <ul className="grid gap-3 fold:grid-cols-2 xl:grid-cols-3">
            {agreed.slice(0, 9).map((row, i) => (
              <li key={`${row.home}-${row.away}-${row.team}`}>
                {row.pick ? (
                  <TrendCard pick={row.pick} highlight={i === 0} />
                ) : (
                  <TrendCard
                    pick={{
                      id: `${row.home}-${row.away}-${row.team}`,
                      category: row.markets[0] ?? "wins",
                      home: row.home,
                      away: row.away,
                      team: row.team,
                      opponent: row.team === row.home ? row.away : row.home,
                      league: row.league,
                      kickoff: row.kickoff,
                      kickoffIso: row.kickoffIso,
                      selection: "home",
                      label: row.label,
                      market: "1x2",
                      odds: row.odds,
                      rate: row.rate,
                      sample: 5,
                      statLabel: row.markets
                        .map((id) => CATEGORY_META.find((c) => c.id === id)?.label ?? id)
                        .join(" · "),
                      sources: row.sources,
                      sourceNotes: [],
                      fixtureId: row.fixtureId ?? null,
                      homeLogo: row.homeLogo ?? null,
                      awayLogo: row.awayLogo ?? null,
                    }}
                    highlight={i === 0}
                  />
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {visible.map((c) => (
        <section key={c.id} id={c.id}>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold fold:text-3xl">
                {c.label.split(" ")[0]}{" "}
                <span className="font-serif italic font-normal">{c.label.split(" ").slice(1).join(" ")}</span>
              </h2>
            </div>
            {c.id === "wins" ? (
              <Link to="/banker" className="shrink-0 text-sm text-muted-foreground">
                Bankers
              </Link>
            ) : null}
          </div>
          <ul className="grid gap-3 fold:grid-cols-2 xl:grid-cols-3">
            {(cats?.[c.id] ?? []).map((pick, i) => (
              <li key={pick.id}>
                <TrendCard pick={pick} highlight={i === 0} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
