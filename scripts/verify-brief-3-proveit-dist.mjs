/**
 * scripts/verify-brief-3-proveit-dist.mjs — Brief 3 (Resolved PROVE IT continuous
 * placement) data artifact + Step 0 outlier pre-check.
 *
 * Reads the LIVE `second_contracts` tab and, parsing draft_year off the player_id
 * suffix, dumps the PROVE IT `verdict_share` distribution per resolved class so the
 * continuous-placement render can be reasoned about and re-checked after a data
 * refresh:
 *   - count of zero-share rows, positive-share deciles, max share, null count
 *   - the Step 0 outliers: every PROVE IT row with verdict_share > 0.10 OR
 *     gtd_dollars > $1,000,000 (player_id, gtd_dollars, contract_years, apy,
 *     tag_option, verdict_share) — the rows that float toward paid HEIGHT on the
 *     continuous scale and must be legitimately PROVE_IT, not misgrades.
 *
 * Pure data mirror — does NOT import Next. Verdict maturity gate mirrored locally
 * (VERDICT_RESOLVED_THROUGH = 2021, lib/verdict.ts).
 */

const SHEET = '17YHFcjDAG31eAEzcltpJ-NouybJOBxfB-jISbXjMZiU';
const URL = `https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:csv&sheet=second_contracts`;

const VERDICT_RESOLVED_THROUGH = 2021;
const OUTLIER_SHARE = 0.10;
const OUTLIER_GTD = 1_000_000;

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

const toFloat = v => { const s = (v ?? '').trim(); if (!s) return null; const n = Number(s.replace(/[$,]/g, '')); return isNaN(n) ? null : n; };
const toInt = v => { const n = toFloat(v); return n == null ? null : Math.trunc(n); };
const classOf = pid => parseInt((pid ?? '').split('-').at(-1) ?? '', 10);
const fmtMoney = n => n == null ? '—' : '$' + Math.round(n).toLocaleString('en-US');

const res = await fetch(URL);
const text = await res.text();
const lines = text.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.trim());
const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
const rows = lines.slice(1).map(l => parseCSVLine(l).map(c => c.replace(/^"|"$/g, '')));

const get = (r, k) => r[idx[k]];

// Collect PROVE IT rows.
const proveIt = [];
for (const r of rows) {
  const pid = (get(r, 'player_id') ?? '').trim();
  const tier = (get(r, 'contract_tier') ?? '').trim();
  if (!pid || tier !== 'PROVE_IT') continue;
  proveIt.push({
    pid,
    dy: classOf(pid),
    share: toFloat(get(r, 'verdict_share')),
    gtd: toFloat(get(r, 'gtd_dollars')),
    years: toInt(get(r, 'contract_years')),
    apy: toFloat(get(r, 'apy')),
    tag: (get(r, 'tag_option') ?? '').trim(),
  });
}

console.log(`\n=== Brief 3 — PROVE IT verdict_share distribution (second_contracts) ===`);
console.log(`  total PROVE IT rows: ${proveIt.length}`);

// Distribution helper.
function dump(label, list) {
  const nulls = list.filter(p => p.share == null);
  const present = list.filter(p => p.share != null);
  const zeros = present.filter(p => p.share === 0);
  const pos = present.filter(p => p.share > 0).map(p => p.share).sort((a, b) => a - b);
  const decile = q => pos.length ? pos[Math.min(pos.length - 1, Math.floor(q * pos.length))] : null;
  const med = pos.length ? (pos.length % 2 ? pos[(pos.length - 1) / 2] : (pos[pos.length / 2 - 1] + pos[pos.length / 2]) / 2) : null;
  const f = n => n == null ? '—' : n.toFixed(4);
  console.log(`\n  [${label}]  n=${list.length}  zeros=${zeros.length}  positive=${pos.length}  null=${nulls.length}`);
  if (pos.length) {
    console.log(`    positive deciles: p10=${f(decile(0.1))} p25=${f(decile(0.25))} p50(med)=${f(med)} p75=${f(decile(0.75))} p90=${f(decile(0.9))} p95=${f(decile(0.95))} max=${f(pos[pos.length - 1])}`);
  }
}

dump('ALL classes', proveIt);

// Per resolved class.
const classes = [...new Set(proveIt.map(p => p.dy).filter(d => !isNaN(d)))].sort();
for (const dy of classes) {
  const tag = dy <= VERDICT_RESOLVED_THROUGH ? 'RESOLVED' : 'pending';
  dump(`${dy} (${tag})`, proveIt.filter(p => p.dy === dy));
}

// Resolved-only aggregate (the classes that actually render the resolved field).
dump('RESOLVED only (≤2021)', proveIt.filter(p => p.dy <= VERDICT_RESOLVED_THROUGH));

// ── Step 0 — outlier pre-check ────────────────────────────────────────────────
console.log(`\n=== STEP 0 — outliers (verdict_share > ${OUTLIER_SHARE} OR gtd_dollars > ${fmtMoney(OUTLIER_GTD)}) ===`);
const outliers = proveIt
  .filter(p => (p.share != null && p.share > OUTLIER_SHARE) || (p.gtd != null && p.gtd > OUTLIER_GTD))
  .sort((a, b) => (b.share ?? 0) - (a.share ?? 0));
console.log(`  count: ${outliers.length}\n`);
console.log(`  ${'player_id'.padEnd(34)} ${'gtd'.padStart(12)} ${'yrs'.padStart(4)} ${'apy'.padStart(13)} ${'share'.padStart(8)}  tag_option`);
for (const o of outliers) {
  const flag = o.dy <= VERDICT_RESOLVED_THROUGH ? '' : '  (pending class)';
  console.log(`  ${o.pid.padEnd(34)} ${fmtMoney(o.gtd).padStart(12)} ${String(o.years ?? '—').padStart(4)} ${fmtMoney(o.apy).padStart(13)} ${(o.share == null ? '—' : o.share.toFixed(4)).padStart(8)}  ${o.tag || '(none)'}${flag}`);
}
console.log(`\n  Review each: legitimately PROVE_IT (1-yr / low-APY / structure-driven) or a misgrade?`);
console.log(`  If several look misgraded → STOP and flag to Derek before the placement build.`);

// ── Placement preview — where PROVE IT dots LAND in each mode (mirror of the knobs) ──
// Mirrors lib/chartMath.ts proveItYFraction + lib/act3Constants.ts. Y-fraction of the
// plotting band, 0 = top (paid ceiling) … 1 = bottom. Lets the render be reasoned about
// before it is run, and re-checked after a data refresh.
const PAID_REGION_BOTTOM = 0.78, PROVE_IT_STRIP_Y = 0.88, NONE_STRIP_Y = 0.96;
const PROVE_IT_BAND_TOP = 0.80, PROVE_IT_BAND_BOTTOM = 0.94, PROVE_IT_REF_SHARE = 0.10;
const clamp01 = s => Math.max(0, Math.min(1, s));
const continuousY = s => (1 - Math.sqrt(clamp01(s))) * PAID_REGION_BOTTOM;
const subbandY = s => PROVE_IT_BAND_BOTTOM - Math.sqrt(clamp01(s / PROVE_IT_REF_SHARE)) * (PROVE_IT_BAND_BOTTOM - PROVE_IT_BAND_TOP);

console.log(`\n=== PLACEMENT PREVIEW — yFrac per mode (0=top/paid ceiling, 1=bottom) ===`);
console.log(`  reference lines:  PAID_REGION_BOTTOM=${PAID_REGION_BOTTOM}  (old PROVE_IT strip=${PROVE_IT_STRIP_Y})  NONE strip=${NONE_STRIP_Y}`);
console.log(`  subband knobs:    BAND_TOP=${PROVE_IT_BAND_TOP}  BAND_BOTTOM=${PROVE_IT_BAND_BOTTOM}  REF_SHARE=${PROVE_IT_REF_SHARE} (√)\n`);
const resolvedPos = proveIt.filter(p => p.dy <= VERDICT_RESOLVED_THROUGH && p.share != null && p.share > 0).map(p => p.share).sort((a, b) => a - b);
const q = f => resolvedPos[Math.min(resolvedPos.length - 1, Math.floor(f * resolvedPos.length))];
const samples = [
  ['zero (605 rows, 61%)', 0],
  ['median +ve (≈0.013)', q(0.5)],
  ['p75 +ve', q(0.75)],
  ['p90 +ve', q(0.9)],
  ['p95 +ve', q(0.95)],
  ['max (cabinda)', resolvedPos[resolvedPos.length - 1]],
];
console.log(`  ${'share sample'.padEnd(24)} ${'share'.padStart(8)} ${'continuous'.padStart(11)} ${'subband'.padStart(9)}`);
for (const [label, s] of samples) {
  console.log(`  ${label.padEnd(24)} ${s.toFixed(4).padStart(8)} ${continuousY(s).toFixed(3).padStart(11)} ${subbandY(s).toFixed(3).padStart(9)}`);
}
console.log(`\n  Read: continuous floats the high tail UP into paid HEIGHT (0.286 → yFrac ${continuousY(resolvedPos[resolvedPos.length-1]).toFixed(3)}, mid-paid),`);
console.log(`        thread snaps back to the PROVE IT node. subband keeps all PROVE IT in [${PROVE_IT_BAND_TOP}, ${PROVE_IT_BAND_BOTTOM}], clear of paid + NONE.`);
