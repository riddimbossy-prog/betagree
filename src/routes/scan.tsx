import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { SCAN_LABEL, SCAN_ORDER, ScanCard, scanKind } from "@/components/scan-card";
import { BoardState, LiveBar } from "@/components/live-bar";
import { isPlayingToday, isPlayingTomorrow } from "@/lib/format";
import { useSportyScan } from "@/lib/live/use-live";
import type { SportyScanPayload, SportyScanPick } from "@/lib/types";
import { cn } from "@/lib/utils";

const loadScan = createIsomorphicFn()
  .server(async (): Promise<SportyScanPayload | null> => {
    try {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const raw = await readFile(join(process.cwd(), "public/data/sporty-scan.json"), "utf8");
      return JSON.parse(raw) as SportyScanPayload;
    } catch {
      return null;
    }
  })
  .client(async (): Promise<SportyScanPayload | null> => {
    try {
      const res = await fetch("/data/sporty-scan.json", { cache: "no-store" });
      if (!res.ok) return null;
      return (await res.json()) as SportyScanPayload;
    } catch {
      return null;
    }
  });

export const Route = createFileRoute("/scan")({
  loader: loadScan,
  component: ScanPage,
});

type WhenFilter = "today" | "tomorrow" | "all";

function isTodayPick(pick: SportyScanPick) {
  return pick.when === "today" || isPlayingToday(pick.kickoff);
}

function isTomorrowPick(pick: SportyScanPick) {
  if (isTodayPick(pick)) return false;
  return pick.when === "tomorrow" || isPlayingTomorrow(pick.kickoff);
}

function autoWhen(picks: SportyScanPick[]): WhenFilter {
  if (picks.some(isTodayPick)) return "today";
  if (picks.some(isTomorrowPick)) return "tomorrow";
  return "all";
}

function inWhen(pick: SportyScanPick, when: WhenFilter) {
  if (when === "today") return isTodayPick(pick);
  if (when === "tomorrow") return isTomorrowPick(pick);
  return true;
}

function ScanPage() {
  const initial = Route.useLoaderData();
  const { data, error, loading, reload } = useSportyScan(90_000, true, initial);
  const picks = data?.picks ?? [];
  const todayN = picks.filter(isTodayPick).length;
  const tomN = picks.filter(isTomorrowPick).length;
  const [when, setWhen] = useState<WhenFilter>(() => autoWhen(picks));
  const [kind, setKind] = useState("all");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (touched || !data) return;
    setWhen(autoWhen(data.picks ?? []));
  }, [data, touched]);

  const dated = useMemo(
    () => picks.filter((pick) => inWhen(pick, when)),
    [picks, when],
  );

  const visible = useMemo(
    () => (kind === "all" ? dated : dated.filter((p) => scanKind(p) === kind)),
    [dated, kind],
  );

  const grouped = useMemo(() => {
    const by = new Map<string, SportyScanPick[]>();
    for (const pick of visible) {
      const key = scanKind(pick);
      const list = by.get(key) ?? [];
      list.push(pick);
      by.set(key, list);
    }
    return SCAN_ORDER.filter((id) => by.has(id)).map((id) => ({
      id,
      label: SCAN_LABEL[id],
      picks: by.get(id) ?? [],
    }));
  }, [visible]);

  const kinds = SCAN_ORDER.filter((id) => dated.some((p) => scanKind(p) === id));

  return (
    <div className="flex flex-col gap-5 fold:gap-8">
      <header className="max-w-2xl">
        <LiveBar fetchedAt={data?.fetchedAt} />
        <h1 className="mt-2 text-3xl font-semibold fold:text-5xl">
          Sporty <span className="font-serif italic font-normal">scan</span>
        </h1>
        <p className="mt-2 text-sm text-subtle">
          {loading && !data
            ? "Loading…"
            : when === "today" && data?.when?.today != null
              ? `${visible.length} hits from ${data.when.today} today matches`
              : when === "tomorrow" && data?.when?.tomorrow != null
                ? `${visible.length} hits from ${data.when.tomorrow} tomorrow matches`
                : `${visible.length} hits from ${data?.scanned ?? picks.length} matches`}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Favourite wins, GG, under 2.5, home 2+ and away DNB from the live SportyBet book.
        </p>
      </header>

      <div className="chip-row" role="group" aria-label="When">
        {(
          [
            ["today", "Today", todayN],
            ["tomorrow", "Tomorrow", tomN],
            ["all", "All", picks.length],
          ] as const
        ).map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setTouched(true);
              setWhen(id);
            }}
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm",
              when === id ? "glass-lime font-semibold text-primary-foreground" : "glass text-muted-foreground",
            )}
          >
            {label}
            <span className="ml-2 tabular">{n}</span>
          </button>
        ))}
      </div>

      {kinds.length > 1 ? (
        <div className="chip-row" role="group" aria-label="Pick">
          {kinds.map((id) => {
            const n = dated.filter((p) => scanKind(p) === id).length;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setKind(kind === id ? "all" : id)}
                className={cn(
                  "inline-flex shrink-0 items-center rounded-full px-4 py-2 text-sm",
                  kind === id ? "glass-purpure font-semibold text-primary-foreground" : "glass text-muted-foreground",
                )}
              >
                {SCAN_LABEL[id]}
                <span className="ml-2 tabular">{n}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <BoardState
        loading={loading && !data}
        error={error}
        empty={!loading && !error && visible.length === 0}
        emptyLabel={
          when === "today"
            ? "No scan hits today."
            : when === "tomorrow"
              ? "No scan hits tomorrow."
              : "No scan hits on the board."
        }
        onRetry={reload}
      />

      {grouped.map((section) => (
        <section key={section.id}>
          <h2 className="text-2xl font-semibold">
            {section.label.split(" ")[0]}{" "}
            <span className="font-serif italic font-normal">
              {section.label.split(" ").slice(1).join(" ") || "picks"}
            </span>
          </h2>
          <ul className="mt-3 grid gap-3 fold:grid-cols-2">
            {section.picks.map((pick) => (
              <li key={`${pick.fixtureId}-${pick.rule}-${pick.selection}`}>
                <ScanCard pick={pick} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
