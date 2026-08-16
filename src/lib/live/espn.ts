export async function enrichOdds(fixtures: Fixture[]): Promise<Fixture[]> {
  const pending = fixtures.filter((f) => f.home.ml == null && f.away.ml == null);
  if (!pending.length) return fixtures;

  const byId = new Map(fixtures.map((f) => [f.id, f]));
  const queue = [...pending];
  const workers = Array.from({ length: 10 }, async () => {
    while (queue.length) {
      const f = queue.shift();
      if (!f) break;
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${f.leagueSlug}/summary?event=${f.id}`;
      const data = await fetchJson(url);
      if (!data) continue;
      const pc = data.pickcenter;
      const odd = Array.isArray(pc) ? pc[0] : pc;
      if (!odd || typeof odd !== "object") continue;
      const o = odd as Record<string, unknown>;
      const home = (o.homeTeamOdds ?? {}) as Record<string, unknown>;
      const away = (o.awayTeamOdds ?? {}) as Record<string, unknown>;
      const draw = (o.drawOdds ?? {}) as Record<string, unknown>;
      byId.set(f.id, {
        ...f,
        home: { ...f.home, ml: parseOdds(home.moneyLine) },
        away: { ...f.away, ml: parseOdds(away.moneyLine) },
        drawMl: parseOdds(draw.moneyLine),
        total: typeof o.overUnder === "number" ? o.overUnder : f.total,
        overOdds:
          typeof o.overOdds === "number" ? `${o.overOdds > 0 ? "+" : ""}${Math.round(o.overOdds)}` : f.overOdds,
        underOdds:
          typeof o.underOdds === "number" ? `${o.underOdds > 0 ? "+" : ""}${Math.round(o.underOdds)}` : f.underOdds,
      });
    }
  });
  await Promise.all(workers);
  return fixtures.map((f) => byId.get(f.id) ?? f);
}