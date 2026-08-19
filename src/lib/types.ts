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
  | "over15"
  | "over25"
  | "over35"
  | "under15"
  | "under25"
  | "under35"
  | "gg"
  | "ng"
  | "ht_over05"
  | "ht_under05"
  | "ht_over15"
  | "ht_under15"
  | "ht_gg";

export type TrendNote = {
  source: DeskSource;
  rate: number;
  sample: number;
  odds: number | null;
};

export type TrendPick = {
  id: string;
  category: TrendCategory;
  home: string;
  away: string;
  team: string;
  opponent: string;
  league: string;
  kickoff: string | null;
  kickoffIso: string | null;
  selection: string;
  label: string;
  market: string;
  odds: number | null;
  rate: number;
  sample: number;
  statLabel: string;
  sources: DeskSource[];
  sourceNotes: TrendNote[];
  fixtureId: string | null;
  homeLogo: string | null;
  awayLogo: string | null;
  url?: string;
  agreed?: DeskSource[];
  last5?: {
    home: { results: string[]; winRate: number; ou: Record<string, { over: number; under: number; n: number }>; htOu?: Record<string, { over: number; under: number; n: number }>; bttsRate: number; htBttsRate?: number; n: number };
    away: { results: string[]; winRate: number; ou: Record<string, { over: number; under: number; n: number }>; htOu?: Record<string, { over: number; under: number; n: number }>; bttsRate: number; htBttsRate?: number; n: number };
    homeHome?: { results: string[]; winRate: number; ou: Record<string, { over: number; under: number; n: number }>; htOu?: Record<string, { over: number; under: number; n: number }>; bttsRate: number; htBttsRate?: number; n: number } | null;
    awayAway?: { results: string[]; winRate: number; ou: Record<string, { over: number; under: number; n: number }>; htOu?: Record<string, { over: number; under: number; n: number }>; bttsRate: number; htBttsRate?: number; n: number } | null;
    h2h: { results: string[]; ou: Record<string, { over: number; under: number; n: number }>; n: number } | null;
    table?: {
      size: number;
      home: { rank: number; pts?: number; gp?: number; ppg?: number | null } | null;
      away: { rank: number; pts?: number; gp?: number; ppg?: number | null } | null;
      homeHome?: { rank: number } | null;
      awayAway?: { rank: number } | null;
    } | null;
    agree: { line: number; side: string; home: number; away: number; h2h: number | null; rate: number; split?: boolean }[];
  } | null;
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

export type BankerRuleId =
  | "HOME_STRAIGHT_WIN"
  | "AWAY_TEAM_NOT_TO_WIN"
  | "AWAY_STRENGTH_OVER15"
  | "BALANCED_HIGH_SCORING_OVER25"
  | "BALANCED_LOW_SCORING_OVER15";

export type BankerMetrics = {
  played: number;
  ready: boolean;
  ppg: number | null;
  avgGF: number | null;
  avgGA: number | null;
  winRate: number | null;
  drawRate: number | null;
  lossRate: number | null;
  record: string;
};

export type BankerLeagueProfile = {
  class: "high-scoring" | "low-scoring-draw-heavy" | "neutral" | "insufficient" | string;
  matches: number;
  avgGoals: number | null;
  drawRate: number | null;
  over25Rate: number | null;
};

export type BankerRulePick = {
  fixtureId: string;
  league: string;
  country?: string;
  kickoff: string;
  home: string;
  away: string;
  homeLogo: string | null;
  awayLogo: string | null;
  kind?: "win" | "not-win" | "over25" | "over15" | string;
  rule?: BankerRuleId | string;
  market: string;
  selection: string;
  label?: string;
  displaySelection?: string;
  priority?: number;
  reasons?: string[];
  ruleMeta?: Record<string, unknown>;
  alsoQualified?: string[];
  metrics?: { home: BankerMetrics; away: BankerMetrics; league: BankerLeagueProfile };
  homeSplit?: { position?: number; size?: number } | null;
  awaySplit?: { position?: number; size?: number } | null;
  engine?: string;
};

export type BankersPayload = {
  date: string;
  dateLabel: string;
  fetchedAt: string;
  engine?: string;
  scanned?: number;
  analyzed?: number;
  picks: BankerRulePick[];
  meta?: { engine?: string; count?: number; skips?: Record<string, number> };
};

export type TrendsPayload = {
  date: string;
  dateLabel: string;
  fetchedAt: string;
  minRate?: number;
  oddsFrom?: number;
  oddsTo?: number;
  sources?: DeskSource[];
  counts: Record<string, number>;
  categories: Record<TrendCategory, TrendPick[]>;
  teams?: TrendTeam[];
  bankers: (TrendPick & { agreed?: DeskSource[] })[];
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
  kickoff?: string | null;
  boardLabel?: string | null;
  boardMarket?: string | null;
  boardSelection?: string | null;
  band?: ConsensusBand | null;
  pct?: number | null;
  tipCount?: number | null;
  coverage?: number | null;
  settle?: "won" | "lost" | "pending" | null;
  homeLogo?: string | null;
  awayLogo?: string | null;
  homeForm?: string | null;
  awayForm?: string | null;
  why?: string | null;
  price?: number | null;
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
  leagueSlug?: string | null;
  category: string;
  kickoff: string;
  when?: "today" | "tomorrow" | "later";
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
  scoring?: {
    heat: "hot" | "mid" | "cold";
    gpg?: number;
    stdev?: number;
    over25?: number;
    twoPlus?: number;
  } | null;
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
  weekOf?: string;
  readyFor?: "today" | "tomorrow" | "later";
  droppedYouth?: number;
  counts: { twoYes: number; threeNo: number; today?: number; tomorrow?: number; weekly?: number };
  twoYes: StreakPick[];
  threeNo: StreakPick[];
  weekly?: StreakPick[];
  accuracy?: StreakAccuracy;
};

export type StreakAccuracyRate = { n: number; hits: number; rate: number };

export type StreakAccuracy = {
  fetchedAt: string;
  windowDays: number;
  from: string;
  to: string;
  sample: number;
  twoPlus: StreakAccuracyRate;
  twoPlusClear?: StreakAccuracyRate;
  over25: StreakAccuracyRate;
  rule2: StreakAccuracyRate;
  ruleOver: StreakAccuracyRate;
  leagues: Array<{
    name: string;
    slug?: string;
    n: number;
    gpg?: number;
    stdev?: number;
    cv?: number;
    heat?: "hot" | "mid" | "cold";
    allow2?: boolean;
    allowOver?: boolean;
    twoPlus: StreakAccuracyRate;
    over25: StreakAccuracyRate;
    rule2: StreakAccuracyRate;
    ruleOver: StreakAccuracyRate;
  }>;
};
