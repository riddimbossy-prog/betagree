/** 22 tip desks. Keep in step with src/lib/live/engine.ts */

export const DESKS = [
  { id: "market", name: "Market", handle: "@market", desk: "Price", style: "Shortest posted 1X2 and total", verified: true, bio: "The book itself. Picks whatever price is shortest on the board." },
  { id: "form", name: "Form", handle: "@form", desk: "Last five", style: "Points from the last five settled matches", verified: true, bio: "3 for a win, 1 for a draw. Picks the side collecting more points." },
  { id: "attack", name: "Attack", handle: "@attack", desk: "Goals", style: "Expected goals from recent scoring and conceding", verified: true, bio: "Compares each side's recent goals for and against. Also posts the total and BTTS." },
  { id: "shield", name: "Shield", handle: "@shield", desk: "Defence", style: "Fewest goals conceded in the last five", verified: true, bio: "Trusts the tighter defence. Draws when the concession rates sit close." },
  { id: "pulse", name: "Pulse", handle: "@pulse", desk: "Momentum", style: "Points from the last three only", verified: true, bio: "Ignores older form. Reads the last three results as the live run." },
  { id: "poisson", name: "Poisson", handle: "@poisson", desk: "Model", style: "Independent Poisson on recent attack and defence", verified: true, bio: "Turns recent scoring rates into home / draw / away probabilities." },
  { id: "elo", name: "Elo", handle: "@elo", desk: "Rating", style: "Points plus goal difference, with a home nudge", verified: true, bio: "A simple rating from recent points and goal difference. Home gets a small edge." },
  { id: "fortress", name: "Fortress", handle: "@fortress", desk: "Home", style: "Home unless the away price is genuinely short", verified: true, bio: "Starts at home. Only flips when the away side is the clear posted favourite." },
  { id: "road", name: "Road", handle: "@road", desk: "Away", style: "Away sides that keep pace with home form", verified: true, bio: "Picks the visitors when their recent points sit close to or above the hosts." },
  { id: "value", name: "Value", handle: "@value", desk: "Price fade", style: "Fades a heavy favourite when form is close", verified: true, bio: "If the favourite is very short and recent points are tight, it takes the other side." },
  { id: "contrarian", name: "Contrarian", handle: "@contrarian", desk: "Fade", style: "Opposite of the posted favourite", verified: true, bio: "Always takes the other side of the market. The dissent desk." },
  { id: "line", name: "Line", handle: "@line", desk: "Totals", style: "Attack lean plus the over/under versus the posted line", verified: true, bio: "Same goal model as Attack, then posts the total against the listed line." },
  { id: "clean", name: "Clean", handle: "@clean", desk: "Sheets", style: "The side conceding less, and a BTTS lean", verified: true, bio: "Picks the sturdier defence. Posts BTTS no when both sides have been tight." },
  { id: "fire", name: "Fire", handle: "@fire", desk: "Scoring", style: "Higher recent goals-for, and overs when both attack", verified: true, bio: "Follows the sharper attack. Goes over when both sides have been scoring." },
  { id: "grit", name: "Grit", handle: "@grit", desk: "Unbeaten", style: "Wins plus draws over the last five", verified: true, bio: "Unbeaten rate, not just wins. Useful when a side keeps grinding results." },
  { id: "split", name: "Split", handle: "@split", desk: "Draws", style: "Draw when the two prices sit on top of each other", verified: true, bio: "If home and away are nearly the same price, it posts the draw. Otherwise the favourite." },
  { id: "banker", name: "Banker", handle: "@banker", desk: "Short price", style: "Only posts when the favourite is 55% implied or shorter", verified: true, bio: "Skips toss-ups. Only speaks when the posted favourite is genuinely short." },
  { id: "blend", name: "Blend", handle: "@blend", desk: "Pack", style: "Majority of Market, Form, and Attack", verified: true, bio: "Votes the three core desks and takes the side that wins the ballot." },
  { id: "both", name: "Both", handle: "@both", desk: "BTTS", style: "Both-teams-to-score from recent scoring rates", verified: true, bio: "Posts BTTS from how often each side has scored. 1X2 follows form." },
  { id: "run", name: "Run", handle: "@run", desk: "Streak", style: "Win rate over the last five", verified: true, bio: "Counts wins only — draws do not count. The streak desk." },
  { id: "bounce", name: "Bounce", handle: "@bounce", desk: "Reversal", style: "The worse recent form — a bounce play", verified: true, bio: "Takes the side that has been worse. Mean-reversion, not momentum." },
  { id: "cut", name: "Cut", handle: "@cut", desk: "Price cut", style: "Favourite only when implied is above 48%, else the draw", verified: true, bio: "Needs a real favourite. If nobody is short enough, it posts the draw." },
];

export function consensusBand(pct) {
  if (pct >= 0.7) return "high";
  if (pct >= 0.5) return "medium";
  return "low";
}

function implied(odds) {
  if (odds == null || !Number.isFinite(odds) || odds === 0) return 0;
  return odds < 0 ? -odds / (-odds + 100) : 100 / (odds + 100);
}

function parseAmerican(raw) {
  if (raw == null) return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).replace("+", "").trim());
  return Number.isFinite(n) && n !== 0 ? n : null;
}

function emptyForm() {
  return { pts: 0, gf: 0, ga: 0, n: 0, scored: 0, wins: 0, draws: 0, last3pts: 0, last3n: 0, last3gf: 0, last3ga: 0 };
}

export function buildTeamForm(history) {
  const games = new Map();
  for (const f of history) {
    if (f.home.score == null || f.away.score == null) continue;
    for (const id of [f.home.id, f.away.id]) {
      const arr = games.get(id) ?? [];
      arr.push(f);
      games.set(id, arr);
    }
  }
  const out = new Map();
  for (const [id, arr] of games) {
    const last = arr.slice(-5);
    const rec = emptyForm();
    last.forEach((f, i) => {
      const home = f.home.id === id;
      const gf = home ? f.home.score : f.away.score;
      const ga = home ? f.away.score : f.home.score;
      rec.n += 1;
      rec.gf += gf;
      rec.ga += ga;
      if (gf > 0) rec.scored += 1;
      if (gf > ga) {
        rec.pts += 3;
        rec.wins += 1;
      } else if (gf === ga) {
        rec.pts += 1;
        rec.draws += 1;
      }
      if (i >= last.length - 3) {
        rec.last3n += 1;
        rec.last3gf += gf;
        rec.last3ga += ga;
        if (gf > ga) rec.last3pts += 3;
        else if (gf === ga) rec.last3pts += 1;
      }
    });
    out.set(id, rec);
  }
  return out;
}

function favSide(f) {
  const h = implied(f.home.ml);
  const a = implied(f.away.ml);
  const d = implied(f.drawMl);
  if (h >= a && h >= d) return "home";
  if (a >= h && a >= d) return "away";
  return "draw";
}

function secondSide(f) {
  const ranks = [
    { side: "home", p: implied(f.home.ml) },
    { side: "away", p: implied(f.away.ml) },
    { side: "draw", p: implied(f.drawMl) },
  ].sort((x, y) => y.p - x.p);
  return ranks[1]?.side ?? "draw";
}

function label1x2(f, side) {
  if (side === "home") return `${f.home.name} to win`;
  if (side === "away") return `${f.away.name} to win`;
  return "Draw";
}

function fadeSide(side) {
  if (side === "home") return "away";
  if (side === "away") return "home";
  return "home";
}

function fact(n) {
  let x = 1;
  for (let i = 2; i <= n; i++) x *= i;
  return x;
}

function poissonP(lambda, k) {
  const l = Math.max(0.2, lambda);
  return Math.exp(-l) * l ** k / fact(k);
}

function poissonSide(homeExp, awayExp) {
  let ph = 0;
  let pd = 0;
  let pa = 0;
  for (let i = 0; i <= 6; i++) {
    for (let j = 0; j <= 6; j++) {
      const p = poissonP(homeExp, i) * poissonP(awayExp, j);
      if (i > j) ph += p;
      else if (i === j) pd += p;
      else pa += p;
    }
  }
  if (ph >= pd && ph >= pa) return "home";
  if (pa >= ph && pa >= pd) return "away";
  return "draw";
}

function context(f, form) {
  const h = form.get(f.home.id) ?? emptyForm();
  const a = form.get(f.away.id) ?? emptyForm();
  const hr = h.n ? h.pts / h.n : 0;
  const ar = a.n ? a.pts / a.n : 0;
  const hgf = h.n ? h.gf / h.n : 1;
  const agf = a.n ? a.gf / a.n : 1;
  const hga = h.n ? h.ga / h.n : 1;
  const aga = a.n ? a.ga / a.n : 1;
  const homeExp = hgf + aga;
  const awayExp = agf + hga;
  return {
    f, h, a, hr, ar, hgf, agf, hga, aga, homeExp, awayExp,
    totalExp: (homeExp + awayExp) / 2,
    hi: implied(f.home.ml),
    ai: implied(f.away.ml),
    di: implied(f.drawMl),
    fav: favSide(f),
    h3: h.last3n ? h.last3pts / h.last3n : hr,
    a3: a.last3n ? a.last3pts / a.last3n : ar,
    hWins: h.n ? h.wins / h.n : 0,
    aWins: a.n ? a.wins / a.n : 0,
    hUnb: h.n ? (h.wins + h.draws) / h.n : 0,
    aUnb: a.n ? (a.wins + a.draws) / a.n : 0,
    hSc: h.n ? h.scored / h.n : 0,
    aSc: a.n ? a.scored / a.n : 0,
    line: f.total ?? 2.5,
    hasForm: h.n >= 2 || a.n >= 2,
  };
}

function emit(id, f, made) {
  return made.map((p) => ({
    id: `${id}-${f.id}-${p.market}`,
    tipsterId: id,
    fixtureId: f.id,
    ...p,
  }));
}

function oneX(c, side, confidence = "play") {
  return { market: "1x2", selection: side, label: label1x2(c.f, side), confidence };
}

function ou(c, side, confidence = "play") {
  return { market: "total", selection: side, label: `${side === "over" ? "Over" : "Under"} ${c.line}`, confidence };
}

function btts(yes, confidence = "lean") {
  return { market: "btts", selection: yes ? "yes" : "no", label: yes ? "Both teams to score" : "BTTS — no", confidence };
}

function formSide(c, gap = 0.25) {
  if (c.hr > c.ar + gap) return "home";
  if (c.ar > c.hr + gap) return "away";
  return "draw";
}

function attackSide(c, gap = 0.35) {
  if (c.homeExp > c.awayExp + gap) return "home";
  if (c.awayExp > c.homeExp + gap) return "away";
  return "draw";
}

function rateSide(home, away, gap) {
  if (home > away + gap) return "home";
  if (away > home + gap) return "away";
  return "draw";
}

function pickFor(id, c) {
  const { f } = c;
  switch (id) {
    case "market": {
      const made = [oneX(c, c.hi || c.ai || c.di ? c.fav : "home", "strong")];
      if (f.total != null) {
        const over = parseAmerican(f.overOdds);
        const under = parseAmerican(f.underOdds);
        const side = under != null && over != null && implied(under) > implied(over) ? "under" : "over";
        made.push(ou(c, side));
      }
      return emit(id, f, made);
    }
    case "form":
      return emit(id, f, [oneX(c, formSide(c), Math.abs(c.hr - c.ar) > 0.6 ? "strong" : "play")]);
    case "attack":
      return emit(id, f, [oneX(c, attackSide(c)), ou(c, c.totalExp > c.line ? "over" : "under"), btts(c.hSc >= 0.6 && c.aSc >= 0.6)]);
    case "shield":
      return emit(id, f, [oneX(c, rateSide(-c.hga, -c.aga, 0.15))]);
    case "pulse":
      return emit(id, f, [oneX(c, rateSide(c.h3, c.a3, 0.2))]);
    case "poisson":
      return emit(id, f, [oneX(c, poissonSide(c.homeExp, c.awayExp))]);
    case "elo": {
      const homeR = c.hr * 3 + (c.hgf - c.hga) + 0.28;
      const awayR = c.ar * 3 + (c.agf - c.aga);
      return emit(id, f, [oneX(c, rateSide(homeR, awayR, 0.35))]);
    }
    case "fortress":
      return emit(id, f, [oneX(c, c.ai > 0.48 ? "away" : "home")]);
    case "road":
      if (!c.hasForm) return emit(id, f, [oneX(c, "away")]);
      return emit(id, f, [oneX(c, c.ar >= c.hr - 0.12 ? "away" : "home")]);
    case "value": {
      const heavy = Math.max(c.hi, c.ai, c.di) > 0.62;
      const close = !c.hasForm || Math.abs(c.hr - c.ar) < 0.4;
      return emit(id, f, [oneX(c, heavy && close ? secondSide(f) : c.fav)]);
    }
    case "contrarian":
      return emit(id, f, [oneX(c, fadeSide(c.fav), "lean")]);
    case "line":
      return emit(id, f, [oneX(c, attackSide(c)), ou(c, c.totalExp > c.line ? "over" : "under")]);
    case "clean":
      return emit(id, f, [oneX(c, rateSide(-c.hga, -c.aga, 0.12)), btts(!(c.hga < 1.1 && c.aga < 1.1))]);
    case "fire": {
      const made = [oneX(c, rateSide(c.hgf, c.agf, 0.2))];
      if (f.total != null) made.push(ou(c, c.hgf > 1.15 && c.agf > 1.15 ? "over" : "under"));
      return emit(id, f, made);
    }
    case "grit":
      return emit(id, f, [oneX(c, rateSide(c.hUnb, c.aUnb, 0.12))]);
    case "split":
      return emit(id, f, [oneX(c, Math.abs(c.hi - c.ai) < 0.1 ? "draw" : c.fav)]);
    case "banker":
      return emit(id, f, [oneX(c, c.fav, Math.max(c.hi, c.ai, c.di) < 0.55 ? "lean" : "strong")]);
    case "blend": {
      const votes = [c.fav, formSide(c), attackSide(c)];
      const tally = { home: 0, draw: 0, away: 0 };
      for (const v of votes) tally[v] += 1;
      const side = tally.home >= tally.away && tally.home >= tally.draw ? "home" : tally.away >= tally.draw ? "away" : "draw";
      return emit(id, f, [oneX(c, side)]);
    }
    case "both":
      return emit(id, f, [oneX(c, formSide(c)), btts(c.hSc >= 0.55 && c.aSc >= 0.55)]);
    case "run":
      return emit(id, f, [oneX(c, rateSide(c.hWins, c.aWins, 0.12))]);
    case "bounce":
      return emit(id, f, [oneX(c, rateSide(-c.hr, -c.ar, 0.15), "lean")]);
    case "cut":
      return emit(id, f, [oneX(c, Math.max(c.hi, c.ai, c.di) > 0.48 ? c.fav : "draw")]);
    default:
      return emit(id, f, [oneX(c, c.fav)]);
  }
}
  const { f } = c;
  switch (id) {
    case "market": {
      const made = [];
      if (f.home.ml != null || f.away.ml != null) made.push(oneX(c, c.fav, "strong"));
      if (f.total != null) {
        const over = parseAmerican(f.overOdds);
        const under = parseAmerican(f.underOdds);
        const side = under != null && over != null && implied(under) > implied(over) ? "under" : "over";
        made.push(ou(c, side));
      }
      return emit(id, f, made);
    }
    case "form":
      if (!c.hasForm) return [];
      return emit(id, f, [oneX(c, formSide(c), Math.abs(c.hr - c.ar) > 0.6 ? "strong" : "play")]);
    case "attack":
      if (!c.hasForm) return [];
      return emit(id, f, [oneX(c, attackSide(c)), ou(c, c.totalExp > c.line ? "over" : "under"), btts(c.hSc >= 0.6 && c.aSc >= 0.6)]);
    case "shield":
      if (!c.hasForm) return [];
      return emit(id, f, [oneX(c, rateSide(-c.hga, -c.aga, 0.15))]);
    case "pulse":
      if (!c.hasForm) return [];
      return emit(id, f, [oneX(c, rateSide(c.h3, c.a3, 0.2))]);
    case "poisson":
      if (!c.hasForm) return [];
      return emit(id, f, [oneX(c, poissonSide(c.homeExp, c.awayExp))]);
    case "elo": {
      if (!c.hasForm) return [];
      const homeR = c.hr * 3 + (c.hgf - c.hga) + 0.28;
      const awayR = c.ar * 3 + (c.agf - c.aga);
      return emit(id, f, [oneX(c, rateSide(homeR, awayR, 0.35))]);
    }
    case "fortress":
      return emit(id, f, [oneX(c, c.ai > 0.48 ? "away" : "home")]);
    case "road":
      if (!c.hasForm) return emit(id, f, [oneX(c, c.fav === "home" ? "away" : c.fav)]);
      return emit(id, f, [oneX(c, c.ar >= c.hr - 0.12 ? "away" : "home")]);
    case "value": {
      const heavy = Math.max(c.hi, c.ai, c.di) > 0.62;
      const close = Math.abs(c.hr - c.ar) < 0.4;
      return emit(id, f, [oneX(c, heavy && close ? secondSide(f) : c.fav)]);
    }
    case "contrarian":
      return emit(id, f, [oneX(c, fadeSide(c.fav), "lean")]);
    case "line":
      if (!c.hasForm) return [];
      return emit(id, f, [oneX(c, attackSide(c)), ou(c, c.totalExp > c.line ? "over" : "under")]);
    case "clean":
      if (!c.hasForm) return [];
      return emit(id, f, [oneX(c, rateSide(-c.hga, -c.aga, 0.12)), btts(!(c.hga < 1.1 && c.aga < 1.1))]);
    case "fire": {
      if (!c.hasForm) return [];
      const made = [oneX(c, rateSide(c.hgf, c.agf, 0.2))];
      if (f.total != null) made.push(ou(c, c.hgf > 1.15 && c.agf > 1.15 ? "over" : "under"));
      return emit(id, f, made);
    }
    case "grit":
      if (!c.hasForm) return [];
      return emit(id, f, [oneX(c, rateSide(c.hUnb, c.aUnb, 0.12))]);
    case "split":
      return emit(id, f, [oneX(c, Math.abs(c.hi - c.ai) < 0.1 ? "draw" : c.fav)]);
    case "banker":
      if (Math.max(c.hi, c.ai, c.di) < 0.55) return [];
      return emit(id, f, [oneX(c, c.fav, "strong")]);
    case "blend": {
      const votes = [c.fav, formSide(c), attackSide(c)];
      const tally = { home: 0, draw: 0, away: 0 };
      for (const v of votes) tally[v] += 1;
      const side = tally.home >= tally.away && tally.home >= tally.draw ? "home" : tally.away >= tally.draw ? "away" : "draw";
      return emit(id, f, [oneX(c, side)]);
    }
    case "both":
      if (!c.hasForm) return [];
      return emit(id, f, [oneX(c, formSide(c)), btts(c.hSc >= 0.55 && c.aSc >= 0.55)]);
    case "run":
      if (!c.hasForm) return [];
      return emit(id, f, [oneX(c, rateSide(c.hWins, c.aWins, 0.12))]);
    case "bounce":
      if (!c.hasForm) return [];
      return emit(id, f, [oneX(c, rateSide(-c.hr, -c.ar, 0.15), "lean")]);
    case "cut":
      return emit(id, f, [oneX(c, Math.max(c.hi, c.ai, c.di) > 0.48 ? c.fav : "draw")]);
    default:
      return [];
  }
}

export function buildPicks(fixtures, history) {
  const form = buildTeamForm(history);
  return fixtures.flatMap((f) => {
    const c = context(f, form);
    return DESKS.flatMap((d) => pickFor(d.id, c));
  });
}

export function buildConsensus(picks, fixtures) {
  const byId = Object.fromEntries(fixtures.map((f) => [f.id, f]));
  const groups = new Map();
  const coverage = new Map();
  for (const p of picks) {
    const g = `${p.fixtureId}|${p.market}|${p.selection}`;
    groups.set(g, [...(groups.get(g) ?? []), p]);
    const c = `${p.fixtureId}|${p.market}`;
    const set = coverage.get(c) ?? new Set();
    set.add(p.tipsterId);
    coverage.set(c, set);
  }
  const deskBy = Object.fromEntries(DESKS.map((d) => [d.id, d]));
  const items = [];
  for (const [key, group] of groups) {
    const [fixtureId, market] = key.split("|");
    const fixture = byId[fixtureId];
    if (!fixture) continue;
    const cov = coverage.get(`${fixtureId}|${market}`)?.size ?? group.length;
    if (cov < 2) continue;
    const agreeIds = new Set(group.map((g) => g.tipsterId));
    if (agreeIds.size < 2) continue;
    const posted = picks.filter((p) => p.fixtureId === fixtureId && p.market === market);
    const fade = DESKS.filter((d) => posted.some((p) => p.tipsterId === d.id) && !agreeIds.has(d.id));
    const agree = [...agreeIds].map((id) => deskBy[id]).filter(Boolean);
    const pct = agree.length / cov;
    items.push({
      id: key,
      fixture,
      market,
      selection: group[0].selection,
      label: group[0].label,
      agree,
      fade,
      coverage: cov,
      count: agree.length,
      pct,
      rankScore: agree.length * 12 + pct * 50 + (agree.length === cov ? 8 : 0),
      band: consensusBand(pct),
    });
  }
  const best = new Map();
  for (const item of items) {
    const k = `${item.fixture.id}|${item.market}`;
    const prev = best.get(k);
    if (!prev || item.count > prev.count || (item.count === prev.count && item.pct > prev.pct)) best.set(k, item);
  }
  return [...best.values()].sort((a, b) => b.rankScore - a.rankScore || b.pct - a.pct);
}

export function assembleSlate(day, fixtures, history) {
  const picks = buildPicks(fixtures, history);
  const consensus = buildConsensus(picks, fixtures);
  return {
    date: day.toISOString().slice(0, 10),
    dateLabel: day.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
    fetchedAt: new Date().toISOString(),
    fixtures,
    picks,
    consensus,
    desks: DESKS,
  };
}

function emptyRec() {
  return { n: 0, won: 0, lost: 0, push: 0, hit: 0, units: 0 };
}

function add(rec, result) {
  rec.n += 1;
  if (result === "won") rec.won += 1;
  else if (result === "lost") rec.lost += 1;
  else rec.push += 1;
  const decided = rec.won + rec.lost;
  rec.hit = decided ? rec.won / decided : 0;
}

function gradePick(p, f) {
  const hs = f.home.score;
  const as = f.away.score;
  if (hs == null || as == null) return null;
  if (p.market === "1x2") {
    const out = hs > as ? "home" : as > hs ? "away" : "draw";
    return p.selection === out ? "won" : "lost";
  }
  if (p.market === "total") {
    if (f.total == null) return null;
    const goals = hs + as;
    if (goals === f.total) return "push";
    const over = goals > f.total;
    return (p.selection === "over" ? over : !over) ? "won" : "lost";
  }
  const hit = hs > 0 && as > 0;
  return (p.selection === "yes" ? hit : !hit) ? "won" : "lost";
}

function sliceOf(rows) {
  const rec = emptyRec();
  for (const r of rows) add(rec, r.result);
  return rec;
}

export function gradeLedger(history) {
  const sorted = [...history].sort((a, b) => +new Date(a.start) - +new Date(b.start));
  const picks = [];
  for (let i = 0; i < sorted.length; i++) {
    picks.push(...buildPicks([sorted[i]], sorted.slice(0, i)));
  }
  const consensus = buildConsensus(picks, history);
  const packMap = new Map(consensus.map((c) => [`${c.fixture.id}|${c.market}`, c]));
  const graded = [];
  for (const p of picks) {
    const f = history.find((x) => x.id === p.fixtureId);
    if (!f) continue;
    const result = gradePick(p, f);
    if (!result) continue;
    const pack = packMap.get(`${p.fixtureId}|${p.market}`);
    graded.push({
      ...p,
      result,
      odds: null,
      units: 0,
      withPack: pack ? pack.selection === p.selection : null,
      fixture: f,
    });
  }
  graded.sort((a, b) => +new Date(b.fixture.start) - +new Date(a.fixture.start));
  const desks = DESKS.map((tipster) => {
    const mine = graded.filter((p) => p.tipsterId === tipster.id);
    return {
      tipster,
      overall: sliceOf(mine),
      markets: {
        "1x2": sliceOf(mine.filter((p) => p.market === "1x2")),
        total: sliceOf(mine.filter((p) => p.market === "total")),
        btts: sliceOf(mine.filter((p) => p.market === "btts")),
      },
      leagues: [],
      withPack: sliceOf(mine.filter((p) => p.withPack === true)),
      fade: sliceOf(mine.filter((p) => p.withPack === false)),
      form: mine.filter((p) => p.market === "1x2").slice(0, 12).map((p) => p.result),
      recent: mine.filter((p) => p.market === "1x2").slice(0, 12),
    };
  }).sort((a, b) => b.overall.hit - a.overall.hit);

  const pack = { overall: emptyRec(), strong: emptyRec(), lean: emptyRec() };
  for (const item of consensus.filter((c) => c.market === "1x2")) {
    const result = gradePick({ market: "1x2", selection: item.selection }, item.fixture);
    if (!result) continue;
    add(pack.overall, result);
    if (item.pct >= 0.7) add(pack.strong, result);
    else add(pack.lean, result);
  }

  const first = history[0]?.start;
  const last = history[history.length - 1]?.start;
  return {
    windowLabel:
      first && last
        ? `${new Date(first).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })} – ${new Date(last).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`
        : "Last 21 days",
    fetchedAt: new Date().toISOString(),
    sample: history.length,
    pack,
    desks,
  };
}

