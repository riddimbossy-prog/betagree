import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/safe-fetch";
import type { OddsFile } from "@/lib/tip-odds";

let cache: OddsFile | null = null;

export function useOdds() {
  const [data, setData] = useState<OddsFile | null>(cache);
  useEffect(() => {
    let dead = false;
    void fetchJson<OddsFile>("/data/odds.json", { timeoutMs: 8000, retries: 1 })
      .then((file) => {
        if (dead || !file?.byFixture) return;
        cache = file;
        setData(file);
      })
      .catch(() => {
        /* ESPN fallback still prices 1X2 */
      });
    return () => {
      dead = true;
    };
  }, []);
  return data;
}
