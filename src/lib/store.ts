import { create } from "zustand";

type DeskState = {
  savedIds: string[];
  league: string;
  setLeague: (league: string) => void;
  toggleSaved: (id: string) => void;
};

export const useDeskStore = create<DeskState>()((set) => ({
  savedIds: [],
  league: "all",
  setLeague: (league) => set({ league }),
  toggleSaved: (id) =>
    set((s) => ({
      savedIds: s.savedIds.includes(id)
        ? s.savedIds.filter((x) => x !== id)
        : [...s.savedIds, id],
    })),
}));

const TODAY_KEY = "betagree-today-only";

function writeTodayOnly(todayOnly: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(TODAY_KEY, todayOnly ? "1" : "0");
  } catch {
    /* ignore quota / private mode */
  }
}

export function readTodayOnly() {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(TODAY_KEY) === "1";
  } catch {
    return false;
  }
}

type TodayFilterState = {
  todayOnly: boolean;
  setTodayOnly: (todayOnly: boolean) => void;
  toggleToday: () => void;
};

export const useTodayFilter = create<TodayFilterState>()((set) => ({
  todayOnly: false,
  setTodayOnly: (todayOnly) => {
    writeTodayOnly(todayOnly);
    set({ todayOnly });
  },
  toggleToday: () =>
    set((s) => {
      const todayOnly = !s.todayOnly;
      writeTodayOnly(todayOnly);
      return { todayOnly };
    }),
}));

export function useTodayOnly() {
  return useTodayFilter((s) => s.todayOnly);
}
