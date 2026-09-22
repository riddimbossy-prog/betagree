/** Settle 2+ team-goals and Over 2.5 from a full-time score. */
export function settleStreaks(home, away) {
  const hs = Number(home);
  const as = Number(away);
  if (!Number.isFinite(hs) || !Number.isFinite(as) || hs < 0 || as < 0) return null;
  const total = hs + as;
  const max = Math.max(hs, as);
  const min = Math.min(hs, as);
  return {
    total,
    max,
    min,
    twoPlus: max >= 2,
    twoPlusClear: max >= 2 && (min === 0 || max >= 3 || total >= 4),
    over25: total >= 3,
    over15: total >= 2,
  };
}

export function packRate(hits, n) {
  return { n, hits, rate: n ? hits / n : 0 };
}

export function addHit(row, ok) {
  row.n += 1;
  if (ok) row.hits += 1;
}

export function emptyRate() {
  return { n: 0, hits: 0 };
}

export function finishRates(row) {
  return packRate(row.hits, row.n);
}
