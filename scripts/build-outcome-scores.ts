/**
 * scripts/build-outcome-scores.ts
 *
 * Precompute the outcome-score index to a committed static file.
 *
 * Mirrors scripts/build-spend-baseline.mjs (generate offline → commit the JSON),
 * but instead of re-implementing the scoring in plain JS it REUSES the real TS
 * compute path — importing computeOutcomeScoreEntries() from lib/sheets.ts — so
 * the snapshot is byte-for-byte the same shape the runtime used to compute per
 * cold render. This is the fix for the Vercel Fluid Active CPU overage: at
 * runtime fetchOutcomeScores() now reads data/outcome-scores.json instead of
 * fetching + scoring the ~10k-row player_seasons tab on every cold start.
 *
 * Output: data/outcome-scores.json (checked into the repo — the static import
 * in lib/sheets.ts fails the build if it is absent).
 *
 * Run:  npx tsx scripts/build-outcome-scores.ts
 * Needs SHEETS_SPREADSHEET_ID in .env.local (same var the app + build-spend-baseline use).
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ── Load SHEETS_SPREADSHEET_ID from .env.local (tsx does not auto-load it) ─────
function ensureSpreadsheetId(): void {
  if (process.env.SHEETS_SPREADSHEET_ID) return;
  const env = readFileSync(join(ROOT, '.env.local'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*SHEETS_SPREADSHEET_ID\s*=\s*(.+)\s*$/);
    if (m) {
      process.env.SHEETS_SPREADSHEET_ID = m[1].trim();
      return;
    }
  }
  throw new Error('SHEETS_SPREADSHEET_ID not found in env or .env.local');
}

async function main() {
  ensureSpreadsheetId();

  // Import lazily, AFTER the env var is set — computeOutcomeScoreEntries reads
  // process.env at call time, so a static import would also work, but this keeps
  // the ordering obvious.
  const { computeOutcomeScoreEntries } = await import('../lib/sheets');

  const entries = await computeOutcomeScoreEntries();
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(
      `computeOutcomeScoreEntries returned ${Array.isArray(entries) ? 'an empty array' : 'a non-array'} — refusing to write an empty snapshot`,
    );
  }

  mkdirSync(join(ROOT, 'data'), { recursive: true });
  const outPath = join(ROOT, 'data', 'outcome-scores.json');
  const json = JSON.stringify(entries);
  writeFileSync(outPath, json + '\n', 'utf8');

  const bytes = Buffer.byteLength(json, 'utf8');
  console.log(`Wrote ${outPath}`);
  console.log(`  ${entries.length} players  ·  ${(bytes / 1_000_000).toFixed(2)} MB`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
