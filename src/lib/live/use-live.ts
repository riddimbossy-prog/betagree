import { useEffect, useState } from "react";
import type { LedgerPayload, SlatePayload } from "@/lib/types";
import { getLedger, getSlate } from "./store";

export function useSlate(pollMs = 45_000) {
  const [data, setData] = useState<SlatePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let dead = false;
    const load = async () => {
      try {
        const json = await getSlate();
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
    getLedger()
      .then((json) => {
        if (!dead) {
          setData(json);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!dead) {
          setError("Could not reach the ledger.");
          setLoading(false);
        }
      });
    return () => {
      dead = true;
    };
  }, []);

  return { data, error, loading };
}
