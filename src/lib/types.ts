export type Market = "1x2" | "total" | "btts";
export type OneXTwo = "home" | "draw" | "away";
export type PickResult = "won" | "lost" | "push";

export type FixtureTeam = {
  id: string;
  name: string;
  abbr: string;
  logo: string | null;
  ml: number | null;
  score?: number | null;
};

export type Fixture = {
  id: string;
  league: string;
  leagueSlug: string;
  start: string;
  venue: string;
  status: string;
  detail: string;
  live: boolean;
  home: FixtureTeam;
  away: FixtureTeam;
  drawMl: number | null;
  total: number | null;
  overOdds: string | null;
  underOdds: string | null;
};

export type Desk = {
  id: string;
  name: string;
  handle: string;
  desk: string;
  style: string;
  verified: boolean;
  bio: string;
};

export type Pick = {
  id: string;
  tipsterId: string;
  fixtureId: string;
  market: Market;
  selection: string;
  label: string;
  confidence: "lean" | "play" | "strong";
};

export type ConsensusItem = {
  id: string;
  fixture: Fixture;
  market: Market;
  selection: string;
  label: string;
  agree: Desk[];
  fade: Desk[];
  coverage: number;
  count: number;
  pct: number;
  rankScore: number;
};

export type RecordSlice = {
  n: number;
  won: number;
  lost: number;
  push: number;
  hit: number;
  units: number;
};

export type GradedPick = Pick & {
  result: PickResult;
  odds: number | null;
  units: number;
  withPack: boolean | null;
  fixture: Fixture;
};

export type DeskAccuracy = {
  tipster: Desk;
  overall: RecordSlice;
  markets: Record<Market, RecordSlice>;
  leagues: { league: string; rec: RecordSlice }[];
  withPack: RecordSlice;
  fade: RecordSlice;
  form: PickResult[];
  recent: GradedPick[];
};

export type SlatePayload = {
  date: string;
  dateLabel: string;
  fetchedAt: string;
  fixtures: Fixture[];
  picks: Pick[];
  consensus: ConsensusItem[];
  desks: Desk[];
};

export type LedgerPayload = {
  windowLabel: string;
  fetchedAt: string;
  sample: number;
  pack: {
    overall: RecordSlice;
    strong: RecordSlice;
    lean: RecordSlice;
  };
  desks: DeskAccuracy[];
};

/** @deprecated use Desk */
export type Tipster = Desk;
