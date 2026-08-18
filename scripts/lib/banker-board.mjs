import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { buildBankerRules, leagueProfileFromRates } from "./banker-engine.mjs";
import { loadVenueForm } from "./last5.mjs";

const ROOT = join(import.meta.dirname, "../..");

const SLUG_COUNTRY = {
  "eng.": "England",
  "esp.": "Spain",
  "ita.": "Italy",
  "ger.": "Germany",
  "fra.": "France",
  "ned.": "Netherlands",
  "por.": "Portugal",
  "bel.": "Belgium",
  "sco.": "Scotland",
  "tur.": "Turkey",
  "usa.": "USA",
  "mex.": "Mexico",
  "bra.": "Brazil",
  "arg.": "Argentina",
  "swe.": "Sweden",
  "den.": "Denmark",
  "col.": "Colombia",
  "chi.": "Chile",
  "ecu.": "Ecuador",
  "uefa.": "Europe",
};

function countryOf(fixture) {
  const slug = String(fixture.leagueSlug || "");
  for (const [prefix, name] of Object.entries(SLUG_COUNTRY)) {
    if (slug.startsWith(prefix)) return name;
  }
  return fixture.country || "International";
}

function asApiGames(rows) {
  return (rows || [])
    .filter((g) => Number.isFinite(g.hs) && Number.isFinite(g.as))
    .slice(0, 5)
    .map((g) => ({
      fixture: { status: { short: "FT" } },
      goals: { home: g.hs, away: g.as },
    }));
}

async function readJson(rel, fallback) {
  try {
    return JSON.parse(await readFile(join(ROOT, rel), "utf8"));
  } catch {
    return fallback;
  }
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

export async function buildBankerBoard({ fixtures = [], date, dateLabel } = {}) {
  const rates = await readJson("public/data/league-rates.json", { leagues: {}, global: null });
  const analyzed = await mapPool(fixtures, 4, async (fx) => {
    if (!fx?.home?.name || !fx?.away?.name) return null;
    if (fx.status === "post") return null;
    try {
      const form = await loadVenueForm(fx.home.name, fx.away.name);
      const leagueRow = rates.leagues?.[fx.league] ?? rates.global;
      return {
        fixtureId: String(fx.id),
        league: fx.league,
        country: countryOf(fx),
        kickoff: fx.start,
        home: {
          id: fx.home.id,
          name: fx.home.name,
          logo: fx.home.logo || null,
          fixtures: asApiGames(form.homeHome),
        },
        away: {
          id: fx.away.id,
          name: fx.away.name,
          logo: fx.away.logo || null,
          fixtures: asApiGames(form.awayAway),
        },
        earlySeason: form.earlySeason === true,
        homeSplit: form.table?.homeHome?.rank
          ? { position: form.table.homeHome.rank, size: form.table.size, sampleReady: true }
          : null,
        awaySplit: form.table?.awayAway?.rank
          ? { position: form.table.awayAway.rank, size: form.table.size, sampleReady: true }
          : null,
        bankerLeagueProfile: leagueProfileFromRates(leagueRow),
      };
    } catch (err) {
      console.warn("banker skip", fx.home.name, fx.away.name, err.message);
      return null;
    }
  });

  const ready = analyzed.filter(Boolean);
  const built = buildBankerRules(ready);
  const day = date || new Date().toISOString().slice(0, 10);
  return {
    date: day,
    dateLabel: dateLabel || day,
    fetchedAt: new Date().toISOString(),
    engine: "banker-rules-v2",
    scanned: fixtures.length,
    analyzed: ready.length,
    picks: built.picks,
    meta: built.meta,
  };
}
