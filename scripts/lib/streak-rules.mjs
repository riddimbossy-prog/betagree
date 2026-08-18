export const TWO_YES = { from: 1.19, to: 1.4 };
export const THREE_AVG = { from: 1.9, to: 2.1 };
export const OPP_PPG_MAX = 1.2;

const YOUTH =
  /\b(women|ladies|femenil|feminine|u1[5-9]|u2[0-3]|reserve|reserves|youth|junior|jong|ii|iii|next pro|srl|esport|e-sport|virtual|sim|amateur|academy|akatemia)\b/;

export function inBand(n, band) {
  return Number.isFinite(n) && n >= band.from && n <= band.to;
}

export function isSeniorName(...parts) {
  const key = String(parts.filter(Boolean).join(" "))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return !YOUTH.test(key);
}

export function dayBucket(iso, now = Date.now()) {
  const start = new Date(iso).toISOString().slice(0, 10);
  const today = new Date(now).toISOString().slice(0, 10);
  const tomorrow = new Date(now + 86_400_000).toISOString().slice(0, 10);
  if (start === today) return "today";
  if (start === tomorrow) return "tomorrow";
  return "later";
}

export function weekKey(now = Date.now()) {
  const d = new Date(now);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - day + 1);
  return d.toISOString().slice(0, 10);
}

export function inCurrentWeek(iso, now = Date.now()) {
  const start = weekKey(now);
  const end = new Date(new Date(start + "T00:00:00Z").getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
  const day = new Date(iso).toISOString().slice(0, 10);
  return day >= start && day < end;
}

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function scoringHeat(profile) {
  if (!profile || profile.n < 6) return "mid";
  const over = profile.over25?.rate ?? 0;
  const two = profile.twoPlus?.rate ?? 0;
  const gpg = profile.gpg ?? 0;
  if (over >= 0.6 || two >= 0.75 || gpg >= 3) return "hot";
  if (over < 0.45 || gpg < 2.35) return "cold";
  return "mid";
}

/** Low-scoring / tight leagues fail Over 2.5. Quiet 2+ leagues fail 2+. Unknown stays in. */
export function leagueAllows(profile, market) {
  if (!profile || profile.n < 6) return true;
  const over = profile.over25?.rate ?? 0;
  const two = profile.twoPlus?.rate ?? 0;
  const gpg = profile.gpg ?? 0;
  const stdev = profile.stdev ?? 0;
  if (market === "2+") return two >= 0.56 || gpg >= 2.5;
  if (stdev > 0 && stdev < 1.25 && gpg < 2.5) return false;
  return over >= 0.5 || gpg >= 2.65;
}

export function leagueBoost(profile, market) {
  if (!profile || profile.n < 6) return 0;
  const heat = scoringHeat(profile);
  const gpg = profile.gpg ?? 2.7;
  const stdev = profile.stdev ?? 1.5;
  if (market === "2+") {
    return (profile.twoPlus.rate - 0.65) + (gpg - 2.7) * 0.12 + (heat === "hot" ? 0.12 : heat === "cold" ? -0.2 : 0);
  }
  return (profile.over25.rate - 0.52) + (stdev - 1.45) * 0.08 + (heat === "hot" ? 0.1 : heat === "cold" ? -0.25 : 0);
}

export function findLeagueProfile(profiles, { slug, league } = {}) {
  const list = Array.isArray(profiles) ? profiles : [];
  if (slug) {
    const hit = list.find((p) => p.slug === slug);
    if (hit) return hit;
  }
  const key = norm(league);
  if (!key) return null;
  return (
    list.find((p) => norm(p.name) === key) ||
    list.find((p) => key.includes(norm(p.name)) || norm(p.name).includes(key)) ||
    null
  );
}

export function weeklyScore(pick, profile) {
  const league = leagueBoost(profile, pick.market);
  if (pick.market === "2+") {
    const ppg = Number(pick.oppPpg);
    return (1.4 - pick.odds) * 2 + (Number.isFinite(ppg) ? 1.2 - ppg : 0) + league;
  }
  return 1.2 - Math.abs((pick.odds ?? 2) - 1.75) + league;
}

export function rankWeekly(picks, limit = 10, profiles = []) {
  return [...picks]
    .filter((p) => inCurrentWeek(p.kickoff))
    .sort((a, b) => {
      const pa = findLeagueProfile(profiles, { slug: a.leagueSlug, league: a.league });
      const pb = findLeagueProfile(profiles, { slug: b.leagueSlug, league: b.league });
      return weeklyScore(b, pb) - weeklyScore(a, pa) || a.odds - b.odds;
    })
    .slice(0, limit);
}
