export function buildLeagueRates(fixtures) {
  const by = new Map();
  const world = empty();
  for (const f of fixtures ?? []) {
    const hs = f.home?.score;
    const as = f.away?.score;
    if (hs == null || as == null || !Number.isFinite(hs) || !Number.isFinite(as)) continue;
    const league = f.league || "Unknown";
    const row = by.get(league) ?? empty();
    apply(row, hs, as);
    apply(world, hs, as);
    by.set(league, row);
  }
  const leagues = {};
  for (const [name, row] of by) leagues[name] = finish(row);
  return {
    updatedAt: new Date().toISOString(),
    sample: world.n,
    global: finish(world),
    leagues,
  };
}

function empty() {
  return { n: 0, homeN: 0, drawN: 0, awayN: 0, over15N: 0, over25N: 0, over35N: 0, bttsN: 0, goals: 0 };
}

function apply(row, hs, as) {
  const goals = hs + as;
  row.n += 1;
  row.goals += goals;
  if (hs > as) row.homeN += 1;
  else if (as > hs) row.awayN += 1;
  else row.drawN += 1;
  if (goals > 1.5) row.over15N += 1;
  if (goals > 2.5) row.over25N += 1;
  if (goals > 3.5) row.over35N += 1;
  if (hs > 0 && as > 0) row.bttsN += 1;
}

function finish(row) {
  const n = row.n || 1;
  return {
    n: row.n,
    home: row.homeN / n,
    draw: row.drawN / n,
    away: row.awayN / n,
    over15: row.over15N / n,
    over25: row.over25N / n,
    over35: row.over35N / n,
    btts: row.bttsN / n,
    gpg: row.goals / n,
  };
}
