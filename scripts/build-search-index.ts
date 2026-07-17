/**
 * scripts/build-search-index.ts
 *
 * Precompute the lean player search index to a committed static file, mirroring
 * scripts/build-outcome-scores.ts. At runtime fetchSearchIndex() reads
 * data/search-index.json instead of fetching + parsing the whole players CSV on
 * every cold render of /sitemap.xml and /api/search-index — the fix for the
 * residual Vercel Fluid Active CPU (2026-07-16).
 *
 * Output: data/search-index.json (checked into the repo — the static import in
 * lib/sheets.ts fails the build if it is absent).
 *
 * Run:  npx tsx scripts/build-search-index.ts
 * Needs SHEETS_SPREADSHEET_ID in .env.local.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

function ensureSpreadsheetId(): void {
  if (process.env.SHEETS_SPREADSHEET_ID) return;
  const env = readFileSync(join(ROOT, '.env.local'), 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^\s*SHEETS_SPREADSHEET_ID\s*=\s*(.+)\s*$/);
    if (m) { process.env.SHEETS_SPREADSHEET_ID = m[1].trim(); return; }
  }
  throw new Error('SHEETS_SPREADSHEET_ID not found in env or .env.local');
}

async function main() {
  ensureSpreadsheetId();
  const { computeSearchIndex } = await import('../lib/sheets');
  const entries = await computeSearchIndex();
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error(
      `computeSearchIndex returned ${Array.isArray(entries) ? 'an empty array' : 'a non-array'} — refusing to write an empty snapshot`,
    );
  }
  mkdirSync(join(ROOT, 'data'), { recursive: true });
  const outPath = join(ROOT, 'data', 'search-index.json');
  const json = JSON.stringify(entries);
  writeFileSync(outPath, json + '\n', 'utf8');
  const bytes = Buffer.byteLength(json, 'utf8');
  console.log(`Wrote ${outPath}`);
  console.log(`  ${entries.length} players  ·  ${(bytes / 1_000_000).toFixed(2)} MB`);
}

main().catch((e) => { console.error(e); process.exit(1); });
