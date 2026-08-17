import { useEffect, useState } from "react";
import type { DeskSource, FormPayload, LedgerPayload, SlatePayload, StreaksPayload, TrendPick, TrendsPayload } from "@/lib/types";
import { applySlateScores, type ScorePatch } from "@/lib/live/score-apply";
import { mergeLiveFixtures } from "@/lib/live/merge-live";
import { useSnapshot } from "@/lib/live/snapshot-context";

/** Static hosts (GitHub Pages) have no /api — skip after first miss. */
let apiAlive: boolean | null = null;

function prefersStaticData(path: string) {
  if (!path.startsWith("/api/")) return true;
  if (apiAlive === false) return false;
  return true;
}

async function loadJson<T>(paths: string[]): Promise<T> {
  let last: unknown;
  for (const path of paths) {
    if (!prefersStaticData(path)) continue;
    try {
      const res = await fetch(path, { credentials: "omit" });
      if (!res.ok) {
        if (path.startsWith("/api/")) apiAlive = false;
        continue;
      }
      if (path.startsWith("/api/")) apiAlive = true;
      return (await res.json()) as T;
    } catch (err) {
      if (path.startsWith("/api/")) apiAlive = false;
      last = err;
    }
  }
  throw last ?? new Error("unavailable");
}

function utcDate(offsetDays = 0) {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays));
  return d.toISOString().slice(0, 10);
}

function deskSource(raw: string): DeskSource {
  if (raw === "odds" || raw === "betexplorer") return "odds";
  return "form";
}

function scrubPick<T extends TrendPick>(pick: T): T {
  return {
    ...pick,
    sources: (pick.sources ?? []).map(deskSource),
    sourceNotes: (pick.sourceNotes ?? []).map((n) => ({ ...n, source: deskSource(n.source) })),
    url: "",
  };
}

function scrubTrends(data: TrendsPayload): TrendsPayload {
  const categories = Object.fromEntries(
    Object.entries(data.categories ?? {}).map(([k, list]) => [k, list.map((p) => scrubPick(p))]),
  ) as TrendsPayload["categories"];
  return {
    ...data,
    sources: (data.sources ?? []).map(deskSource),
    categories,
    bankers: (data.bankers ?? []).map((p) => ({
      ...scrubPick(p),
      agreed: (p.agreed ?? []).map(deskSource),
    })),
  };
}

function scrubForm(data: FormPayload): FormPayload {
  const boards = Object.fromEntries(
    Object.entries(data.boards ?? {}).map(([id, board]) => [
      id,
      {
        ...board,
        overall: board.overall.map((row) => ({ ...row, tipPath: null, teamPath: null })),
        home: board.home.map((row) => ({ ...row, tipPath: null, teamPath: null })),
        away: board.away.map((row) => ({ ...row, tipPath: null, teamPath: null })),
      },
    ]),
  );
  return { ...data, source: "form", boards };
}

function scrubDesk<T extends { handle?: string; bio?: string }>(desk: T): T {
  const handle = desk.handle === "@draftkings" ? "@market" : desk.handle;
  const bio = (desk.bio ?? "")
    .replace(/DraftKings/gi, "market")
    .replace(/\bESPN\b/gi, "live")
    .replace(/PrimaTips/gi, "form")
    .replace(/BetExplorer/gi, "odds");
  return { ...desk, handle, bio };
}

function scrubSlate(data: SlatePayload): SlatePayload {
  return {
    ...data,
    desks: (data.desks ?? []).map((d) => scrubDesk(d)),
    consensus: (data.consensus ?? []).map((c) => ({
      ...c,
      agree: (c.agree ?? []).map((d) => scrubDesk(d)),
      fade: (c.fade ?? []).map((d) => scrubDesk(d)),
      band: c.band ?? (c.pct >= 0.7 ? "high" : c.pct >= 0.5 ? "medium" : "low"),
    })),
  };
}

export function useSlate(initial?: SlatePayload | null, pollMs = 15_000) {
  const snap = useSnapshot();
  const seed = initial ?? snap?.slate ?? null;
  const [data, setData] = useState<SlatePayload | null>(seed);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!seed);

  useEffect(() => {
    let dead = false;
    let board: SlatePayload | null = seed;
    let pending: ScorePatch[] | null = null;

    const paint = (next: SlatePayload) => {
      if (dead) return;
      setData(next);
      setError(null);
      setLoading(false);
    };

    const withScores = (base: SlatePayload, scores?: ScorePatch[] | null) => {
      if (!scores?.length) return base;
      return mergeLiveFixtures(applySlateScores(base, scores), scores);
    };

    const loadSnapshot = async () => {
      const today = utcDate(0);
      const json = scrubSlate(await loadJson<SlatePayload>([`/data/slate-${today}.json`, "/data/slate.json"]));
      board = withScores(json, pending);
      paint(board);
    };

    const loadLiveBoard = async () => {
      if (apiAlive === false) return;
      try {
        const json = scrubSlate(await loadJson<SlatePayload>(["/api/slate"]));
        board = withScores(json, pending);
        paint(board);
      } catch {
        /* snapshot is enough on static hosts */
      }
    };

    const loadScores = async () => {
      try {
        const pack = await loadJson<{ scores: ScorePatch[] }>(["/data/scores.json", "/api/scores"]);
        pending = pack?.scores ?? null;
        if (board && pending?.length) {
          board = withScores(board, pending);
          paint(board);
        }
      } catch {
        /* keep last board if the score ping misses */
      }
    };

    if (!seed) {
      void loadSnapshot().catch(() => {
        void loadLiveBoard().catch(() => {
          if (!dead) {
            setError("Could not reach the live board.");
            setLoading(false);
          }
        });
      });
    } else {
      setLoading(false);
    }
    void loadScores();
    const apiProbe = window.setTimeout(() => void loadLiveBoard(), 2_500);

    const scoreId = window.setInterval(() => void loadScores(), pollMs);
    const boardId = window.setInterval(() => void loadLiveBoard(), Math.max(pollMs * 4, 60_000));
    return () => {
      dead = true;
      window.clearTimeout(apiProbe);
      window.clearInterval(scoreId);
      window.clearInterval(boardId);
    };
  }, [seed, pollMs]);

  return { data, error, loading };
}

export function useLedger() {
  const snap = useSnapshot();
  const seed = snap?.ledger ?? null;
  const [data, setData] = useState<LedgerPayload | null>(
    seed
      ? { ...seed, desks: seed.desks.map((row) => ({ ...row, tipster: scrubDesk(row.tipster) })) }
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!seed);

  useEffect(() => {
    let dead = false;
    loadJson<LedgerPayload>(["/data/ledger.json", "/api/ledger"])
      .then((json) => {
        if (!dead) {
          setData({
            ...json,
            desks: json.desks.map((row) => ({ ...row, tipster: scrubDesk(row.tipster) })),
          });
          setLoading(false);
        }
      })
      .catch(() => {
        if (!dead) {
          setError("Could not reach the accuracy book.");
          setLoading(false);
        }
      });
    return () => {
      dead = true;
    };
  }, []);

  return { data, error, loading };
}

export function useTrends(pollMs = 60_000) {
  const snap = useSnapshot();
  const seed = snap?.trends ? scrubTrends(snap.trends) : null;
  const [data, setData] = useState<TrendsPayload | null>(seed);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!seed);

  useEffect(() => {
    let dead = false;
    const load = async () => {
      try {
        const json = scrubTrends(await loadJson<TrendsPayload>(["/data/trends.json", "/api/trends"]));
        if (!dead) {
          setData(json);
          setError(null);
          setLoading(false);
        }
      } catch {
        if (!dead) {
          setError("Could not reach the trends board.");
          setLoading(false);
        }
      }
    };
    void load();
    const id = window.setInterval(() => void load(), pollMs);
    return () => {
      dead = true;
      window.clearInterval(id);
    };
  }, [pollMs]);

  return { data, error, loading };
}

export function useFormBoard(pollMs = 60_000) {
  const snap = useSnapshot();
  const seed = snap?.form ? scrubForm(snap.form) : null;
  const [data, setData] = useState<FormPayload | null>(seed);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!seed);

  useEffect(() => {
    let dead = false;
    const load = async () => {
      try {
        const json = scrubForm(await loadJson<FormPayload>(["/data/form.json", "/api/form"]));
        if (!dead) {
          setData(json);
          setError(null);
          setLoading(false);
        }
      } catch {
        if (!dead) {
          setError("Could not reach the form board.");
          setLoading(false);
        }
      }
    };
    void load();
    const id = window.setInterval(() => void load(), pollMs);
    return () => {
      dead = true;
      window.clearInterval(id);
    };
  }, [pollMs]);

  return { data, error, loading };
}

export function useStreaks(pollMs = 60_000) {
  const snap = useSnapshot();
  const seed = snap?.streaks ?? null;
  const [data, setData] = useState<StreaksPayload | null>(seed);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!seed);

  useEffect(() => {
    let dead = false;
    const load = async () => {
      try {
        const json = await loadJson<StreaksPayload>(["/data/streaks.json", "/api/streaks"]);
        if (!dead) {
          setData(json);
          setError(null);
          setLoading(false);
        }
      } catch {
        if (!dead) {
          setError("Could not reach the streak board.");
          setLoading(false);
        }
      }
    };
    void load();
    const id = window.setInterval(() => void load(), pollMs);
    return () => {
      dead = true;
      window.clearInterval(id);
    };
  }, [pollMs]);

  return { data, error, loading };
}
