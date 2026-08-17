import { createIsomorphicFn } from "@tanstack/react-start";
import type { SlatePayload } from "../types";
import type { AppSnapshot } from "./snapshot-context";

function emptyAppSnapshot(): AppSnapshot {
  return {
    slate: null,
    form: null,
    trends: null,
    streaks: null,
    ledger: null,
  };
}

/** Server reads public/data; client returns empty so /data JSON can seed the board. */
export const loadAppSnapshot = createIsomorphicFn()
  .server(async (): Promise<AppSnapshot> => {
    const { loadAppSnapshot: read } = await import("./snapshot.server");
    return read();
  })
  .client(async (): Promise<AppSnapshot> => emptyAppSnapshot());

/** Server reads the slate; client returns null so useSlate fetches /data/slate.json. */
export const loadBoardSnapshot = createIsomorphicFn()
  .server(async (): Promise<SlatePayload | null> => {
    const { loadBoardSnapshot: read } = await import("./snapshot.server");
    return read();
  })
  .client(async (): Promise<SlatePayload | null> => null);
