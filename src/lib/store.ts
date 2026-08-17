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

type TodayFilterState = {
  todayOnly: boolean;
  toggleToday: () => void;
};

export const useTodayFilter = create<TodayFilterState>()((set) => ({
  todayOnly: false,
  toggleToday: () => set((s) => ({ todayOnly: !s.todayOnly })),
}));

export function useTodayOnly() {
  return useTodayFilter((s) => s.todayOnly);
}
