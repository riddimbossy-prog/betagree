export function slimSlate(slate) {
  return {
    ...slate,
    picks: [],
    consensus: (slate.consensus ?? []).map((item) => ({
      ...item,
      fixture: item.fixture
        ? {
            id: item.fixture.id,
            league: item.fixture.league,
            leagueSlug: item.fixture.leagueSlug,
            start: item.fixture.start,
            venue: "",
            status: item.fixture.status,
            detail: item.fixture.detail,
            live: item.fixture.live,
            home: slimTeam(item.fixture.home),
            away: slimTeam(item.fixture.away),
            drawMl: item.fixture.drawMl,
            total: item.fixture.total,
            overOdds: null,
            underOdds: null,
          }
        : item.fixture,
      agree: (item.agree ?? []).map((d) => ({ id: d.id })),
      fade: (item.fade ?? []).map((d) => ({ id: d.id })),
    })),
    desks: (slate.desks ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      handle: d.handle,
      desk: d.desk,
      style: d.style,
      verified: d.verified,
      bio: "",
    })),
  };
}

function slimTeam(team) {
  if (!team) return team;
  return {
    id: team.id,
    name: team.name,
    abbr: team.abbr,
    logo: team.logo,
    ml: team.ml,
    score: team.score,
  };
}
