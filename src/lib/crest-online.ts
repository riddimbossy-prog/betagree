/**
 * Online crest lookup — SofaScore first (official club badges),
 * then Wikipedia, then TheSportsDB.
 *
 * Failures were almost never "SofaScore missing the club". They were:
 *   1. Search query too legalistic ("Al Hilal SFC", "Al Nassr Club") → 0 hits
 *   2. Score treated extra city / suffix tokens as a hard conflict
 *      ("Besiktas Istanbul" vs "Beşiktaş JK")
 *   3. SportyBet abbreviations ("Ind. del Valle", "Dep. Saprissa")
 */

function foldLatin(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/œ/g, "oe")
    .replace(/ł/g, "l")
    .replace(/đ/g, "d")
    .replace(/ð/g, "d")
    .replace(/þ/g, "th")
    .replace(/ß/g, "ss")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function norm(name: string) {
  return foldLatin(name);
}

const SEARCH_ALIAS: Record<string, string> = {
  "man city": "Manchester City",
  "man utd": "Manchester United",
  "man united": "Manchester United",
  psg: "Paris Saint-Germain",
  inter: "Inter Milan",
  "inter milan": "Inter Milan",
  porto: "FC Porto",
  celtic: "Celtic",
  rangers: "Rangers",
  "casa pia lisbon": "Casa Pia",
  "fenerbahce istanbul": "Fenerbahce",
  "besiktas istanbul": "Besiktas",
  "saint etienne": "Saint-Etienne",
  "st etienne": "Saint-Etienne",
  "st mirren fc": "St Mirren",
  "st johnstone fc": "St Johnstone",
  "cd guadalajara": "Guadalajara",
  "club tijuana de caliente": "Club Tijuana",
  "psv eindhoven": "PSV Eindhoven",
  monza: "Monza",
  "ac monza": "Monza",
  "club brugge": "Club Brugge",
  "cercle brugge": "Cercle Brugge",
  "inter miami cf": "Inter Miami",
  "toronto fc": "Toronto FC",
  "cd sabadell": "CE Sabadell",
  "maxline vitebsk": "ML Vitebsk",
  "al hilal sfc": "Al Hilal",
  "al nassr club": "Al Nassr",
  "al riyadh sc": "Al Riyadh",
  "khor fakkan club": "Khor Fakkan",
  "young boys bern": "Young Boys",
  "bohemians prague 1905": "Bohemians 1905",
  "alverca futebol": "Alverca",
  "cs cienciano": "Cienciano",
  "kf aegir": "Aegir",
};

const LEGAL = new Set([
  "fc",
  "cf",
  "sc",
  "cs",
  "afc",
  "cfc",
  "sfc",
  "ifc",
  "fk",
  "kf",
  "sk",
  "bk",
  "if",
  "ff",
  "ac",
  "cd",
  "ce",
  "jk",
  "bsc",
  "the",
  "de",
  "do",
  "da",
  "di",
  "del",
  "la",
  "el",
  "club",
  "clube",
  "futebol",
  "football",
  "fodbold",
  "soccer",
  "united",
  "city",
  "town",
  "hotspur",
]);

const CITY_TAIL = new Set([
  "istanbul",
  "bern",
  "prague",
  "praha",
  "doha",
  "athens",
  "athinon",
  "amsterdam",
  "eindhoven",
  "lisbon",
  "london",
  "madrid",
  "moscow",
  "kyiv",
  "sofia",
  "zagreb",
]);

const STOP = new Set([...LEGAL, ...CITY_TAIL]);

const BAD_TITLE =
  /\b(airport|church|station|scandal|lasso|film|album|song|novel|episode|election|season \d|list of|national football team|disambiguation)\b/i;

const BAD_IMAGE =
  /flag_of|map_of|locator|coat_of_arms_of_[a-z_]+(?:_and)?\.svg|wordmark|word_mark|textlogo|signature|autograph/i;

const YOUTH =
  /\b(u\d{1,2}|women|wfc|frauen|feminino|reserve|reserves|zona sur|minifootball|\bii\b|\biii\b)\b/i;

const SB_HEADERS = {
  Accept: "application/json",
  Origin: "https://www.sofascore.com",
  Referer: "https://www.sofascore.com/",
};

function queryFor(name: string) {
  const cleaned = name.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  const n = norm(cleaned);
  if (SEARCH_ALIAS[n]) return SEARCH_ALIAS[n];
  return cleaned.replace(/\s+W$/i, " women");
}

function tokens(s: string) {
  return new Set(
    norm(s)
      .split(" ")
      .filter((t) => t.length > 1 && !STOP.has(t)),
  );
}

function expandAbbrevs(name: string) {
  return name
    .replace(/\bJrs?\.?\b/gi, "Juniors")
    .replace(/\bUtd\.?\b/gi, "United")
    .replace(/\bDep\.?\b/gi, "Deportivo")
    .replace(/\bInd\.?\b/gi, "Independiente")
    .replace(/\bAtl\.?\b/gi, "Atletico")
    .replace(/\bLok\.?\b/gi, "Lokomotiv")
    .replace(/\bDyn\.?\b/gi, "Dynamo")
    .replace(/\bSp\.?\b/gi, "Sportivo")
    .replace(/\bUniv\.?\b/gi, "Universidad")
    .replace(/^U\. de /i, "Universidad de ")
    .replace(/^U\. /i, "Universidad ");
}

/** Best SofaScore queries first — stripped / expanded beat legalistic SportyBet names. */
export function searchQueries(name: string): string[] {
  const out: string[] = [];
  const add = (s: string) => {
    const t = s.replace(/\s+/g, " ").trim();
    if (!t) return;
    if (out.some((x) => norm(x) === norm(t))) return;
    out.push(t);
  };

  const aliased = queryFor(name);
  const expanded = expandAbbrevs(aliased);
  const parts = norm(expanded).split(" ").filter(Boolean);
  const core = parts.filter((p) => !LEGAL.has(p) && !CITY_TAIL.has(p));

  add(aliased !== name ? aliased : "");
  if (core.length) add(core.join(" "));
  add(expanded);
  if (/^cd /i.test(name)) add(name.replace(/^cd /i, "CE "));
  if (/^(cs|kf|bk|if|fc|cf|sc|ac) /i.test(name)) add(name.replace(/^(cs|kf|bk|if|fc|cf|sc|ac) /i, ""));
  if (core.length >= 2) add(core.slice(-2).join(" "));
  add(name);

  return out.filter(Boolean).slice(0, 5);
}

function tokenRelated(a: string, b: string) {
  if (a === b) return true;
  if (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a))) return true;
  // praha / prague, nassr / nasr
  if (a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4)) return true;
  return false;
}

function scoreName(query: string, result: string) {
  const q = norm(query);
  const r = norm(result);
  if (!q || !r) return 0;
  if (q === r) return 1;
  if (r.startsWith(`${q} `) || r.endsWith(` ${q}`) || r.includes(` ${q} `)) return 0.92;
  if (q.length >= 6 && (r.startsWith(q) || q.startsWith(r))) return 0.86;
  const qt = tokens(q);
  const rt = tokens(r);
  if (!qt.size || !rt.size) return 0;

  let hit = 0;
  for (const t of qt) {
    if ([...rt].some((x) => tokenRelated(t, x))) hit += 1;
  }
  if (!hit) return 0;

  const onlyQ = [...qt].filter((t) => ![...rt].some((x) => tokenRelated(t, x)));
  const onlyR = [...rt].filter((t) => ![...qt].some((x) => tokenRelated(t, x)));
  // Subset is a match: "Cienciano" ⊂ "CS Cienciano", "Young Boys" ⊂ "BSC Young Boys"
  if (!onlyQ.length || !onlyR.length) {
    return hit / Math.max(qt.size, rt.size, 1) >= 0.99 ? 0.94 : 0.8;
  }
  return hit / Math.max(qt.size, rt.size);
}

function isYouth(label: string) {
  return YOUTH.test(label);
}

function clubby(title: string) {
  return /\b(f\.?c\.?|a\.?f\.?c\.?|s\.?c\.?|b\.?k\.?|club|united|city|athletic|sporting|football|soccer|deporte|atletico|calcio|sportverein)\b/i.test(
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

type SofaHit = {
  id: number;
  name: string;
  score: number;
  users: number;
};

async function searchSofa(q: string): Promise<SofaHit[]> {
  const res = await fetch(`https://img.sofascore.com/api/v1/search/all?q=${encodeURIComponent(q)}`, {
    headers: SB_HEADERS,
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    results?: {
      type?: string;
      entity?: {
        id?: number;
        name?: string;
        shortName?: string;
        sport?: { slug?: string; id?: number };
        userCount?: number;
      };
    }[];
  };
  const hits: SofaHit[] = [];
  for (const item of json.results ?? []) {
    if (item.type !== "team") continue;
    const e = item.entity ?? {};
    if (e.sport?.slug && e.sport.slug !== "football") continue;
    if (e.sport?.id && e.sport.id !== 1) continue;
    if (!e.id) continue;
    const label = String(e.name ?? "");
    if (isYouth(label) && !isYouth(q)) continue;
    const score = Math.max(scoreName(q, label), scoreName(q, String(e.shortName ?? "")));
    hits.push({ id: e.id, name: label, score, users: e.userCount ?? 0 });
  }
  return hits;
}

function leftoverPenalty(query: string, result: string, users: number) {
  const qt = tokens(query);
  const rt = tokens(result);
  const extra = [...rt].filter((t) => t.length >= 5 && ![...qt].some((x) => tokenRelated(t, x)));
  if (!extra.length) return 0;
  // "Argentinos Jrs Barueri" / youth academies — extra place-name, tiny audience
  if (users < 4000) return 0.55;
  return 0.12;
}

function pickHit(query: string, hits: SofaHit[]): SofaHit | null {
  if (!hits.length) return null;
  const ranked = hits
    .map((h) => ({ ...h, score: Math.max(0, h.score - leftoverPenalty(query, h.name, h.users)) }))
    .sort((a, b) => b.score - a.score || b.users - a.users);
  const top = ranked[0];
  if (top.score >= 0.55) {
    // Prefer the popular senior club when scores are close
    const popular = [...ranked].sort((a, b) => b.users - a.users)[0];
    if (popular.users >= top.users * 3 && popular.score >= top.score - 0.2 && popular.users >= 5000) {
      return popular;
    }
    return top;
  }
  const next = ranked[1];
  if (top.score >= 0.34 && top.users >= 1500 && (!next || top.users >= next.users * 1.8)) {
    return top;
  }
  const core = [...tokens(query)].filter((t) => t.length >= 5);
  if (core.length && core.every((t) => [...tokens(top.name)].some((x) => tokenRelated(t, x)))) {
    if (top.users >= 800) return top;
  }
  return null;
}

/** Official club badge from SofaScore search → team image. */
export async function sofascoreBadge(name: string): Promise<string | null> {
  try {
    const pooled: SofaHit[] = [];
    const seen = new Set<number>();
    for (const q of searchQueries(name)) {
      const hits = await searchSofa(q);
      for (const h of hits) {
        if (seen.has(h.id)) continue;
        seen.add(h.id);
        pooled.push(h);
      }
      const picked = pickHit(q, hits);
      // Strong clean hit — take it without extra round-trips
      if (picked && picked.score >= 0.8 && picked.users >= 2000) {
        return `https://img.sofascore.com/api/v1/team/${picked.id}/image`;
      }
    }
    const picked = pickHit(name, pooled);
    if (picked) return `https://img.sofascore.com/api/v1/team/${picked.id}/image`;
    return null;
  } catch {
    return null;
  }
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
  return src.replace(/\/\d+px-/, "/200px-");
}

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
        if (scoreTitle(q, title) < 0.55) continue;
        const src = await wikiSummaryImage(title);
        if (src) return src;
      }
    } catch {
      /* next query shape */
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

/** Same query you'd type into Google Images. Google itself is captcha-walled
 *  from servers, so we search Bing's image index and keep only official hosts. */
const IMAGE_HOST_OK =
  /upload\.wikimedia\.org|wikipedia\.org|img\.sofascore\.com|thesportsdb\.com|tmssl\.akamaized\.net|transfermarkt|seeklogo\.com/i;

async function webImageBadge(name: string): Promise<string | null> {
  if (typeof window !== "undefined") return null;
  try {
    const q = `${queryFor(name)} football club crest logo`;
    const res = await fetch(
      `https://www.bing.com/images/async?q=${encodeURIComponent(q)}&first=0&count=35&mmasync=1`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "text/html",
          "Accept-Language": "en-US,en;q=0.9",
        },
        signal: AbortSignal.timeout(14_000),
      },
    );
    if (!res.ok) return null;
    const html = await res.text();
    const entity = "&" + "quot;";
    const marker = "murl" + entity + ":" + entity;
    const urls: string[] = [];
    let from = 0;
    while (from < html.length) {
      const i = html.indexOf(marker, from);
      if (i < 0) break;
      const start = i + marker.length;
      const end = html.indexOf(entity, start);
      if (end < 0) break;
      const url = html.slice(start, end).replace(/&/g, "&");
      if (url.startsWith("http") && IMAGE_HOST_OK.test(url) && !urls.includes(url)) urls.push(url);
      from = end + entity.length;
    }
    return urls[0] ?? null;
  } catch {
    return null;
  }
}

/** SofaScore first on the server. In the browser, search is CORS-blocked. */
export async function findCrestOnline(name: string): Promise<string | null> {
  const canSearchSofa = typeof window === "undefined";
  if (canSearchSofa) {
    const fromSofa = await sofascoreBadge(name);
    if (fromSofa) return fromSofa;
  }
  const fromWiki = await wikiBadge(name);
  if (fromWiki) return fromWiki;
  const fromDb = await sportsDbBadge(name);
  if (fromDb) return fromDb;
  return webImageBadge(name);
}
