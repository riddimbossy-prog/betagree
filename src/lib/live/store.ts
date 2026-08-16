import type { Fixture, LedgerPayload, SlatePayload } from "@/lib/types";
import { assembleSlate, gradeLedger } from "./engine";
import { enrichOdds, fetchHistoryFixtures, fetchSlateFixtures } from "./espn";

const SLATE_TTL = 45_000;
const LEDGER_TTL = 10 * 60_000;
const HISTORY_TTL = 10 * 60_000;

let slateCache: { at: number; data: SlatePayload } | null = null;
let ledgerCache: { at: number; data: LedgerPayload } | null = null;
let historyCache: { at: number; data: Fixture[] } | null = null;

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function history(day: Date): Promise<Fixture[]> {
  const now = Date.now();
  if (historyCache && now - historyCache.at < HISTORY_TTL) return historyCache.data;
  const raw = await fetchHistoryFixtures(day, 21);
  const data = await enrichOdds(raw);
  historyCache = { at: now, data };
  return data;
}

export async function getSlate(force = false): Promise<SlatePayload> {
  const now = Date.now();
  if (!force && slateCache && now - slateCache.at < SLATE_TTL) return slateCache.data;
  const day = todayUtc();
  const [fixtures, past] = await Promise.all([fetchSlateFixtures(day), history(day)]);
  const data = assembleSlate(day, fixtures, past);
  slateCache = { at: now, data };
  return data;
}

export async function getLedger(force = false): Promise<LedgerPayload> {
  const now = Date.now();
  if (!force && ledgerCache && now - ledgerCache.at < LEDGER_TTL) return ledgerCache.data;
  const data = gradeLedger(await history(todayUtc()));
  ledgerCache = { at: now, data };
  return data;
}
