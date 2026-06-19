/**
 * scripts/verify-brief-1-played-position.mjs — Brief 1 / Item A regression artifact.
 *
 * Mirrors the lib/sheets.ts usageAgg pass against the LIVE player_seasons sheet and
 * proves the id-position fallback: every QUALIFIED player whose modal played_position
 * is blank must now resolve a valid id-parsed position (so he enters usagePoolByPos
 * and gets a real careerUsagePercentile instead of flooring to TOO FEW SNAPS).
 *
 * Prints the before/after count of "would-floor" qualified players per class 2018–2025
 * and asserts the 14 named 2025 players all resolve.
 *
 * Data-side proof only — it does NOT replace the browser check that Ratledge actually
 * renders in STARTER (the runtime is the source of truth).
 *
 * Pure mirror of the shipped logic — does NOT import Next (unstable_cache).
 */

const SHEET = '17YHFcjDAG31eAEzcltpJ-NouybJOBxfB-jISbXjMZiU';
const URL = `https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:csv&sheet=player_seasons`;

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

// Mirror lib/scoring.ts normalizePosition (passthrough for canonical tokens).
function normalizePosition(raw) {
  const p = (raw ?? '').trim().toUpperCase();
  const direct = {
    QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', FB: 'FB',
    OT: 'OT', T: 'OT',
    OG: 'IOL', OC: 'IOL', IOL: 'IOL', G: 'IOL', C: 'IOL',
    OL: 'OT',
    EDGE: 'EDGE', DE: 'EDGE', OLB: 'EDGE',
    DT: 'DT', DL: 'DT', NT: 'DT',
    LB: 'LB', ILB: 'LB', MLB: 'LB',
    CB: 'CB', DB: 'CB',
    S: 'S', SS: 'S', FS: 'S',
    ST: 'ST',
  };
  return direct[p] ?? null;
}

const res = await fetch(URL);
const text = await res.text();
const lines = text.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim());
const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
const rows = lines.slice(1).map(l => parseCSVLine(l).map(c => c.replace(/^"|"$/g, '')));

// Group by player; drop pre-draft collision rows (season < draft_year) — mirror sheets.ts.
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

// Per-player aggregation (mirror usageAgg). modalPos = modal non-blank played_position.
// idPos = the fallback (id 3rd-from-end token → normalizePosition, excluding null/ST).
const agg = new Map();
for (const [pid, list] of byPid) {
  let careerUsage = null, qualified = false;
  const posCounts = new Map();
  for (const r of list) {
    const cu = (() => { const v = (r[idx.career_usage] ?? '').trim(); if (!v) return null; const n = Number(v); return isNaN(n) ? null : n; })();
    if (cu != null) careerUsage = cu;
    if ((r[idx.usage_qualified] ?? '').trim().toUpperCase() === 'TRUE') qualified = true;
    const pp = (r[idx.played_position] ?? '').trim();
    if (pp) posCounts.set(pp, (posCounts.get(pp) ?? 0) + 1);
  }
  let modalPos = null, best = 0;
  posCounts.forEach((c, p) => { if (c > best) { best = c; modalPos = p; } });

  const idParts = pid.split('-');
  const idPosRaw = idParts.length >= 3 ? idParts[idParts.length - 3] : '';
  const idNorm = normalizePosition(idPosRaw);
  const idPos = (idNorm && idNorm !== 'ST') ? idNorm : null;

  // Precedence: modal non-blank → id-parsed → null (exact fix chain).
  const resolvedPos = modalPos ?? idPos;
  agg.set(pid, { careerUsage, qualified, modalPos, idPos, resolvedPos });
}

const classOf = pid => parseInt(pid.split('-').at(-1) ?? '', 10);

// "Would-floor": qualified, has careerUsage, but modal played_position blank.
// before = floors (null pos → no percentile). after = still floors (id fallback also null).
console.log('\n=== Item A — would-floor qualified players per class (blank modal played_position) ===');
console.log('  class : beforeFix(floored) → afterFix(stillFloored)  [recovered]');
const perClass = new Map();
for (const [pid, a] of agg) {
  if (!a.qualified || a.careerUsage == null) continue;
  if (a.modalPos != null) continue;            // had a label — not affected
  const dy = classOf(pid);
  if (isNaN(dy) || dy < 2018 || dy > 2025) continue;
  const e = perClass.get(dy) ?? { before: 0, after: 0, recovered: [] };
  e.before++;
  if (a.idPos == null) e.after++;              // fallback couldn't resolve → still floors
  else e.recovered.push(pid);
  perClass.set(dy, e);
}
let totalBefore = 0, totalAfter = 0;
for (let dy = 2018; dy <= 2025; dy++) {
  const e = perClass.get(dy) ?? { before: 0, after: 0, recovered: [] };
  totalBefore += e.before; totalAfter += e.after;
  console.log(`  ${dy}  : ${String(e.before).padStart(3)} → ${String(e.after).padStart(3)}  [${e.recovered.length} recovered]`);
}
console.log(`  TOTAL : ${totalBefore} → ${totalAfter}  [${totalBefore - totalAfter} recovered]`);

// The 14 named 2025 players must all resolve a valid id-parsed position.
console.log('\n=== Item A — 2025 affected class: every blank-modal qualified player resolves ===');
const affected2025 = [...agg.entries()]
  .filter(([pid, a]) => classOf(pid) === 2025 && a.qualified && a.careerUsage != null && a.modalPos == null)
  .sort((x, y) => x[0].localeCompare(y[0]));
console.log(`  count = ${affected2025.length} (brief: 14)`);
let allResolve = true;
for (const [pid, a] of affected2025) {
  const ok = a.idPos != null;
  if (!ok) allResolve = false;
  console.log(`  ${ok ? 'OK ' : 'XX '} ${pid}  → idPos=${a.idPos ?? 'NULL'}`);
}

// Tate Ratledge spotlight.
const tate = agg.get('tate-ratledge-iol-geo-2025');
console.log('\n=== Spotlight: tate-ratledge-iol-geo-2025 ===');
if (tate) console.log(`  qualified=${tate.qualified} careerUsage=${tate.careerUsage} modalPos=${tate.modalPos ?? 'BLANK'} → resolvedPos=${tate.resolvedPos ?? 'NULL'}`);
else console.log('  NOT FOUND in sheet');

// Non-canonical round-trip check (mirrors the defensive warn added to sheets.ts).
console.log('\n=== Defensive: raw played_position values that do NOT round-trip through normalizePosition ===');
const badRaw = new Set();
for (const a of agg.values()) {
  if (a.modalPos != null && normalizePosition(a.modalPos) !== a.modalPos) badRaw.add(a.modalPos);
}
console.log(badRaw.size === 0 ? '  none — all raw played_position values are canonical (pool keys safe)' : `  NON-CANONICAL: ${[...badRaw].map(v => `"${v}"`).join(', ')}`);

// ── Downstream free win: scoreboard "became starters" count (lib/scoreboardStats.ts) ──
// becameStartersCount = players with careerUsagePercentile != null && >= STARTER_PERCENTILE (65).
// Before the fix the recovered players had a null percentile (excluded); after, they get a real
// one. Compute both pools honestly (after-fix pool also grows by the recovered players' usage —
// "correct, not a regression" per the brief) and show the per-class delta. Nothing hardcoded.
const STARTER_PERCENTILE = 65;
function computePercentile(value, pool) {
  const valid = pool.filter(v => Number.isFinite(v));
  if (valid.length <= 1) return 50;
  const sorted = [...valid].sort((a, b) => a - b);
  const below = sorted.filter(v => v < value).length;
  return Math.round((below / (sorted.length - 1)) * 100);
}
function buildPool(posOf) {
  const pool = new Map();
  for (const a of agg.values()) {
    if (!a.qualified || a.careerUsage == null) continue;
    const pos = posOf(a);
    if (pos == null) continue;
    const l = pool.get(pos) ?? []; l.push(a.careerUsage); pool.set(pos, l);
  }
  return pool;
}
const poolBefore = buildPool(a => a.modalPos);              // recovered excluded (pos null)
const poolAfter  = buildPool(a => a.resolvedPos);           // recovered included via id fallback
function becameStarters(dy, pool, posOf) {
  let n = 0;
  for (const [pid, a] of agg) {
    if (classOf(pid) !== dy || !a.qualified || a.careerUsage == null) continue;
    const pos = posOf(a);
    if (pos == null) continue;
    if (computePercentile(a.careerUsage, pool.get(pos) ?? []) >= STARTER_PERCENTILE) n++;
  }
  return n;
}
console.log('\n=== Item A — downstream "became starters" scoreboard count (per class) ===');
console.log('  class : before → after  (Δ)');
for (let dy = 2018; dy <= 2025; dy++) {
  const b = becameStarters(dy, poolBefore, a => a.modalPos);
  const af = becameStarters(dy, poolAfter, a => a.resolvedPos);
  const flag = af !== b ? `  ← moved (+${af - b})` : '';
  console.log(`  ${dy}  : ${String(b).padStart(3)} → ${String(af).padStart(3)}  (${af - b >= 0 ? '+' : ''}${af - b})${flag}`);
}
console.log('  (runtime browser scoreboard is the source of truth; this is the data-side delta)');

const pass = allResolve && affected2025.length > 0 && tate?.resolvedPos != null;
console.log(`\nBrief 1 / Item A data-side ${pass ? 'PASS' : 'FAIL'}`);
