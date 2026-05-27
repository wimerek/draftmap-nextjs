import type { Player } from './sheets';
import type { DisplaySeasonRow } from './scoring';
import { scoutToInches } from './chartMath';

// ── Deterministic hash ────────────────────────────────────────────────────────

function deterministicIndex(id: string, length: number): number {
  const hash = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return hash % length;
}

// ── Flair phrase pools ────────────────────────────────────────────────────────

const FLAIR_GENERAL = [
  // Exclamation style — prepended as standalone sentence before fact
  "Boo-yah!",
  "En fuego!",
  "He came to play.",
  "The tape don't lie.",
  "Put some respect on his name.",
  "That's what we call a football player.",
  "He showed up to work.",
  "Say his name.",
  "Boom goes the dynamite.",
  "That's money, baby.",
  "No days off.",
  "Straight business.",
  "He's got that dog in him.",
  "Locked. In.",
  // Lead-in style — followed by em dash then the fact
  "Cool as the other side of the pillow —",
  "Don't sleep on him —",
  "Built for this —",
  "He rumbled, he grinded, he produced —",
  "The résumé speaks for itself —",
  "Old school toughness, new school results —",
  "He heard his name called. He answered —",
  "He could go... all... the... way —",
  "Coach's dream, opponent's nightmare —",
  "He did the work when nobody was watching —",
  "Just call him butter, because he's been on a roll —",
  "Not just a player — a problem —",
  "Back, back, back... still producing —",
  "Pencil him in —",
  "This one's for the film room —",
  "Couldn't stop him, couldn't slow him down —",
  "Consistent as sunrise —",
  "The definition of a professional —",
  "He made believers out of everyone —",
  "Some guys just know how to ball —",
  "Night in, night out, he delivers —",
  "Ask the film room — they already know —",
  "Every snap, every down, every game —",
  "His draft class knows exactly who he is —",
  "Put the work in. Put the work in. Put the work in —",
  "The game tape is his autobiography —",
  "He got the memo and then some —",
  "Wears it on the field every single Sunday —",
  "He's been doing it since day one —",
  "The numbers back it up —",
];

const FLAIR_DRAFT_FALL = [
  "Slept on? Not for long —",
  "They passed on him. Mistake —",
  "He heard his name called late. He made them pay —",
  "Disrespected on draft day. Respected every Sunday after —",
  "Fell through the board, rose through the ranks —",
  "They had him wrong on draft day —",
];

const FLAIR_CUP_OF_COFFEE = [
  "Not every story ends in Canton — but his is still worth telling.",
  "He laced 'em up and gave everything he had.",
  "Few players make it this far. He was one of them.",
  "Every snap in the NFL is earned. He earned his.",
  "The league isn't easy. He answered the call anyway.",
  "Behind every roster spot is a story. Here's his.",
  "He heard his name called on draft day — and that moment is forever.",
  "Not a household name, but a professional. That means something.",
  "Short career, full effort. That's the only way he knew how to play.",
  "He did something most players only dream about — he made it.",
  "Grit over headlines. Every time.",
  "The grind was real. So was his commitment to it.",
];

function addFlair(fact: string, playerId: string, pool: 'general' | 'draftFall' | 'cupOfCoffee'): string {
  if (pool === 'cupOfCoffee') {
    const phrases = FLAIR_CUP_OF_COFFEE;
    return phrases[deterministicIndex(playerId, phrases.length)];
  }
  const phrases = pool === 'draftFall' ? FLAIR_DRAFT_FALL : FLAIR_GENERAL;
  const phrase = phrases[deterministicIndex(playerId, phrases.length)];
  return `${phrase} ${fact}`;
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

// Cat 5 — Snap share resilience
function cat5(player: Player): string {
  const sd = player.seasonData;
  if (!sd || sd.length < 3) return '';

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
