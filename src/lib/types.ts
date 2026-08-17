export type Market = "1x2" | "total" | "btts";
export type OneXTwo = "home" | "draw" | "away";
export type PickResult = "won" | "lost" | "push";
export type ConsensusBand = "high" | "medium" | "low";

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
  source?: "board" | "extra";
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
  band: ConsensusBand;
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

export type DeskSource = "form" | "odds";

export type TrendCategory =
  | "wins"
  | "losses"
  | "winless"
  | "undefeated"
  | "over25"
  | "under25"
  | "gg";

export type TrendNote = {
  source: DeskSource;
  rate: number;
  sample: number;
  odds: number | null;
};

export type TrendTeam = {
  id: string;
  name: string;
  logo: string | null;
  league: string;
  leagueSlug: string;
  category: TrendCategory;
  count: number;
  notes: TrendNote[];
  fixtureId: string | null;
};

export type BankerPick = {
  id: string;
  fixtureId: string;
  label: string;
  market: Market;
  selection: string;
  odds: number | null;
  confidence: number;
};

export type TrendsPayload = {
  date: string;
  dateLabel: string;
  fetchedAt: string;
  counts: Record<string, number>;
  teams: TrendTeam[];
  bankers: BankerPick[];
  games: number;
};

export type FormPole = "most" | "least";
export type FormMetric = "wins" | "draws" | "losses" | "scored" | "conceded";
export type FormVenue = "overall" | "home" | "away";

export type FormRow = {
  rank: number;
  team: string;
  league: string;
  count: number;
  matches: number;
  rate: number | null;
  display: string;
  valueKind: "pct" | "avg";
  playingToday: boolean;
  tipPath: string | null;
  teamPath: string | null;
  logo: string | null;
  fixtureId: string | null;
  opponent: string | null;
};

export type FormBoard = {
  id: string;
  pole: FormPole;
  metric: FormMetric;
  path: string;
  title: string;
  unit: string;
  valueKind: "pct" | "avg";
  overall: FormRow[];
  home: FormRow[];
  away: FormRow[];
};

export type FormPayload = {
  date: string;
  dateLabel: string;
  fetchedAt: string;
  source: "form";
  playingToday: number;
  boards: Record<string, FormBoard>;
};

export type StreakPole = "top" | "bottom";

export type StreakTableSide = {
  rank: number;
  pole: StreakPole | null;
  pts: number | null;
  gp: number | null;
};

export type StreakPick = {
  id: string;
  gameId: string | null;
  league: string;
  category: string;
  kickoff: string;
  home: string;
  away: string;
  homeLogo: string | null;
  awayLogo: string | null;
  favorite: string;
  favoriteSide: "home" | "away" | null;
  favoriteOdds: number;
  homeOdds: number | null;
  awayOdds: number | null;
  drawOdds: number | null;
  table: {
    size: number;
    home: StreakTableSide | null;
    away: StreakTableSide | null;
  };
  market: "2+" | "3+";
  pick: "Yes" | "No" | "Over";
  label: string;
  odds: number;
  otherOdds: number | null;
  /** Opponent of favorite points-per-game (2+ rule). */
  oppPpg?: number | null;
  /** Raw 3+ Yes / No used for the Over 2.5 average. */
  streakYes?: number | null;
  streakNo?: number | null;
};

export type StreaksPayload = {
  date: string;
  dateLabel: string;
  fetchedAt: string;
  source: "sportybet";
  filters: {
    twoYes: { from: number; to: number };
    threeAvg?: { from: number; to: number };
    threeNo?: { from: number; to: number };
    favorite?: { from: number; to: number };
    opponentPpgMax?: number;
    threeMarket?: string;
    twoRule?: string;
    threeRule?: string;
    table?: string;
    horizonDays: number;
  };
  scanned: number;
  withStreaks: number;
  counts: { twoYes: number; threeNo: number };
  twoYes: StreakPick[];
  threeNo: StreakPick[];
};
