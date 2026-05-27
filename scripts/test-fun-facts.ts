/**
 * Validation script for getFunFact() with flair system.
 * Run with: npx tsx scripts/test-fun-facts.ts
 *
 * Uses hardcoded fixtures — no API calls, no file reads.
 */

import { getFunFact } from '../lib/funFacts';
import type { Player } from '../lib/sheets';
import type { DisplaySeasonRow } from '../lib/scoring';

// ── Fixture builder ───────────────────────────────────────────────────────────

function makePlayer(overrides: Partial<Player>): Player {
  return {
    player_id:        overrides.player_id ?? 'test-player',
    draft_year:       overrides.draft_year ?? 2021,
    name:             overrides.name ?? 'Test Player',
    pos:              overrides.pos ?? 'WR',
    school:           overrides.school ?? 'State University',
    rd:               overrides.rd ?? 3,
    rank:             overrides.rank ?? 80,
    consensus_source: null,
    height:           overrides.height ?? '6010',
    weight:           overrides.weight ?? 200,
    hand:             overrides.hand ?? null,
    arm:              overrides.arm ?? null,
    forty:            overrides.forty ?? null,
    split10:          null,
    vertical:         overrides.vertical ?? null,
    broad:            overrides.broad ?? null,
    cone3:            overrides.cone3 ?? null,
    shuttle:          null,
    bench:            null,
    notes:            null,
    role:             null,
    s1:               null,
    s2:               null,
    s3:               null,
    rd_drafted:       overrides.rd_drafted ?? null,
    pick_drafted:     overrides.pick_drafted ?? null,
    team_drafted:     overrides.team_drafted ?? null,
    drafted:          overrides.drafted ?? false,
    outcomeScore:     overrides.outcomeScore ?? null,
    stepScores:       null,
    seasonData:       overrides.seasonData ?? null,
    fun_fact_override: overrides.fun_fact_override ?? null,
  };
}

function makeSeason(season: number, stats: Partial<DisplaySeasonRow>): DisplaySeasonRow {
  return {
    season,
    teams:           stats.teams ?? ['KC'],
    gamesPlayed:     stats.gamesPlayed ?? 16,
    gamesStarted:    stats.gamesStarted ?? 16,
    snapPct:         stats.snapPct ?? null,
    snapCount:       stats.snapCount ?? null,
    passYards:       stats.passYards ?? null,
    passTDs:         stats.passTDs ?? null,
    rushYards:       stats.rushYards ?? null,
    rushTDs:         stats.rushTDs ?? null,
    recYards:        stats.recYards ?? null,
    recTDs:          stats.recTDs ?? null,
    receptions:      stats.receptions ?? null,
    intsThrownQB:    stats.intsThrownQB ?? null,
    sacks:           stats.sacks ?? null,
    tfl:             stats.tfl ?? null,
    qbHits:          stats.qbHits ?? null,
    soloTackles:     stats.soloTackles ?? null,
    defInts:         stats.defInts ?? null,
    passDeflections: stats.passDeflections ?? null,
    allPro:          stats.allPro ?? false,
    proBowl:         stats.proBowl ?? false,
    arcScore:        stats.arcScore ?? null,
  };
}

// ── Test fixtures ─────────────────────────────────────────────────────────────

// Case 1: Elite WR — #1 in recYards in class (Cat 1 + general flair)
// pick_drafted=20 to avoid Cat 2B (which requires pick ≤ 16)
const wrElite = makePlayer({
  player_id: 'jamarr-chase-wr-lsu-2021',
  name: "Ja'Marr Chase",
  pos: 'WR',
  draft_year: 2021,
  rd: 1, rd_drafted: 1, pick_drafted: 20,
  drafted: true,
  seasonData: [
    makeSeason(2021, { recYards: 1455, allPro: true }),
    makeSeason(2022, { recYards: 1046 }),
    makeSeason(2023, { recYards: 1216 }),
    makeSeason(2024, { recYards: 1708 }),
  ],
});
const wrElitePeers = [
  makePlayer({ player_id: 'wr-peer-1-2021', pos: 'WR', draft_year: 2021,
    seasonData: [makeSeason(2021, { recYards: 900 }), makeSeason(2022, { recYards: 800 })] }),
  makePlayer({ player_id: 'wr-peer-2-2021', pos: 'WR', draft_year: 2021,
    seasonData: [makeSeason(2021, { recYards: 600 })] }),
  makePlayer({ player_id: 'wr-peer-3-2021', pos: 'WR', draft_year: 2021,
    seasonData: [makeSeason(2021, { recYards: 400 })] }),
];

// Case 2: Elite LB — top in solo tackles (Cat 1 + general flair)
// pick_drafted=20 to avoid Cat 2B (which requires pick ≤ 16)
const lbElite = makePlayer({
  player_id: 'micah-parsons-lb-penn-state-2021',
  name: 'Micah Parsons',
  pos: 'LB',
  draft_year: 2021,
  rd: 1, rd_drafted: 1, pick_drafted: 20,
  drafted: true,
  seasonData: [
    makeSeason(2021, { soloTackles: 64, allPro: true, proBowl: true }),
    makeSeason(2022, { soloTackles: 72, allPro: true }),
    makeSeason(2023, { soloTackles: 68 }),
    makeSeason(2024, { soloTackles: 59 }),
  ],
});
const lbElitePeers = [
  makePlayer({ player_id: 'lb-peer-1-2021', pos: 'LB', draft_year: 2021,
    seasonData: [makeSeason(2021, { soloTackles: 40 }), makeSeason(2022, { soloTackles: 50 })] }),
  makePlayer({ player_id: 'lb-peer-2-2021', pos: 'LB', draft_year: 2021,
    seasonData: [makeSeason(2021, { soloTackles: 30 })] }),
];

// Case 3: Underdog RB — projected R3, fell to R5, top-half producer → Cat 2A + draft fall flair
// Cat 2A now evaluates BEFORE Cat 1, so it fires here even though Cat 1 would also qualify.
const rbUnderdog = makePlayer({
  player_id: 'underdog-rb-2021',
  name: 'Marcus Freeman',
  pos: 'RB',
  draft_year: 2021,
  rd: 3, rd_drafted: 5, pick_drafted: 150,
  drafted: true,
  seasonData: [
    makeSeason(2021, { rushYards: 800 }),
    makeSeason(2022, { rushYards: 950 }),
    makeSeason(2023, { rushYards: 1100 }),
  ],
});
const rbUnderdogPeers = [
  makePlayer({ player_id: 'rb-peer-1-2021', pos: 'RB', draft_year: 2021,
    seasonData: [makeSeason(2021, { rushYards: 300 }), makeSeason(2022, { rushYards: 200 })] }),
  makePlayer({ player_id: 'rb-peer-2-2021', pos: 'RB', draft_year: 2021,
    seasonData: [makeSeason(2021, { rushYards: 500 })] }),
  makePlayer({ player_id: 'rb-peer-3-2021', pos: 'RB', draft_year: 2021,
    seasonData: [makeSeason(2021, { rushYards: 100 })] }),
];

// Case 4: R1 pick #5, top-third producer → Cat 2B + general flair
// Cat 2B now evaluates BEFORE Cat 1 (same priority block as Cat 2A).
// Rank 1 out of 6 → top third (ceil(6/3)=2), so Cat 2B fires.
const qbHighPick = makePlayer({
  player_id: 'trevor-lawrence-qb-clemson-2021',
  name: 'Trevor Lawrence',
  pos: 'QB',
  draft_year: 2021,
  rd: 1, rd_drafted: 1, pick_drafted: 5,
  drafted: true,
  seasonData: [
    makeSeason(2021, { passYards: 3641 }),
    makeSeason(2022, { passYards: 4113 }),
    makeSeason(2023, { passYards: 4016 }),
  ],
});
const qbHighPickPeers = [
  makePlayer({ player_id: 'qb-peer-1-2021', pos: 'QB', draft_year: 2021,
    seasonData: [makeSeason(2021, { passYards: 2000 })] }),
  makePlayer({ player_id: 'qb-peer-2-2021', pos: 'QB', draft_year: 2021,
    seasonData: [makeSeason(2021, { passYards: 1500 })] }),
  makePlayer({ player_id: 'qb-peer-3-2021', pos: 'QB', draft_year: 2021,
    seasonData: [makeSeason(2021, { passYards: 1800 })] }),
  makePlayer({ player_id: 'qb-peer-4-2021', pos: 'QB', draft_year: 2021,
    seasonData: [makeSeason(2021, { passYards: 800 })] }),
  makePlayer({ player_id: 'qb-peer-5-2021', pos: 'QB', draft_year: 2021,
    seasonData: [makeSeason(2021, { passYards: 600 })] }),
];

// Case 5: WR with 3-year recYards improvement streak, bottom half of class → Cat 3 + general flair
// 4 peers above career recYards → rank 5/7 → above top half → Cat 1 doesn't fire.
const wrStreak = makePlayer({
  player_id: 'streak-wr-2022',
  name: 'Garrett Wilson',
  pos: 'WR',
  draft_year: 2022,
  rd: 1, rd_drafted: 1, pick_drafted: 10,
  drafted: true,
  seasonData: [
    makeSeason(2022, { recYards: 800 }),
    makeSeason(2023, { recYards: 1042 }),
    makeSeason(2024, { recYards: 1200 }),
  ],
});
const wrStreakPeers = [
  makePlayer({ player_id: 'wr-streak-peer-1-2022', pos: 'WR', draft_year: 2022,
    seasonData: [makeSeason(2022, { recYards: 1800 }), makeSeason(2023, { recYards: 1600 })] }),  // 3400
  makePlayer({ player_id: 'wr-streak-peer-2-2022', pos: 'WR', draft_year: 2022,
    seasonData: [makeSeason(2022, { recYards: 1500 }), makeSeason(2023, { recYards: 1700 })] }),  // 3200
  makePlayer({ player_id: 'wr-streak-peer-3-2022', pos: 'WR', draft_year: 2022,
    seasonData: [makeSeason(2022, { recYards: 1500 }), makeSeason(2023, { recYards: 1620 })] }),  // 3120
  makePlayer({ player_id: 'wr-streak-peer-4-2022', pos: 'WR', draft_year: 2022,
    seasonData: [makeSeason(2022, { recYards: 1400 }), makeSeason(2023, { recYards: 1660 })] }),  // 3060 > 3042
  makePlayer({ player_id: 'wr-streak-peer-5-2022', pos: 'WR', draft_year: 2022,
    seasonData: [makeSeason(2022, { recYards: 1100 }), makeSeason(2023, { recYards: 900 })] }),   // 2000
  makePlayer({ player_id: 'wr-streak-peer-6-2022', pos: 'WR', draft_year: 2022,
    seasonData: [makeSeason(2022, { recYards: 900 }), makeSeason(2023, { recYards: 800 })] }),    // 1700
];

// Case 6: DT with 95th-percentile arm, has seasons → Cat 4 + general flair
// Two peers have more TFL so dtBig falls below top half → Cat 1 doesn't fire.
const dtBig = makePlayer({
  player_id: 'big-dt-2023',
  name: 'Calijah Kancey',
  pos: 'DT',
  draft_year: 2023,
  rd: 1,
  arm: 35.5,
  hand: 10.5,
  weight: 305,
  seasonData: [makeSeason(2023, { tfl: 8, sacks: 4 })],
});
const dtBigPeers = [
  // Two peers with more TFL push dtBig to rank 3/3 → below top half (ceil(3/2)=2)
  makePlayer({ player_id: 'dt-tfl-peer-1-2023', pos: 'DT', draft_year: 2023, arm: 29.0, hand: 9.0, weight: 290,
    seasonData: [makeSeason(2023, { tfl: 10 })] }),
  makePlayer({ player_id: 'dt-tfl-peer-2-2023', pos: 'DT', draft_year: 2023, arm: 29.2, hand: 9.1, weight: 291,
    seasonData: [makeSeason(2023, { tfl: 12 })] }),
  ...Array.from({ length: 18 }, (_, i) =>
    makePlayer({
      player_id: `dt-peer-${i}-2023`,
      pos: 'DT',
      draft_year: 2023,
      arm: 29.4 + i * 0.2,
      hand: 9.2 + i * 0.05,
      weight: 292 + i,
      seasonData: null,
    })
  ),
];

// Case 7: Pre-draft 2026 QB with elite arm length → Cat 4 only + general flair
const qbProspect = makePlayer({
  player_id: 'cam-ward-qb-miami-2026',
  name: 'Cam Ward',
  pos: 'QB',
  draft_year: 2026,
  rd: 1,
  arm: 34.5,
  forty: 4.65,
  height: '6020',
  seasonData: null,
});
const qbProspectPeers = Array.from({ length: 15 }, (_, i) =>
  makePlayer({
    player_id: `qb-prospect-peer-${i}-2026`,
    pos: 'QB',
    draft_year: 2026,
    arm: 29.5 + i * 0.2,
    forty: 4.8 + i * 0.02,
    height: '6010',
    seasonData: null,
  })
);

// Case 8: Role OT — 4 seasons of 65%+ snap share → Cat 5 + general flair
// Peer avg snap% > player avg → Cat 1 doesn't fire (rank 2 > ceil(2/2)=1).
const otRolePlayer = makePlayer({
  player_id: 'role-ot-2021',
  name: 'James Hudson',
  pos: 'OT',
  draft_year: 2021,
  drafted: true, rd_drafted: 4, pick_drafted: 120,
  seasonData: [
    makeSeason(2021, { snapPct: 0.68, gamesPlayed: 16 }),
    makeSeason(2022, { snapPct: 0.72, gamesPlayed: 16 }),
    makeSeason(2023, { snapPct: 0.65, gamesPlayed: 16 }),
    makeSeason(2024, { snapPct: 0.70, gamesPlayed: 16 }),
  ],
});
const otRolePlayerPeers = [
  makePlayer({ player_id: 'ot-peer-1-2021', pos: 'OT', draft_year: 2021,
    seasonData: [makeSeason(2021, { snapPct: 0.90, gamesPlayed: 16 }), makeSeason(2022, { snapPct: 0.92, gamesPlayed: 16 })] }),
];

// Case 9: Low-production CB — 3 seasons, 20+ games each, no standout stats → Cat 6 Variant B + general flair
// 3 seasons, total games = 3 × 16 = 48 (≥ 16), 2+ seasons → sustained career
const cbLow = makePlayer({
  player_id: 'low-cb-2021',
  name: 'Cornerback Jones',
  pos: 'CB',
  draft_year: 2021,
  drafted: true, rd_drafted: 6, pick_drafted: 190,
  seasonData: [
    makeSeason(2021, { soloTackles: 8, defInts: 0, passDeflections: 2, snapPct: 0.30 }),
    makeSeason(2022, { soloTackles: 6, defInts: 0, passDeflections: 1, snapPct: 0.25 }),
    makeSeason(2023, { soloTackles: 10, defInts: 1, passDeflections: 3, snapPct: 0.35 }),
  ],
});
const cbLowPeers = Array.from({ length: 20 }, (_, i) =>
  makePlayer({
    player_id: `cb-peer-${i}-2021`,
    pos: 'CB',
    draft_year: 2021,
    forty: 4.40 + i * 0.01,
    vertical: 38 + i * 0.2,
    broad: 120 + i,
    height: `6${String(10 + i).padStart(2, '0')}0`,
    seasonData: [makeSeason(2021, { defInts: 3 + i, passDeflections: 5 + i * 2, soloTackles: 20 + i * 3 })],
  })
);

// Case 10: fun_fact_override set → Cat 0, no flair added
const playerWithOverride = makePlayer({
  player_id: 'override-player-2021',
  name: 'Override McFacts',
  pos: 'WR',
  draft_year: 2021,
  fun_fact_override: 'This is a manually curated fun fact that overrides all auto-generated facts.',
  seasonData: [makeSeason(2021, { recYards: 500 })],
});
const overridePeers: Player[] = [];

// Case 11: Brief stint — 1 season, 8 games total → Cat 6 Variant A → cup of coffee phrase only
// rd=null so Cat 2A can't fire. One peer with more passDeflections so rank > top half → Cat 1 doesn't fire.
const briefPlayer = makePlayer({
  player_id: 'brief-cb-2022',
  name: 'Marcus Brief',
  pos: 'CB',
  draft_year: 2022,
  rd: null, drafted: true, rd_drafted: 7, pick_drafted: 250,
  seasonData: [
    makeSeason(2022, { gamesPlayed: 8, soloTackles: 3, defInts: 0, passDeflections: 1, snapPct: 0.15 }),
  ],
});
const briefPeers: Player[] = [
  makePlayer({ player_id: 'brief-peer-1-2022', pos: 'CB', draft_year: 2022,
    seasonData: [makeSeason(2022, { passDeflections: 10, soloTackles: 30 })] }),
];

// Case 12: Pre-draft player, no measurables data → returns "" — NO FACT GENERATED
const noMeasurables = makePlayer({
  player_id: 'no-measurables-qb-2026',
  name: 'John Nobody',
  pos: 'QB',
  draft_year: 2026,
  rd: 5,
  // no arm, forty, height measurables
  seasonData: null,
});
const noMeasurablesPeers = Array.from({ length: 10 }, (_, i) =>
  makePlayer({
    player_id: `qb-no-meas-peer-${i}-2026`,
    pos: 'QB',
    draft_year: 2026,
    arm: 30 + i * 0.2,
    forty: 4.7 + i * 0.02,
    seasonData: null,
  })
);

// ── Run tests ─────────────────────────────────────────────────────────────────

type TestCase = {
  label: string;
  player: Player;
  peers: Player[];
  expectedCategory: string;
};

const cases: TestCase[] = [
  { label: "Case 1  — Elite WR, #1 recYards in class",                    player: wrElite,          peers: wrElitePeers,        expectedCategory: "Cat 1 + general flair" },
  { label: "Case 2  — Elite LB, top in tackles",                          player: lbElite,          peers: lbElitePeers,        expectedCategory: "Cat 1 + general flair" },
  { label: "Case 3  — Underdog RB, fell R3→R5, top-half producer",       player: rbUnderdog,       peers: rbUnderdogPeers,     expectedCategory: "Cat 2A + draft fall flair" },
  { label: "Case 4  — R1 pick #5, top-third producer",                   player: qbHighPick,       peers: qbHighPickPeers,     expectedCategory: "Cat 2B + general flair" },
  { label: "Case 5  — WR 3-year recYards streak, bottom half of class",  player: wrStreak,         peers: wrStreakPeers,        expectedCategory: "Cat 3 + general flair" },
  { label: "Case 6  — DT 95th-pct arm, has seasons",                     player: dtBig,            peers: dtBigPeers,          expectedCategory: "Cat 4 + general flair" },
  { label: "Case 7  — Pre-draft 2026 QB, elite arm (Cat 4 only)",        player: qbProspect,       peers: qbProspectPeers,     expectedCategory: "Cat 4 + general flair (no seasonData)" },
  { label: "Case 8  — Role OT, 4 seasons 65%+ snap share",               player: otRolePlayer,     peers: otRolePlayerPeers,   expectedCategory: "Cat 5 + general flair" },
  { label: "Case 9  — Low-production CB, 3 seasons fallback",            player: cbLow,            peers: cbLowPeers,          expectedCategory: "Cat 6 Variant B + general flair" },
  { label: "Case 10 — fun_fact_override set",                            player: playerWithOverride, peers: overridePeers,     expectedCategory: "Cat 0 (override, no flair)" },
  { label: "Case 11 — Brief stint, 1 season 8 games",                    player: briefPlayer,      peers: briefPeers,          expectedCategory: "Cat 6 Variant A → cup of coffee phrase only" },
  { label: "Case 12 — Pre-draft, no measurables data",                   player: noMeasurables,    peers: noMeasurablesPeers,  expectedCategory: "NO FACT GENERATED" },
];

console.log('\n=== getFunFact() simulation — with flair ===\n');

for (const tc of cases) {
  const fact = getFunFact(tc.player, tc.peers);
  const result = fact ? `"${fact}"` : 'NO FACT GENERATED';
  console.log(`${tc.label}`);
  console.log(`  Expected: ${tc.expectedCategory}`);
  console.log(`  Result:   ${result}`);
  console.log();
}
