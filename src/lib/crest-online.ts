/**
 * Online crest lookup — Wikipedia first (covers virtually every club),
 * TheSportsDB as a secondary badge source.
 * Wikipedia REST + Action API allow browser CORS (origin=*), so this
 * works on the static GitHub Pages build without a backend.
 */

function norm(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const SEARCH_ALIAS: Record<string, string> = {
  "man city": "Manchester City F.C.",
  "man utd": "Manchester United F.C.",
  "man united": "Manchester United F.C.",
  psg: "Paris Saint-Germain F.C.",
  inter: "Inter Milan",
  "inter milan": "Inter Milan",
  porto: "FC Porto",
  celtic: "Celtic F.C.",
  rangers: "Rangers F.C.",
  "casa pia lisbon": "Casa Pia A.C.",
  "fenerbahce istanbul": "Fenerbahçe S.K.",
  "saint etienne": "AS Saint-Étienne",
  "st etienne": "AS Saint-Étienne",
  "st mirren fc": "St Mirren F.C.",
  "st johnstone fc": "St Johnstone F.C.",
  "cd guadalajara": "C.D. Guadalajara",
  "club tijuana de caliente": "Club Tijuana",
  "psv eindhoven": "PSV Eindhoven",
  monza: "AC Monza",
  "ac monza": "AC Monza",
  "club brugge": "Club Brugge KV",
  "cercle brugge": "Cercle Brugge KSV",
  "orlandocity": "Orlando City SC",
  "inter miami cf": "Inter Miami CF",
  "toronto fc": "Toronto FC",
};

/** Reject non-club / non-logo Wikipedia hits. */
const BAD_TITLE =
  /\b(airport|church|station|scandal|lasso|film|album|song|novel|episode|election|season \d|list of|national football team|disambiguation)\b/i;

const BAD_IMAGE =
  /flag_of|map_of|locator|coat_of_arms_of_[a-z_]+(?:_and)?\.svg|wordmark|word_mark|textlogo|signature|autograph/i;

function queryFor(name: string) {
  const n = norm(name);
  if (SEARCH_ALIAS[n]) return SEARCH_ALIAS[n];
  return name.replace(/\s+W$/i, " women");
}

function clubby(title: string) {
  return /\b(f\.?c\.?|a\.?f\.?c\.?|s\.?c\.?|b\.?k\.?|club|united|city|athletic|sporting|football|soccer|deporte|atletico|calcio|sportverein|sporting club)\b/i.test(
    title,
  );
}

function soccerTeam(team: Record<string, unknown> | null | undefined) {
  if (!team) return false;
  const sport = String(team.strSport ?? "").toLowerCase();
  return sport === "soccer" || sport === "football" || !sport;
}

function scoreTitle(query: string, title: string) {
  const q = norm(query);
  const t = norm(title);
  if (!q || !t) return 0;
  if (q === t) return 1;
  if (t.startsWith(q) || q.startsWith(t)) return 0.95;
  if (t.includes(q) || q.includes(t)) return 0.88;
  const qt = new Set(q.split(" ").filter((x) => x.length > 1));
  const tt = new Set(t.split(" ").filter((x) => x.length > 1));
  let hit = 0;
  for (const x of qt) if (tt.has(x)) hit += 1;
  if (!qt.size) return 0;
  return hit / qt.size;
}

async function wikiSummaryImage(title: string): Promise<string | null> {
  const sum = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    { signal: AbortSignal.timeout(12_000) },
  );
  if (!sum.ok) return null;
  const page = (await sum.json()) as {
    originalimage?: { source?: string };
    thumbnail?: { source?: string };
    type?: string;
  };
  if (page.type === "disambiguation") return null;
  const src = page.originalimage?.source ?? page.thumbnail?.source;
  if (!src || BAD_IMAGE.test(src)) return null;
  // Prefer larger thumb when Wikipedia returns a tiny one
  return src.replace(/\/\d+px-/, "/200px-");
}

/**
 * Primary crest source: English Wikipedia page image for the club article.
 */
export async function wikiBadge(name: string): Promise<string | null> {
  const q = queryFor(name);
  const attempts = [q, `${q} F.C.`, `${q} football club`, `${q} FC`];
  const seen = new Set<string>();

  for (const attempt of attempts) {
    const key = attempt.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const search = await fetch(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(attempt)}&limit=8&namespace=0&format=json&origin=*`,
        { signal: AbortSignal.timeout(12_000) },
      );
      if (!search.ok) continue;
      const data = (await search.json()) as [string, string[], string[], string[]];
      const titles = (data[1] ?? [])
        .filter((t) => !BAD_TITLE.test(t))
        .sort((a, b) => {
          const ca = clubby(a) ? 1 : 0;
          const cb = clubby(b) ? 1 : 0;
          if (ca !== cb) return cb - ca;
          return scoreTitle(q, b) - scoreTitle(q, a);
        });
      for (const title of titles.slice(0, 5)) {
        const sc = scoreTitle(q, title);
        // Require a real name overlap so "Monza" never picks "Monaco"
        if (sc < 0.55) continue;
        const src = await wikiSummaryImage(title);
        if (src) return src;
      }
    } catch {
      /* try next query shape */
    }
  }
  return null;
}

export async function sportsDbBadge(name: string): Promise<string | null> {
  const q = queryFor(name);
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(q)}`,
      { signal: AbortSignal.timeout(12_000) },
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { teams?: Record<string, unknown>[] };
    const teams = (json.teams ?? []).filter(soccerTeam);
    if (!teams.length) return null;
    const want = norm(q);
    teams.sort((a, b) => {
      const an = norm(String(a.strTeam ?? ""));
      const bn = norm(String(b.strTeam ?? ""));
      const as = an === want ? 2 : an.includes(want) || want.includes(an) ? 1 : 0;
      const bs = bn === want ? 2 : bn.includes(want) || want.includes(bn) ? 1 : 0;
      return bs - as;
    });
    const badge = String(teams[0].strBadge ?? teams[0].strLogo ?? "");
    return badge.startsWith("http") ? badge : null;
  } catch {
    return null;
  }
}

/** Wikipedia first, TheSportsDB second. */
export async function findCrestOnline(name: string): Promise<string | null> {
  const fromWiki = await wikiBadge(name);
  if (fromWiki) return fromWiki;
  return sportsDbBadge(name);
}
