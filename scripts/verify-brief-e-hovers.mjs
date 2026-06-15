/**
 * scripts/verify-brief-e-hovers.mjs — Brief e Item 2 (Act 2 hover) acceptance print.
 *
 * Run with `node scripts/verify-brief-e-hovers.mjs`.
 *
 * Authoritative close on Gate-2 item 1: enumerates the DRAFTED-BUT-UNRANKED players
 * per class against the LIVE `players` sheet (full Node fetch — no web-tool
 * truncation) and classifies each with the SAME logic the shipped code uses
 * (lib/scoreboardStats.ts classifyDraftMove + lib/sheets.ts mapRow columns +
 * lib/act3Constants.ts reach brackets + public/pick_value_curve_smooth.json).
 *
 * Also reconciles the scoreboard reach/steal totals two ways — real-rank-only
 * (pre-change) vs imputed (shipped) — so the "live == local, 0 added" finding is
 * reproducible and a durable regression artifact: when an early-unranked reach ever
 * appears in a future class, this catches the classification + hover behavior.
 *
 * Pure mirror of the shipped logic — does NOT import Next.
 */

import { readFileSync } from 'node:fs';

const SHEET = '17YHFcjDAG31eAEzcltpJ-NouybJOBxfB-jISbXjMZiU';
const URL = `https://docs.google.com/spreadsheets/d/${SHEET}/gviz/tq?tqx=out:csv&sheet=players`;

// ── Reach brackets (mirror lib/act3Constants.ts) ──
const REACH_BRACKET_TOP10 = 20;    // picks ≤ 10
const REACH_BRACKET_THRU64 = 12.5; // picks 11–64
const REACH_BRACKET_AFTER64 = 9;   // picks > 64

// ── Smoothed pick-value curve (mirror lib/scoreboardStats.ts) ──
const curve = JSON.parse(
  readFileSync(new URL('../public/pick_value_curve_smooth.json', import.meta.url), 'utf8'),
);
const SMOOTH = new Map(curve.map((e) => [e.pick, e.normalized]));
function smoothPickValue(pick) {
  const v = SMOOTH.get(pick);
  if (v != null) return v;
  if (pick < 1) return SMOOTH.get(1) ?? 0;
  return SMOOTH.get(256) ?? 0; // beyond the table → value of pick 256
}

// ── classifyDraftMove (verbatim mirror of lib/scoreboardStats.ts) ──
function classifyDraftMove(rank, pick) {
  if (pick == null || pick <= 0) return 'UNDRAFTED';
  if (rank == null) return 'IN_RANGE';
  if (pick === rank) return 'IN_RANGE';
  const gap = Math.abs(smoothPickValue(rank) - smoothPickValue(pick));
  const key = Math.min(rank, pick);
  const bracket =
    key <= 10 ? REACH_BRACKET_TOP10 : key <= 64 ? REACH_BRACKET_THRU64 : REACH_BRACKET_AFTER64;
  if (gap <= bracket) return 'IN_RANGE';
  return pick < rank ? 'REACH' : 'STEAL';
}

// ── CSV parse (mirror verify-brief-c.mjs) ──
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
const toI = (v) => {
  if (v == null || String(v).trim() === '') return null;
  const n = Number(String(v).trim());
  return Number.isNaN(n) ? null : Math.round(n);
};

const res = await fetch(URL);
const text = await res.text();
const lines = text.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim());
const headers = parseCSVLine(lines[0]).map((h) => h.replace(/^"|"$/g, ''));
const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
const rows = lines.slice(1).map((l) => parseCSVLine(l).map((c) => c.replace(/^"|"$/g, '')));

for (const f of ['draft_year', 'name', 'rank', 'pick_drafted']) {
  if (idx[f] == null) { console.error(`MISSING COLUMN: ${f}`); process.exit(1); }
}

// ── Group by class ──
const byYear = new Map();
for (const r of rows) {
  const dy = toI(r[idx.draft_year]);
  const name = (r[idx.name] ?? '').trim();
  if (dy == null || !name || name === '(Unknown)') continue;
  if (!byYear.has(dy)) byYear.set(dy, []);
  byYear.get(dy).push({ name, rank: toI(r[idx.rank]), pick: toI(r[idx.pick_drafted]) });
}

const years = [...byYear.keys()].sort((a, b) => a - b);
let grandUnranked = 0, grandReachAdded = 0;

console.log('═══ Brief e — Act 2 drafted-but-unranked enumeration + reach reconciliation ═══\n');

for (const y of years) {
  const players = byYear.get(y);
  const maxPick = players.reduce((m, p) => (p.pick != null && p.pick > m ? p.pick : m), 0);
  const drafted = players.filter((p) => p.pick != null && p.pick > 0);

  // Drafted-but-unranked = drafted with NO consensus rank.
  const unranked = drafted.filter((p) => p.rank == null);

  // Reconciliation: reaches/steals real-rank-only (pre-change) vs imputed (shipped).
  let rOld = 0, sOld = 0, rNew = 0, sNew = 0;
  for (const p of drafted) {
    if (p.rank != null) {
      const m = classifyDraftMove(p.rank, p.pick);
      if (m === 'REACH') { rOld++; rNew++; } else if (m === 'STEAL') { sOld++; sNew++; }
    } else {
      const m = classifyDraftMove(maxPick + 1, p.pick); // shipped imputation
      if (m === 'REACH') rNew++; else if (m === 'STEAL') sNew++;
    }
  }

  grandUnranked += unranked.length;
  grandReachAdded += (rNew - rOld);

  console.log(`── ${y}  (drafted ${drafted.length}, maxPick ${maxPick}) ──`);
  console.log(`   reaches: ${rOld} → ${rNew} (+${rNew - rOld})   steals: ${sOld} → ${sNew} (+${sNew - sOld})`);
  if (unranked.length === 0) {
    console.log('   drafted-but-unranked: none\n');
  } else {
    console.log(`   drafted-but-unranked: ${unranked.length}`);
    for (const p of unranked.sort((a, b) => a.pick - b.pick)) {
      const move = classifyDraftMove(maxPick + 1, p.pick);
      console.log(`     pick ${String(p.pick).padStart(3)}  ${move.padEnd(9)}  ${p.name}`);
    }
    console.log('');
  }
}

console.log('═══ Summary ═══');
console.log(`Total drafted-but-unranked across all classes: ${grandUnranked}`);
console.log(`Total reaches ADDED by imputation (should match live−local delta): ${grandReachAdded}`);
console.log(`Steals are never affected by imputation (an imputed max rank can't be a STEAL).`);
if (grandUnranked === 0) {
  console.log('\nNo drafted-but-unranked player exists in any live class — the REACH+Unranked');
  console.log('hover path is proven by the synthetic trace (early pick → REACH) until one appears.');
}
