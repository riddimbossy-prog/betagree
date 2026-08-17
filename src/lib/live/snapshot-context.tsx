import { createContext, useContext, type ReactNode } from "react";
import type { FormPayload, LedgerPayload, SlatePayload, StreaksPayload, TrendsPayload } from "../types";

export type AppSnapshot = {
  slate: SlatePayload | null;
  form: FormPayload | null;
  trends: TrendsPayload | null;
  streaks: StreaksPayload | null;
  ledger: LedgerPayload | null;
};

const SnapshotContext = createContext<AppSnapshot | null>(null);

export function SnapshotProvider({ value, children }: { value: AppSnapshot; children: ReactNode }) {
  return <SnapshotContext.Provider value={value}>{children}</SnapshotContext.Provider>;
}

export function useSnapshot(): AppSnapshot | null {
  return useContext(SnapshotContext);
}
