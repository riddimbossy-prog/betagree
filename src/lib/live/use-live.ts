import { useEffect, useState } from "react";
import type { DeskSource, FormPayload, LedgerPayload, SlatePayload, StreaksPayload, TrendPick, TrendsPayload } from "@/lib/types";
import { applySlateScores, type ScorePatch } from "@/lib/live/score-apply";
import { mergeLiveFixtures } from "@/lib/live/merge-live";
import { useSnapshot } from "@/lib/live/snapshot-context";
import { fetchJson } from "@/lib/safe-fetch";
import { listenForBoardSync, requestBoardSync } from "@/lib/background-sync";

async function loadJson<T>(paths: string[]): Promise<T> {
  let last: unknown;
  for (const path of paths) {
    try {
      return await fetchJson<T>(path, { timeoutMs: 10_000, retries: 1 });
    } catch (err) {
      last = err;
    }
  }
  void requestBoardSync();
  throw last ?? new Error("unavailable");
}

function useReload() {
  const [tick, setTick] = useState(0);
  const reload = () => setTick((n) => n + 1);
  useEffect(() => listenForBoardSync(reload), []);
  return { tick, reload };
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

export function useSlate(initial?: SlatePayload | null, pollMs = 10_000) {
  const snap = useSnapshot();
  const seed = initial ?? snap?.slate ?? null;
  const { tick, reload } = useReload();
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
      try {
        const json = scrubSlate(await loadJson<SlatePayload>(["/api/slate"]));
        board = withScores(json, pending);
        paint(board);
      } catch {
        /* snapshot is enough */
      }
    };

    const loadScores = async () => {
      try {
        const pack = await loadJson<{ scores: ScorePatch[] }>(["/api/scores", "/data/scores.json"]);
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
    }
    void loadScores().catch(() => {
      /* keep last scores */
    });
    if (!seed) {
      void loadLiveBoard().catch(() => {
        /* snapshot is enough */
      });
    }

    const scoreId = window.setInterval(() => void loadScores(), Math.max(pollMs, 8_000));
    const boardId = window.setInterval(() => void loadLiveBoard(), Math.max(pollMs * 4, 40_000));
    return () => {
      dead = true;
      window.clearInterval(scoreId);
      window.clearInterval(boardId);
    };
  }, [seed, pollMs, tick]);

  return { data, error, loading, reload };
}

export function useLedger() {
  const snap = useSnapshot();
  const seed = snap?.ledger ?? null;
  const { tick, reload } = useReload();
  const [data, setData] = useState<LedgerPayload | null>(
    seed
      ? { ...seed, desks: seed.desks.map((row) => ({ ...row, tipster: scrubDesk(row.tipster) })) }
      : null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!seed);

  useEffect(() => {
    let dead = false;
    loadJson<LedgerPayload>(["/api/ledger", "/data/ledger.json"])
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
          setLoading(false);
          setData((cur) => {
            if (!cur) setError("Could not reach the accuracy book.");
            return cur;
          });
        }
      });
    return () => {
      dead = true;
    };
  }, [tick]);

  return { data, error, loading, reload };
}

export function useTrends(pollMs = 90_000, enabled = true) {
  const snap = useSnapshot();
  const seed = snap?.trends ? scrubTrends(snap.trends) : null;
  const { tick, reload } = useReload();
  const [data, setData] = useState<TrendsPayload | null>(seed);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!seed);

  useEffect(() => {
    if (!enabled) return;
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
          setLoading(false);
          setData((cur) => {
            if (!cur) setError("Could not reach the trends board.");
            return cur;
          });
        }
      }
    };
    void load();
    const id = window.setInterval(() => void load(), pollMs);
    return () => {
      dead = true;
      window.clearInterval(id);
    };
  }, [pollMs, tick, enabled]);

  return { data, error, loading, reload };
}

export function useFormBoard(pollMs = 90_000, enabled = true) {
  const snap = useSnapshot();
  const seed = snap?.form ? scrubForm(snap.form) : null;
  const { tick, reload } = useReload();
  const [data, setData] = useState<FormPayload | null>(seed);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!seed);

  useEffect(() => {
    if (!enabled) return;
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
          setLoading(false);
          setData((cur) => {
            if (!cur) setError("Could not reach the form board.");
            return cur;
          });
        }
      }
    };
    void load();
    const id = window.setInterval(() => void load(), pollMs);
    return () => {
      dead = true;
      window.clearInterval(id);
    };
  }, [pollMs, tick, enabled]);

  return { data, error, loading, reload };
}

export function useStreaks(pollMs = 90_000, enabled = true) {
  const snap = useSnapshot();
  const seed = snap?.streaks ?? null;
  const { tick, reload } = useReload();
  const [data, setData] = useState<StreaksPayload | null>(seed);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!seed);

  useEffect(() => {
    if (!enabled) return;
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
          setLoading(false);
          setData((cur) => {
            if (!cur) setError("Could not reach the streak board.");
            return cur;
          });
        }
      }
    };
    void load();
    const id = window.setInterval(() => void load(), pollMs);
    return () => {
      dead = true;
      window.clearInterval(id);
    };
  }, [pollMs, tick, enabled]);

  return { data, error, loading, reload };
}
