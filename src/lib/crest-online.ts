function norm(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const SEARCH_ALIAS: Record<string, string> = {
  "man city": "Manchester City",
  "man utd": "Manchester United",
  "man united": "Manchester United",
  psg: "Paris Saint-Germain",
  inter: "Inter Milan",
  porto: "FC Porto",
  celtic: "Celtic FC",
  rangers: "Rangers FC",
  "casa pia lisbon": "Casa Pia",
  "fenerbahce istanbul": "Fenerbahce",
  "saint etienne": "Saint-Etienne",
  "st mirren fc": "St Mirren",
  "st johnstone fc": "St Johnstone",
  "cd guadalajara": "CD Guadalajara",
  "club tijuana de caliente": "Club Tijuana",
  "psv eindhoven": "PSV",
  "fh hafnarfjordur": "FH Hafnarfjordur",
  honefoss: "Honefoss",
  "stjordals blink": "Stjordals-Blink",
  "utc cajamarca": "UTC Cajamarca",
  "tromso w": "Tromso women",
  monza: "AC Monza",
  "ac monza": "AC Monza",
  "club brugge": "Club Brugge KV",
  "cercle brugge": "Cercle Brugge KSV",
};

function queryFor(name: string) {
  return SEARCH_ALIAS[norm(name)] ?? name.replace(/\s+W$/i, " women");
}

function soccerTeam(team: Record<string, unknown> | null | undefined) {
  if (!team) return false;
  const sport = String(team.strSport ?? "").toLowerCase();
  return sport === "soccer" || sport === "football" || !sport;
}

export async function sportsDbBadge(name: string): Promise<string | null> {
  const q = queryFor(name);
  try {
    const res = await fetch(
      `https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=${encodeURIComponent(q)}`,
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

function clubby(title: string) {
  return /\b(f\.?c\.?|a\.?f\.?c\.?|b\.?k\.?|club|united|city|athletic|sporting|football|soccer|deporte|atletico)\b/i.test(
    title,
  );
}

export async function wikiBadge(name: string): Promise<string | null> {
  const q = queryFor(name);
  try {
    const search = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=6&namespace=0&format=json&origin=*`,
    );
    if (!search.ok) return null;
    const data = (await search.json()) as [string, string[], string[], string[]];
    const titles = data[1] ?? [];
    const title =
      titles.find((t) => clubby(t) && !/airport|church|station|scandal|lasso|film|album/i.test(t)) ??
      titles.find((t) => !/airport|church|station|scandal|lasso|film|album/i.test(t)) ??
      titles[0];
    if (!title) return null;
    const sum = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    );
    if (!sum.ok) return null;
    const page = (await sum.json()) as { originalimage?: { source?: string }; thumbnail?: { source?: string } };
    const src = page.originalimage?.source ?? page.thumbnail?.source;
    if (!src || /flag_of|map_of|locator|coat_of_arms_of_[a-z]+(?:_and)?\.svg/i.test(src)) return null;
    return src;
  } catch {
    return null;
  }
}

export async function findCrestOnline(name: string): Promise<string | null> {
  const fromDb = await sportsDbBadge(name);
  if (fromDb) return fromDb;
  return wikiBadge(name);
}
