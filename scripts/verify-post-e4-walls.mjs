/**
 * scripts/verify-post-e4-walls.mjs — Post-E4 polish acceptance print.
 *
 * Pulls 2021 through the SHIPPED data pipeline (/api/draft?year=2021) and prints the
 * wall tier counts + maxPick so they can be checked against the locked anchors:
 *   walls (PREMIUM/SOLID/BRIDGE/PROVE_IT/NONE) = 31 / 53 / 26 / 182 / 31
 *   maxPick = 259
 * Also prints the NEW scoreboard-strip derivations (gotPaid, on-target) to confirm the
 * added counts cohere with the walls. Requires `npm run dev` running on :3000.
 */

const YEAR = 2021;
const PORT = process.env.PORT ?? 3000;
const res = await fetch(`http://localhost:${PORT}/api/draft?year=${YEAR}&live=1`);
if (!res.ok) { console.error(`fetch failed: ${res.status}`); process.exit(1); }
const { players } = await res.json();

const TIERS = ['PREMIUM', 'SOLID', 'BRIDGE', 'PROVE_IT', 'NONE'];
const tierCounts = Object.fromEntries(TIERS.map(t => [t, 0]));
for (const p of players) {
  const t = p.verdict?.tier;
  if (t && t in tierCounts) tierCounts[t]++;
}
const maxPick = players.reduce((m, p) => (p.pick_drafted != null && p.pick_drafted > m ? p.pick_drafted : m), 0);
const drafted = players.filter(p => p.pick_drafted != null && p.pick_drafted > 0).length;
const gotPaid = tierCounts.PREMIUM + tierCounts.SOLID + tierCounts.BRIDGE;
const tierSum = TIERS.reduce((s, t) => s + tierCounts[t], 0);

const wallStr = TIERS.map(t => tierCounts[t]).join(' / ');
console.log(`\n=== Post-E4 wall re-verify (${YEAR}) ===`);
console.log(`walls (PREMIUM/SOLID/BRIDGE/PROVE_IT/NONE): ${wallStr}`);
console.log(`  expected:                                  31 / 53 / 26 / 182 / 31`);
console.log(`maxPick: ${maxPick}   (expected 259)`);
console.log(`tier sum (= N for resolved): ${tierSum}`);
console.log(`got paid (P+S+B): ${gotPaid}   drafted: ${drafted}`);

const wallsOk = wallStr === '31 / 53 / 26 / 182 / 31';
const maxOk = maxPick === 259;
console.log(`\nRESULT: walls ${wallsOk ? 'PASS' : 'FAIL'} · maxPick ${maxOk ? 'PASS' : 'FAIL'}`);
// Set the code and let Node drain naturally — process.exit() while undici's keep-alive
// socket is still closing trips a cosmetic libuv assert on Windows.
process.exitCode = wallsOk && maxOk ? 0 : 1;
