import type { ConsensusItem, Desk, Fixture, Pick, SlatePayload } from "@/lib/types";

export function slimSlate(slate: SlatePayload): SlatePayload {
  const desks = slate.desks ?? [];
  return {
    ...slate,
    picks: [],
    consensus: (slate.consensus ?? []).map((item) => slimConsensus(item)),
    desks: desks.map(slimDesk),
  };
}

function slimDesk(desk: Desk): Desk {
  return {
    id: desk.id,
    name: desk.name,
    handle: desk.handle,
    desk: desk.desk,
    style: desk.style,
    verified: desk.verified,
    bio: "",
  };
}

function slimConsensus(item: ConsensusItem): ConsensusItem {
  const fixture = item.fixture;
  return {
    ...item,
    fixture: fixture
      ? ({
          id: fixture.id,
          league: fixture.league,
          leagueSlug: fixture.leagueSlug,
          start: fixture.start,
          venue: "",
          status: fixture.status,
          detail: fixture.detail,
          live: fixture.live,
          home: slimTeam(fixture.home),
          away: slimTeam(fixture.away),
          drawMl: fixture.drawMl,
          total: fixture.total,
          overOdds: null,
          underOdds: null,
        } as Fixture)
      : fixture,
    agree: (item.agree ?? []).map((d) => ({ id: d.id } as Desk)),
    fade: (item.fade ?? []).map((d) => ({ id: d.id } as Desk)),
  };
}

function slimTeam(team: Fixture["home"]) {
  return {
    id: team.id,
    name: team.name,
    abbr: team.abbr,
    logo: team.logo,
    ml: team.ml,
    score: team.score,
  };
}

export function hydrateSlate(slate: SlatePayload): SlatePayload {
  const byFixture = new Map((slate.fixtures ?? []).map((f) => [f.id, f]));
  const byDesk = new Map((slate.desks ?? []).map((d) => [d.id, d]));
  return {
    ...slate,
    consensus: (slate.consensus ?? []).map((item) => {
      const full = item.fixture?.id ? byFixture.get(item.fixture.id) : null;
      return {
        ...item,
        fixture: full ?? item.fixture,
        agree: (item.agree ?? []).map((d) => byDesk.get(d.id) ?? d).filter(Boolean),
        fade: (item.fade ?? []).map((d) => byDesk.get(d.id) ?? d).filter(Boolean),
      };
    }),
  };
}

export function picksPayload(picks: Pick[], date: string) {
  return { date, picks };
}
