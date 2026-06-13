/**
 * scripts/verify-brief-c.mjs — Brief c acceptance print (run with `node`).
 *
 * Replicates the lib/sheets.ts usage aggregation + the Part-2 waterfall + Part-3
 * zone bucketing against the LIVE player_seasons sheet, then prints every
 * acceptance anchor so Fable can verify against output (not a chat summary).
 *
 * Pure mirror of the shipped logic — does NOT import Next (unstable_cache).
 */

const SHEET = '17YHFcjDAG31eAEzcltpJ-NouybJOBxfB-jISbXjMZiU';
const URL = `https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:csv&sheet=player_seasons`;

// ── Knobs (mirror lib/act3Constants.ts) ──
const ST_CEILING = 45;
const HEADROOM = 0.06, STRIP_TOP = 0.86, STARTER_PCT = 65, ROLE_PCT = 25, FRINGE_TAB = 10, LANE_PX = 28;
const BAND_TOP = 72, BAND_H = 960 - 72 - 56; // 832

function parseCSVLine(line) {
  const out = []; let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === ',' && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur); return out;
}
const toF = v => { if (v == null || v.trim() === '') return null; const n = Number(v.trim()); return isNaN(n) ? null : n; };
const toI = v => { const n = toF(v); return n == null ? null : Math.round(n); };

function computePercentile(value, pool) {
  const valid = pool.filter(v => Number.isFinite(v));
  if (valid.length <= 1) return 50;
  const sorted = [...valid].sort((a, b) => a - b);
  const below = sorted.filter(v => v < value).length;
  return Math.round((below / (sorted.length - 1)) * 100);
}
function bodyPct(pct) {
  const c = Math.max(0, Math.min(100, pct));
  return HEADROOM + (1 - c / 100) * (STRIP_TOP - HEADROOM);
}
const fracToY = f => BAND_TOP + f * BAND_H;

const res = await fetch(URL);
const text = await res.text();
const lines = text.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim());
const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
const rows = lines.slice(1).map(l => parseCSVLine(l).map(c => c.replace(/^"|"$/g, '')));

// Group by player, drop pre-draft collision rows (season < draft_year).
const byPid = new Map();
for (const r of rows) {
  const pid = (r[idx.player_id] ?? '').trim();
  if (!pid) continue;
  const dy = parseInt(pid.split('-').at(-1) ?? '', 10);
  const s = parseInt(r[idx.season] ?? '', 10);
  if (!isNaN(dy) && !isNaN(s) && s < dy) continue;
  if (!byPid.has(pid)) byPid.set(pid, []);
  byPid.get(pid).push(r);
}

// Per-player aggregation (mirror sheets.ts).
const agg = new Map();
for (const [pid, list] of byPid) {
  let careerUsage = null, qualified = false, games = 0, st = 0, scrim = 0;
  const posCounts = new Map();
  const seasonSnap = new Map(); // games-weighted snap_pct
  const stSeason = new Map();
  for (const r of list) {
    const cu = toF(r[idx.career_usage]); if (cu != null) careerUsage = cu;
    if ((r[idx.usage_qualified] ?? '').trim().toUpperCase() === 'TRUE') qualified = true;
    const pp = (r[idx.played_position] ?? '').trim(); if (pp) posCounts.set(pp, (posCounts.get(pp) ?? 0) + 1);
    games += toI(r[idx.games_played]) ?? 0;
    st += toF(r[idx.st_snap_count]) ?? 0;
    scrim += toF(r[idx.snap_count]) ?? 0;
    const s = toI(r[idx.season]); const sp = toF(r[idx.snap_pct]); const gp = toI(r[idx.games_played]) ?? 0;
    if (s != null && sp != null) { const p = seasonSnap.get(s) ?? { ws: 0, g: 0 }; seasonSnap.set(s, { ws: p.ws + sp * gp, g: p.g + gp }); }
    const stp = toF(r[idx.st_snap_pct]); const stc = toF(r[idx.st_snap_count]);
    if (s != null && stp != null) { const p = stSeason.get(s) ?? { w: 0, c: 0 }; const w = stc ?? 0; stSeason.set(s, { w: p.w + stp * w, c: p.c + w }); }
  }
  let playedPosition = null, best = 0;
  posCounts.forEach((c, p) => { if (c > best) { best = c; playedPosition = p; } });
  const seasons = [...seasonSnap.entries()].sort((a, b) => a[0] - b[0]).map(([s, { ws, g }]) => ({ season: s, snapPct: g > 0 ? ws / g : 0 }));
  agg.set(pid, { careerUsage, qualified, playedPosition, games, st, scrim, seasons });
}

// Pools.
const poolByPos = new Map();
for (const a of agg.values()) if (a.qualified && a.playedPosition && a.careerUsage != null) {
  const l = poolByPos.get(a.playedPosition) ?? []; l.push(a.careerUsage); poolByPos.set(a.playedPosition, l);
}
const stPrimaryOf = a => a.st > a.scrim && a.st >= 50;
const stShareOf = a => { const t = a.st + a.scrim; return t > 0 ? a.st / t : 0; };
const stPool = []; for (const a of agg.values()) if (stPrimaryOf(a)) stPool.push(stShareOf(a));

function profile(pid) {
  const a = agg.get(pid); if (!a) return null;
  const cup = (a.qualified && a.playedPosition && a.careerUsage != null) ? computePercentile(a.careerUsage, poolByPos.get(a.playedPosition) ?? []) : null;
  const stPrimary = stPrimaryOf(a);
  const stPct = stPrimary ? computePercentile(stShareOf(a), stPool) : null;
  return { ...a, careerUsagePercentile: cup, stPrimary, stPercentile: stPct };
}
// Waterfall → {step, yFrac, zone}
function place(pid) {
  const u = profile(pid); if (!u) return { step: 'NO-DATA' };
  let step, yFrac;
  if (u.stPrimary) { step = '1:ST'; yFrac = bodyPct(((u.stPercentile ?? 0) / 100) * ST_CEILING); }
  else if (u.qualified && u.careerUsagePercentile != null) { step = '2:QUAL'; yFrac = bodyPct(u.careerUsagePercentile); }
  else { step = '3:STRIP'; yFrac = (STRIP_TOP + 1) / 2; }
  const y = fracToY(yFrac);
  let zone;
  if (y < fracToY(bodyPct(STARTER_PCT))) zone = 'STARTER';
  else if (y < fracToY(bodyPct(ROLE_PCT))) zone = 'ROLE';
  else if (y <= fracToY(STRIP_TOP)) zone = 'FRINGE'; // <= : a dot exactly on the strip top is Fringe (Gate-2 minor)
  else zone = "COULDN'T STICK";
  return { step, yFrac: +yFrac.toFixed(3), y: +y.toFixed(1), zone, u };
}

const P = (pid) => { const r = place(pid); const u = r.u || {};
  console.log(`  ${pid}\n    qualified=${u.qualified} cuPct=${u.careerUsagePercentile} stPrimary=${u.stPrimary} stPct=${u.stPercentile} → ${r.step} → ${r.zone}`); };

console.log('\n=== ACC 1: Qualified Starters place in usage body (tier=Starter) ===');
['garrett-wilson-wr-ohi-2022','bijan-robinson-rb-tex-2023','jalen-carter-dt-geo-2023','tariq-woolen-cb-tex-2022','cj-stroud-qb-ohi-2023'].forEach(P);

console.log('\n=== ACC 2: EDGE now plots (Step-0 Fix 1) ===');
['aidan-hutchinson-edge-mic-2022','will-anderson-jr-edge-ala-2023'].forEach(P);

console.log('\n=== ACC 3: Null-snap population now plots (Step-0 Fix 2) ===');
['isaih-pacheco-rb-rut-2022','graham-barton-ot-duk-2024'].forEach(P);

console.log('\n=== ACC 4: ST path (Step 1), Y <= ST_CEILING height ===');
['baylon-spector-lb-cle-2022','brian-asamoah-lb-okl-2022'].forEach(P);

console.log('\n=== ACC 5: SEAM REQ 1 — ST path, NOT strip (qualified FALSE) ===');
['beau-brade-s-mar-2024','ameer-speed-cb-mic-2023'].forEach(P);

console.log('\n=== ACC 6: Unqualified non-ST → COULDN\'T STICK (confirm qualified==false) ===');
['quinn-ewers-qb-tex-2025','chris-oladokun-qb-sou-2022'].forEach(P);

const yCeil = fracToY(bodyPct(ST_CEILING));
console.log(`\nST_CEILING visual floor: a Step-1 dot must have y >= ${yCeil.toFixed(1)} (lower on screen than P45). Starter line y=${fracToY(bodyPct(65)).toFixed(1)}, strip top y=${fracToY(STRIP_TOP).toFixed(1)}`);

console.log('\n=== ACC 8: 2026 floor — zero completed (season>=draft_year) rows ===');
let n2026 = 0; for (const [pid, a] of agg) if (pid.endsWith('-2026') && a.seasons.length > 0) n2026++;
console.log(`  2026 players with >=1 post-draft season row: ${n2026}  (expect 0 → selects 'floor')`);

console.log('\n=== ACC 9: Pending strip label is maturity-conditional (Gate-2 Fix 4) ===');
// Completed-season count = distinct seasons (season >= draft_year) across the class's
// usage.seasons (already draft_year-forward filtered). NO calendar math. Threshold knob.
const STRIP_LABEL_VERDICT_AFTER_SEASONS = 3;
function stripLabelForYear(dy) {
  const seasons = new Set();
  for (const [pid, a] of agg) {
    if (!pid.endsWith(`-${dy}`)) continue;
    for (const s of a.seasons) if (s.season >= dy) seasons.add(s.season);
  }
  const label = seasons.size >= STRIP_LABEL_VERDICT_AFTER_SEASONS ? "COULDN'T STICK" : "TOO FEW SNAPS";
  return { count: seasons.size, label };
}
for (const dy of [2021, 2022, 2023, 2024, 2025]) {
  const { count, label } = stripLabelForYear(dy);
  console.log(`  ${dy}: completedSeasons=${count} → "${label}"`);
}
console.log('  EXPECT: 2025 → "TOO FEW SNAPS" (1 season); 2022 → "COULDN\'T STICK" (>=3 seasons)');

// ════════════════════════════════════════════════════════════════════════════
//  ACC 10 (Brief c.2): label grammar — no pending dot overlaps a tab rect and no
//  dot lands within LANE_PX/2 of a boundary line. Mirrors the new tab placement
//  (every tab just INSIDE the top of its zone) + the asymmetric no-fire lanes
//  (above = LANE_PX/2, below = clear the tab text). Pure mirror of act3Constants.
// ════════════════════════════════════════════════════════════════════════════
console.log('\n=== ACC 10: label grammar — no dot overlaps a tab rect / sits on a boundary ===');

// Tab geometry (mirror act3Constants.ts).
const ZONE_TAB_INSET_PX = 14, ZONE_TAB_H = 18, LANE_TAB_PAD = 6;
const HALF = LANE_PX / 2;                                    // 14 — above-side reach
const BELOW = ZONE_TAB_INSET_PX + ZONE_TAB_H / 2 + LANE_TAB_PAD; // 29 — below-side reach
const EPS = 1e-6;

const headroomTopY = fracToY(HEADROOM);
const starterLineY = fracToY(bodyPct(STARTER_PCT)); // P65
const roleLineY    = fracToY(bodyPct(ROLE_PCT));    // P25
const stripTopY    = fracToY(STRIP_TOP);

// The three full-width boundary LINES (STARTER tab has none — it's the field top).
const LINES = [starterLineY, roleLineY, stripTopY];
// Tab CENTERS — each just inside the top of the zone it names (Part 2 grammar).
const TAB_CENTERS = [
  headroomTopY + ZONE_TAB_INSET_PX, // STARTER (field top)
  starterLineY + ZONE_TAB_INSET_PX, // ROLE PLAYER (below P65)
  roleLineY + ZONE_TAB_INSET_PX,    // FRINGE (below P25)
  stripTopY + ZONE_TAB_INSET_PX,    // strip (inside the strip)
];
// No-fire lanes (mirror applyNoFireLanes; LANE_EDGE_JITTER_PX == 0 so no jitter).
const BOUNDARIES = [
  { y: headroomTopY, oneSidedDown: true, below: BELOW }, // STARTER tab (field top)
  { y: starterLineY, below: BELOW },                     // P65 → ROLE tab below
  { y: roleLineY,    below: BELOW },                     // P25 → FRINGE tab below
  { y: stripTopY,    oneSidedUp: true },                 // strip top (interior untouched)
];
function applyLanes(y) {
  for (const b of BOUNDARIES) {
    const below = b.below ?? HALF;
    const dist = y - b.y;
    if (b.oneSidedUp) {
      if (dist <= 0 && dist > -HALF) y = b.y - HALF;
    } else if (b.oneSidedDown) {
      if (dist >= 0 && dist < below) y = b.y + below;
    } else {
      if (dist <= 0 && dist > -HALF)     y = b.y - HALF;
      else if (dist > 0 && dist < below) y = b.y + below;
    }
  }
  return y;
}

let totalDots = 0, lineViolations = 0, tabViolations = 0;
for (const dy of [2021, 2022, 2023, 2024, 2025]) {
  for (const pid of agg.keys()) {
    if (!pid.endsWith(`-${dy}`)) continue;
    const r = place(pid);
    if (r.step === 'NO-DATA' || r.y == null) continue;
    const y = applyLanes(r.y);
    totalDots++;
    for (const ly of LINES) if (Math.abs(y - ly) < HALF - EPS) lineViolations++;
    for (const tc of TAB_CENTERS) if (y > tc - ZONE_TAB_H / 2 - EPS && y < tc + ZONE_TAB_H / 2 + EPS) tabViolations++;
  }
}
console.log(`  dots checked: ${totalDots}`);
console.log(`  within LANE_PX/2 (${HALF}) of a boundary line: ${lineViolations}  (expect 0)`);
console.log(`  inside a tab rect Y-band: ${tabViolations}  (expect 0)`);
console.log(`  ACC 10 ${lineViolations === 0 && tabViolations === 0 ? 'PASS' : 'FAIL'}`);
