function formSide(c: Ctx, gap = 0.25): Side {
  if (c.hr > c.ar + gap) return "home";
  if (c.ar > c.hr + gap) return "away";
  return "draw";
}

function attackSide(c: Ctx, gap = 0.35): Side {
  if (c.homeExp > c.awayExp + gap) return "home";
  if (c.awayExp > c.homeExp + gap) return "away";
  return "draw";
}

function rateSide(home: number, away: number, gap: number): Side {
  if (home > away + gap) return "home";
  if (away > home + gap) return "away";
  return "draw";
}

function priced(c: Ctx) {
  return c.hi > 0 || c.ai > 0 || c.di > 0;
}

/** Spread form desks when a match has no history, so extras land Low instead of a fake Draw pile-up. */
const NO_FORM: Record<string, Side> = {
  form: "home",
  attack: "away",
  shield: "draw",
  pulse: "home",
  poisson: "away",
  elo: "draw",
  line: "home",
  clean: "away",
  fire: "draw",
  grit: "home",
  blend: "away",
  both: "draw",
  run: "home",
  bounce: "away",
};

function lean(id: string, c: Ctx, modeled: Side): Side {
  if (c.hasForm) return modeled;
  if (priced(c)) {
    if (id === "bounce") return fadeSide(c.fav);
    return c.fav;
  }
  return NO_FORM[id] ?? "draw";
}

function pickFor(id: string, c: Ctx): Pick[] {
  const { f } = c;
  switch (id) {
    case "market": {
      const made: Made[] = [oneX(c, priced(c) ? c.fav : "home", "strong")];
      if (f.total != null) {
        const over = parseAmerican(f.overOdds);
        const under = parseAmerican(f.underOdds);
        const side = under != null && over != null && implied(under) > implied(over) ? "under" : "over";
        made.push(ou(c, side));
      }
      return emit(id, f, made);
    }
    case "form":
      return emit(id, f, [oneX(c, lean(id, c, formSide(c)), Math.abs(c.hr - c.ar) > 0.6 ? "strong" : "play")]);
    case "attack":
      return emit(id, f, [
        oneX(c, lean(id, c, attackSide(c))),
        ou(c, c.totalExp > c.line ? "over" : "under"),
        btts(c.hSc >= 0.6 && c.aSc >= 0.6),
      ]);
    case "shield":
      return emit(id, f, [oneX(c, lean(id, c, rateSide(-c.hga, -c.aga, 0.15)))]);
    case "pulse":
      return emit(id, f, [oneX(c, lean(id, c, rateSide(c.h3, c.a3, 0.2)), "play")]);
    case "poisson":
      return emit(id, f, [oneX(c, lean(id, c, poissonSide(c.homeExp, c.awayExp)), "play")]);
    case "elo": {
      const homeR = c.hr * 3 + (c.hgf - c.hga) + 0.28;
      const awayR = c.ar * 3 + (c.agf - c.aga);
      return emit(id, f, [oneX(c, lean(id, c, rateSide(homeR, awayR, 0.35)))]);
    }
    case "fortress":
      return emit(id, f, [oneX(c, c.ai > 0.48 ? "away" : "home", "play")]);
    case "road":
      if (!c.hasForm) return emit(id, f, [oneX(c, "away")]);
      return emit(id, f, [oneX(c, c.ar >= c.hr - 0.12 ? "away" : "home")]);
    case "value": {
      const heavy = Math.max(c.hi, c.ai, c.di) > 0.62;
      const close = !c.hasForm || Math.abs(c.hr - c.ar) < 0.4;
      const side = heavy && close ? secondSide(f) : c.fav;
      return emit(id, f, [oneX(c, priced(c) ? side : "home")]);
    }
    case "contrarian":
      return emit(id, f, [oneX(c, fadeSide(priced(c) ? c.fav : "home"), "lean")]);
    case "line":
      return emit(id, f, [oneX(c, lean(id, c, attackSide(c))), ou(c, c.totalExp > c.line ? "over" : "under")]);
    case "clean":
      return emit(id, f, [
        oneX(c, lean(id, c, rateSide(-c.hga, -c.aga, 0.12))),
        btts(!(c.hga < 1.1 && c.aga < 1.1)),
      ]);
    case "fire": {
      const made: Made[] = [oneX(c, lean(id, c, rateSide(c.hgf, c.agf, 0.2)))];
      if (f.total != null) made.push(ou(c, c.hgf > 1.15 && c.agf > 1.15 ? "over" : "under"));
      return emit(id, f, made);
    }
    case "grit":
      return emit(id, f, [oneX(c, lean(id, c, rateSide(c.hUnb, c.aUnb, 0.12)))]);
    case "split":
      return emit(id, f, [oneX(c, priced(c) && Math.abs(c.hi - c.ai) < 0.1 ? "draw" : priced(c) ? c.fav : "draw")]);
    case "banker": {
      const p = Math.max(c.hi, c.ai, c.di);
      if (!priced(c) || p < 0.55) return emit(id, f, [oneX(c, priced(c) ? c.fav : "home", "lean")]);
      return emit(id, f, [oneX(c, c.fav, "strong")]);
    }
    case "blend": {
      if (!c.hasForm) return emit(id, f, [oneX(c, lean(id, c, c.fav), "play")]);
      const votes = [c.fav, formSide(c), attackSide(c)];
      const tally = { home: 0, draw: 0, away: 0 };
      for (const v of votes) tally[v] += 1;
      const side: Side =
        tally.home >= tally.away && tally.home >= tally.draw
          ? "home"
          : tally.away >= tally.draw
            ? "away"
            : "draw";
      return emit(id, f, [oneX(c, side, "play")]);
    }
    case "both":
      return emit(id, f, [oneX(c, lean(id, c, formSide(c))), btts(c.hSc >= 0.55 && c.aSc >= 0.55)]);
    case "run":
      return emit(id, f, [oneX(c, lean(id, c, rateSide(c.hWins, c.aWins, 0.12)))]);
    case "bounce":
      return emit(id, f, [oneX(c, lean(id, c, rateSide(-c.hr, -c.ar, 0.15)), "lean")]);
    case "cut": {
      const p = Math.max(c.hi, c.ai, c.di);
      return emit(id, f, [oneX(c, priced(c) && p > 0.48 ? c.fav : "draw")]);
    }
    default:
      return emit(id, f, [oneX(c, c.fav)]);
  }
}