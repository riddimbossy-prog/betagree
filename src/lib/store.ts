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

export { useTodayFilter, useTodayOnly, TodayFilterProvider } from "@/lib/today-filter";
