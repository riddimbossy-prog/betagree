import { useEffect, useState } from "react";
import type { DeskSource, FormPayload, LedgerPayload, SlatePayload, TrendPick, TrendsPayload } from "@/lib/types";

async function loadJson<T>(paths: string[]): Promise<T> {
  let last: unknown;
  for (const path of paths) {
    try {
      const res = await fetch(path);
      if (!res.ok) continue;
      return (await res.json()) as T;
    } catch (err) {
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
    })),
  };
}

export function useSlate(pollMs = 45_000) {
  const [data, setData] = useState<SlatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let dead = false;
    const load = async () => {
      try {
        const today = utcDate(0);
        const json = scrubSlate(
          await loadJson<SlatePayload>([`/data/slate-${today}.json`, "/api/slate", "/data/slate.json"]),
        );
        if (!dead) {
          setData(json);
          setError(null);
          setLoading(false);
        }
      } catch {
        if (!dead) {
          setError("Could not reach the live board.");
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

export function useLedger() {
  const [data, setData] = useState<LedgerPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
  const [data, setData] = useState<TrendsPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
  const [data, setData] = useState<FormPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
