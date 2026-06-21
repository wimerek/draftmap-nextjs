import type { Player } from './sheets';
import type { DisplaySeasonRow } from './scoring';
import { scoutToInches } from './chartMath';

// Voice sweep §9: Chalk Talk flair removed. cup-of-coffee players get no fun fact
// at all (the `{funFact && …}` guard in PlayerCard hides the panel for them);
// every other category returns its bare stat line, unadorned.
function addFlair(fact: string, _playerId: string, pool: 'general' | 'draftFall' | 'cupOfCoffee'): string {
  return pool === 'cupOfCoffee' ? '' : fact;
}

// ── Primary stat key by position ──────────────────────────────────────────────

type PrimaryStatKey =
  | 'passYards' | 'rushYards' | 'recYards' | 'sacks' | 'tfl'
  | 'soloTackles' | 'defInts' | 'passDeflections' | 'snapPct';

const STAT_LABEL: Record<PrimaryStatKey, string> = {
  passYards:       'passing yards',
  rushYards:       'rushing yards',
  recYards:        'receiving yards',
  sacks:           'sacks',
  tfl:             'tackles for loss',
  soloTackles:     'solo tackles',
  defInts:         'interceptions',
  passDeflections: 'pass deflections',
  snapPct:         'snap share',
};

function getPrimaryStatKey(pos: string, seasonData: DisplaySeasonRow[] | null): PrimaryStatKey {
  switch (pos) {
    case 'QB':   return 'passYards';
    case 'RB':   return 'rushYards';
    case 'WR':   return 'recYards';
    case 'TE':   return 'recYards';
    case 'EDGE': return 'sacks';
    case 'DT':   return 'tfl';
    case 'LB':   return 'soloTackles';
    case 'CB': {
      const totalInts = careerSum(seasonData ?? [], 'defInts');
      return totalInts !== null && totalInts >= 2 ? 'defInts' : 'passDeflections';
    }
    case 'S':    return 'soloTackles';
    case 'OT':   return 'snapPct';
    case 'IOL':  return 'snapPct';
    default:     return 'soloTackles';
  }
}

// ── Season data helpers ───────────────────────────────────────────────────────

function careerSum(seasons: DisplaySeasonRow[], key: string): number | null {
  const vals = seasons
    .map(r => (r as unknown as Record<string, number | null>)[key])
    .filter((v): v is number => v !== null);
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) : null;
}

function careerAvgSnapPct(seasons: DisplaySeasonRow[]): number | null {
  const entries = seasons
    .map(r => ({ pct: r.snapPct, gp: r.gamesPlayed }))
    .filter((e): e is { pct: number; gp: number } => e.pct !== null && e.gp > 0);
  if (entries.length === 0) return null;
  const totalGp = entries.reduce((a, e) => a + e.gp, 0);
  return totalGp > 0
    ? entries.reduce((a, e) => a + e.pct * e.gp, 0) / totalGp
    : null;
}

function getCareerValue(player: Player, statKey: PrimaryStatKey): number | null {
  const sd = player.seasonData;
  if (!sd || sd.length === 0) return null;
  if (statKey === 'snapPct') return careerAvgSnapPct(sd);
  return careerSum(sd, statKey);
}

// ── Ranking helper ────────────────────────────────────────────────────────────

interface RankResult {
  rank: number;   // 1-indexed, 1 = best
  total: number;  // # in group with data
}

function computeCareerRank(
  player: Player,
  group: Player[],
  statKey: PrimaryStatKey,
): RankResult | null {
  const withData = group.filter(p => p.seasonData && p.seasonData.length > 0);
  if (withData.length === 0) return null;

  const playerVal = getCareerValue(player, statKey);
  if (playerVal === null) return null;

  let rank = 1;
  for (const peer of withData) {
    if (peer.player_id === player.player_id) continue;
    const peerVal = getCareerValue(peer, statKey);
    if (peerVal !== null && peerVal > playerVal) rank++;
  }

  return { rank, total: withData.length };
}

// ── Ordinal helper ────────────────────────────────────────────────────────────

function toOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// ── Measurables helpers ───────────────────────────────────────────────────────

type CombineMetric =
  | 'forty' | 'vertical' | 'broad' | 'arm' | 'hand'
  | 'height' | 'weight' | 'cone3' | 'shuttle';

const METRIC_LABEL: Record<CombineMetric, string> = {
  forty:    '40-yard dash',
  vertical: 'vertical jump',
  broad:    'broad jump',
  arm:      'arm length',
  hand:     'hand size',
  height:   'height',
  weight:   'weight',
  cone3:    '3-cone drill',
  shuttle:  'shuttle time',
};

const METRIC_ADJECTIVE: Record<CombineMetric, string> = {
  height:   'frame',
  weight:   'length',
  arm:      'length',
  hand:     'length',
  forty:    'athleticism',
  cone3:    'athleticism',
  shuttle:  'athleticism',
  vertical: 'explosiveness',
  broad:    'explosiveness',
};

const LOWER_IS_BETTER = new Set<CombineMetric>(['forty', 'cone3', 'shuttle']);

const POS_COMBINE_PRIMARY: Partial<Record<string, CombineMetric[]>> = {
  QB:   ['height', 'forty'],
  RB:   ['forty', 'vertical', 'broad'],
  WR:   ['forty', 'vertical', 'height'],
  TE:   ['height', 'vertical', 'forty'],
  EDGE: ['arm', 'vertical'],
  DT:   ['arm', 'weight', 'height'],
  LB:   ['forty', 'vertical'],
  CB:   ['forty', 'height', 'vertical'],
  S:    ['forty', 'vertical'],
  OT:   ['arm', 'height'],
  IOL:  ['weight', 'arm'],
};

const POS_COMBINE_SECONDARY: Partial<Record<string, CombineMetric[]>> = {
  QB:   ['hand'],
  RB:   ['weight'],
  WR:   ['broad', 'shuttle', 'cone3'],
  TE:   ['arm'],
  EDGE: ['forty', 'cone3'],
  DT:   ['cone3', 'shuttle'],
  LB:   ['shuttle', 'cone3'],
  CB:   ['arm'],
  S:    ['broad'],
  OT:   ['weight', 'hand'],
  IOL:  ['hand'],
};

function getMetricValue(p: Player, metric: CombineMetric): number | null {
  if (metric === 'height') return scoutToInches(p.height);
  return (p as unknown as Record<string, number | null>)[metric] ?? null;
}

function computePercentile(
  player: Player,
  peers: Player[],
  metric: CombineMetric,
): number | null {
  const playerVal = getMetricValue(player, metric);
  if (playerVal === null) return null;

  const peerVals = peers
    .map(p => getMetricValue(p, metric))
    .filter((v): v is number => v !== null);

  if (peerVals.length === 0) return null;

  const isLower = LOWER_IS_BETTER.has(metric);
  const countBetter = isLower
    ? peerVals.filter(v => v > playerVal).length
    : peerVals.filter(v => v < playerVal).length;

  return countBetter / peerVals.length;
}

// ── Category implementations ──────────────────────────────────────────────────

// Cat 2A — Draft fall (evaluated BEFORE Cat 1)
function cat2a(player: Player, group: Player[], statKey: PrimaryStatKey): string {
  if (player.rd == null || player.rd_drafted == null) return '';
  if (player.rd_drafted < player.rd + 2) return '';

  const result = computeCareerRank(player, group, statKey);
  if (!result) return '';
  const { rank, total } = result;
  if (rank > Math.ceil(total / 2)) return '';

  const x = Math.min(99, Math.round((total - rank + 1) / total * 100));
  const fact = `Projected as a Round ${player.rd} pick, ${player.name} fell to Round ${player.rd_drafted} on draft day — then went on to outperform ${x}% of ${player.pos}s from the ${player.draft_year} draft class.`;
  return addFlair(fact, player.player_id, 'draftFall');
}

// Cat 2B — High pick justified (evaluated BEFORE Cat 1 so it fires for top-third R1 picks)
function cat2b(player: Player, group: Player[], statKey: PrimaryStatKey): string {
  if (player.rd_drafted !== 1 || player.pick_drafted == null || player.pick_drafted > 16) return '';

  const result = computeCareerRank(player, group, statKey);
  if (!result) return '';
  const { rank, total } = result;
  if (rank > Math.ceil(total / 3)) return '';

  const pctStr = Math.round((rank / total) * 100);
  const pick = player.pick_drafted;
  const fact = `Selected ${toOrdinal(pick)} overall, ${player.name} has validated his Round 1 draft investment — ranking among the top ${pctStr}% of ${player.pos}s from the ${player.draft_year} draft class.`;
  return addFlair(fact, player.player_id, 'general');
}

// Cat 1 — Draft class production rank
function cat1(player: Player, group: Player[], statKey: PrimaryStatKey): string {
  const sd = player.seasonData;
  if (!sd || sd.length === 0) return '';

  const result = computeCareerRank(player, group, statKey);
  if (!result) return '';

  const { rank, total } = result;
  if (rank > Math.ceil(total / 2)) return '';

  const N = player.name;
  const pos = player.pos;
  const year = player.draft_year;
  const stat = STAT_LABEL[statKey];
  const isSnap = statKey === 'snapPct';

  let fact: string;
  if (rank === 1) {
    fact = `${N} leads all ${pos}s from the ${year} draft class in career ${stat}.`;
  } else if (rank === 2) {
    fact = `${N} ranks 2nd among all ${pos}s from the ${year} draft class in career ${stat}.`;
  } else {
    const n = rank - 1;
    if (isSnap) {
      fact = `${N} has averaged a higher career ${stat} than all but ${n} other ${pos}s from the ${year} draft class.`;
    } else {
      fact = `${N} has accumulated more career ${stat} than all but ${n} other ${pos}s from the ${year} draft class.`;
    }
  }

  return addFlair(fact, player.player_id, 'general');
}

// Cat 3 — Consecutive improvement streak
function cat3(player: Player, statKey: PrimaryStatKey): string {
  const sd = player.seasonData;
  if (!sd || sd.length < 3) return '';

  const sorted = [...sd].sort((a, b) => a.season - b.season);
  const vals = sorted.map(r =>
    statKey === 'snapPct' ? r.snapPct : (r as unknown as Record<string, number | null>)[statKey] ?? null
  );

  let streak = 1;
  let streakLen = 0;

  for (let i = 1; i < vals.length; i++) {
    if (vals[i] !== null && vals[i - 1] !== null && vals[i]! > vals[i - 1]!) {
      streak++;
      if (streak >= 3) streakLen = streak;
    } else {
      if (streakLen >= 3) break;
      streak = 1;
    }
  }

  if (streakLen < 3) return '';

  const stat = STAT_LABEL[statKey];
  const fact = `${player.name}'s ${stat} improved in each of his first ${streakLen} NFL seasons — one of the more consistent development arcs in the ${player.draft_year} draft class.`;
  return addFlair(fact, player.player_id, 'general');
}

// Cat 4 — Measurables standout (fires for pre-draft AND post-draft)
function cat4(player: Player, classPeers: Player[]): string {
  const primaryMetrics = POS_COMBINE_PRIMARY[player.pos] ?? [];
  const secondaryMetrics = POS_COMBINE_SECONDARY[player.pos] ?? [];
  if (primaryMetrics.length === 0 && secondaryMetrics.length === 0) return '';

  function bestInTier(metrics: CombineMetric[]): { metric: CombineMetric; pct: number } | null {
    let best: { metric: CombineMetric; pct: number } | null = null;
    for (const metric of metrics) {
      const pct = computePercentile(player, classPeers, metric);
      if (pct !== null && (best === null || pct > best.pct)) {
        best = { metric, pct };
      }
    }
    return best;
  }

  let bestMetric: CombineMetric | null = null;
  let bestPct = 0;

  const primaryBest = bestInTier(primaryMetrics);
  if (primaryBest !== null && primaryBest.pct >= 0.85) {
    bestMetric = primaryBest.metric;
    bestPct = primaryBest.pct;
  } else {
    const secondaryBest = bestInTier(secondaryMetrics);
    if (secondaryBest !== null && secondaryBest.pct >= 0.85) {
      bestMetric = secondaryBest.metric;
      bestPct = secondaryBest.pct;
    }
  }

  if (bestMetric === null || bestPct < 0.85) return '';

  const metricLabel = METRIC_LABEL[bestMetric];
  const adjective = METRIC_ADJECTIVE[bestMetric];
  const pos = player.pos;
  const year = player.draft_year;
  const N = player.name;

  let fact: string;
  if (bestPct >= 0.95) {
    fact = `${N} measured in the 95th percentile or above among ${pos}s in ${metricLabel} in the ${year} draft class — exceptional ${adjective} for the position.`;
  } else if (bestPct >= 0.90) {
    fact = `Among the top 10% of ${pos}s in ${metricLabel} in the ${year} draft class — ${N} has the ${adjective} profile teams covet.`;
  } else {
    fact = `${N} ranked in the top 15% of ${pos}s in ${metricLabel} among the ${year} draft class — a physical profile that stands out at the position.`;
  }

  return addFlair(fact, player.player_id, 'general');
}

// Cat ST-path — ST-to-starter pathway
function catSTpath(player: Player): string {
  const sd = player.seasonData;
  if (!sd || sd.length === 0) return '';

  const sorted = [...sd].sort((a, b) => a.season - b.season);

  // Find first breakout season (snapPct >= 0.45)
  let breakoutSeason: number | null = null;
  for (const row of sorted) {
    if (row.snapPct !== null && row.snapPct >= 0.45) {
      breakoutSeason = row.season;
      break;
    }
  }
  if (breakoutSeason === null) return '';

  // Count ST-heavy seasons (stSnapPct > 0.40) that come BEFORE the breakout
  const stBefore = sorted.filter(
    r => r.stSnapPct !== null && r.stSnapPct > 0.40 && r.season < breakoutSeason!
  );
  if (stBefore.length < 2) return '';

  const N = stBefore.length;
  const breakoutYearN = breakoutSeason - player.draft_year + 1;
  const firstName = player.name.split(' ')[0];
  const fact = `${firstName} logged ${N} seasons as a core special teamer before earning a starting role in Year ${breakoutYearN}.`;
  return addFlair(fact, player.player_id, 'general');
}

// Cat ST-pb — ST Pro Bowl recognition
function catSTpb(player: Player, group: Player[]): string {
  const sd = player.seasonData;
  if (!sd || sd.length === 0) return '';
  if (!sd.some(r => r.stProBowl)) return '';

  const draftYear = player.draft_year;
  const N = group.filter(p => p.seasonData?.some(r => r.stProBowl)).length;
  const firstName = player.name.split(' ')[0];
  const fact = `${firstName} earned a Special Teams Pro Bowl selection — one of ${N} player${N !== 1 ? 's' : ''} from the ${draftYear} class to earn the honor.`;
  return addFlair(fact, player.player_id, 'general');
}

// Cat 5 — Snap share resilience
function cat5(player: Player): string {
  const sd = player.seasonData;
  if (!sd || sd.length < 3) return '';
  if (player.rd_drafted == null || player.rd_drafted < 4) return '';

  const above60 = sd.filter(r => r.snapPct !== null && r.snapPct >= 0.60);
  if (above60.length < 3) return '';

  const N = player.name;
  const n = above60.length;
  const total = sd.length;

  let fact: string;
  if (above60.length === total) {
    fact = `${N} has maintained 60%+ snap share in every one of his ${n} NFL seasons — consistent reliability from day one.`;
  } else {
    fact = `${N} has posted 60%+ snap share in ${n} of his NFL seasons — a sign of the sustained trust his coaching staff places in him.`;
  }

  return addFlair(fact, player.player_id, 'general');
}

// Cat 6 — Longevity / Cup of Coffee fallback
function cat6(player: Player): string {
  const sd = player.seasonData;
  if (!sd || sd.length === 0) return '';

  const activeSeason = sd.filter(r => r.gamesPlayed >= 1);
  if (activeSeason.length === 0) return '';

  const totalGames = activeSeason.reduce((a, r) => a + r.gamesPlayed, 0);
  const isBriefStint = totalGames < 16 || activeSeason.length === 1;

  if (isBriefStint) {
    return addFlair('', player.player_id, 'cupOfCoffee');
  }

  const n = activeSeason.length;
  const fact = `${player.name} has carved out ${n} seasons in the NFL — finding a way to contribute even when production stats alone wouldn't tell the full story.`;
  return addFlair(fact, player.player_id, 'general');
}

// ── Main export ───────────────────────────────────────────────────────────────

export function getFunFact(player: Player, classPeers: Player[]): string {
  if (player.fun_fact_override) return player.fun_fact_override;

  const statKey = getPrimaryStatKey(player.pos, player.seasonData);
  const group = [player, ...classPeers];
  const isPreDraft = !player.seasonData || player.seasonData.length === 0;

  if (!isPreDraft) {
    const c2a = cat2a(player, group, statKey);
    if (c2a) return c2a;

    const c2b = cat2b(player, group, statKey);
    if (c2b) return c2b;

    const c1 = cat1(player, group, statKey);
    if (c1) return c1;

    const cSTpath = catSTpath(player);
    if (cSTpath) return cSTpath;

    const cSTpb = catSTpb(player, group);
    if (cSTpb) return cSTpb;

    const c3 = cat3(player, statKey);
    if (c3) return c3;
  }

  const c4 = cat4(player, classPeers);
  if (c4) return c4;

  if (!isPreDraft) {
    const c5 = cat5(player);
    if (c5) return c5;

    const c6 = cat6(player);
    if (c6) return c6;
  }

  return '';
}
