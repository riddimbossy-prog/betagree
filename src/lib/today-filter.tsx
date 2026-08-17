import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const KEY = "betagree:todayOnly";

type TodayFilterState = {
  todayOnly: boolean;
  toggleToday: () => void;
};

const TodayCtx = createContext<TodayFilterState | null>(null);

export function TodayFilterProvider({ children }: { children: ReactNode }) {
  const [todayOnly, setTodayOnly] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === "1") setTodayOnly(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleToday = useCallback(() => {
    setTodayOnly((on) => {
      const next = !on;
      try {
        sessionStorage.setItem(KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return <TodayCtx.Provider value={{ todayOnly, toggleToday }}>{children}</TodayCtx.Provider>;
}

export function useTodayFilter() {
  const ctx = useContext(TodayCtx);
  if (!ctx) {
    throw new Error("TodayFilterProvider missing");
  }
  return ctx;
}

export function useTodayOnly() {
  return useTodayFilter().todayOnly;
}
