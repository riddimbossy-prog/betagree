type Pair = { home: string; away: string };

const g = globalThis as typeof globalThis & { __boardPairs?: Pair[] };
g.__boardPairs ??= [];

export function setBoardPairs(next: Pair[]) {
  g.__boardPairs = next;
}

export function getBoardPairs(): Pair[] {
  return g.__boardPairs ?? [];
}
