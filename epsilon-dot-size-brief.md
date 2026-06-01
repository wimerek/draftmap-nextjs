# Epsilon: Production Dot Size Redesign

## What This Changes and Why

The production/career view currently sizes dots using `|stepScore − expectedPickValue|`, where `expectedPickValue` comes from `pick_value_curve.json` and both over- and under-performers get **larger** dots. This creates too many large dots because:

1. The pick curve has too much intra-round noise (pick 15 vs pick 33 is a big swing)
2. Absolute delta means every survivor looks like an outlier due to survivor bias
3. The visual signal is lost when half the dots are "large"

**New approach:**
- Expected performance is based on **draft round** only (not individual pick), using data-driven medians from 2018–2022 historical classes
- Sizing is **directional**: overperformers get larger than base, underperformers get smaller than base
- The story becomes readable at a glance: big dot high on chart = exceeded draft slot expectations; small dot low = bust

The `pick_value_curve.json` is no longer used for production dot sizing. The `pickValueDelta` / `deltaToRadius` logic in Draft Results view is **unchanged**.

---

## Constants (Data-Driven — Do Not Change Without Re-Running Analysis)

```
ROUND_EXPECTED_PCT:
  R1 → P78   (2018–2022 median, including washouts as P0)
  R2 → P69
  R3 → P47
  R4 → P35
  R5 → P22
  R6 → P9
  R7 → P0
  UDFA / null → P0

Dot radii:
  BASE_R      = 6    (unchanged)
  PROD_R_MIN  = 4.5  (underperformer floor — visible but clearly smaller)
  PROD_R_MAX  = 12.0 (overperformer cap — large but not overwhelming)
  NORM_POS    = 55   (delta / 55 → t for overperformers)
  NORM_NEG    = 40   (|delta| / 40 → t for underperformers)
```

---

## File Changes

### 1. `lib/chartConstants.ts` — Add tier-band lookup

Add this export near the top of the file (after imports, before or alongside existing constants):

```typescript
/**
 * Data-driven expected usage percentile (position-normalized snap percentile)
 * by draft round. Computed from 2018–2022 historical classes including washouts
 * as P0. Used for production-mode dot sizing in PlayerDots.tsx.
 */
export const ROUND_EXPECTED_PCT: Record<number, number> = {
  1: 78,
  2: 69,
  3: 47,
  4: 35,
  5: 22,
  6: 9,
  7: 0,
};
// Undrafted / null rd_drafted → 0 (handled at call site)
```

---

### 2. `lib/chartMath.ts` — Replace `expectedPickValue` with tier-band lookup

**Extend the existing import from `chartConstants` (line 19 — do NOT add a second import from the same module):**

Old:
```typescript
import { BAND_ASSIGNMENTS, POSITIONS, POSITION_ORDER, TIER_DEFS } from './chartConstants';
```
New:
```typescript
import { BAND_ASSIGNMENTS, POSITIONS, POSITION_ORDER, ROUND_EXPECTED_PCT, TIER_DEFS } from './chartConstants';
```

**Remove the `pickValueMap` build block.** After this change, `pickValueMap` is never read and TypeScript will error on it. The `pickValueCurve` param itself stays (it's optional, the `DotPosition` JSDoc already notes it's retained for future use). Find and delete these lines (~541–546):
```typescript
// Build pick → normalized value lookup. Virtual pick 257 = undrafted (≈ last val × 0.3).
const pickValueMap = new Map<number, number>();
if (pickValueCurve && pickValueCurve.length > 0) {
  for (const e of pickValueCurve) pickValueMap.set(e.pick, e.normalized);
  const lastVal = pickValueCurve[pickValueCurve.length - 1]?.normalized ?? 0;
  pickValueMap.set(257, Math.max(0, lastVal * 0.3));
}
```

**Find the block that computes `expectedPickValue` (~line 612–616):**
```typescript
// Expected value from pick_value_curve for this player's actual draft slot.
const pickNum = (player.pick_drafted != null && player.pick_drafted > 0)
  ? Math.min(player.pick_drafted, 256)
  : 257;
const expectedPickValue = pickValueMap.get(pickNum) ?? 0;
```

**Replace it with:**
```typescript
// Expected usage percentile for this player's draft round (tier-band approach).
// R7 and UDFA both default to 0 — any contribution from those slots is an overperformance.
const expectedPickValue = player.rd_drafted != null
  ? (ROUND_EXPECTED_PCT[player.rd_drafted] ?? 0)
  : 0;
```

---

### 3. `components/chart/PlayerDots.tsx` — Directional sizing

**Replace the production radius block (lines ~229–241):**

Old:
```typescript
// Production mode: absolute delta (USG score vs expected pick value) drives radius.
// Both overperformers and underperformers get larger dots; direction shown via leader lines.
const PROD_R_NEUTRAL = BASE_R + 1.5;
const PROD_R_MAX     = BASE_R + 8;
let productionR = PROD_R_NEUTRAL;
if (isProductionMode && !isMobile) {
  const stepScore = chartMode === 'career'
    ? player.outcomeScore ?? null
    : (player.stepScores ?? []).find(s => s.stepId === currentStepId)?.score ?? null;
  if (stepScore !== null && expectedPickValue > 0) {
    const absDelta = Math.abs(stepScore - expectedPickValue);
    const t = Math.min(absDelta / 60, 1);
    productionR = PROD_R_NEUTRAL + t * (PROD_R_MAX - PROD_R_NEUTRAL);
  }
}
```

New:
```typescript
// Production mode: directional tier-band delta drives radius.
// Overperformers (stepScore > expected) grow above BASE_R; underperformers shrink below.
// Expected is the historical median usage percentile for this player's draft round.
// Default is BASE_R (was PROD_R_NEUTRAL = 7.5 — intentional change, no-data dots render at base size).
const PROD_R_MIN = 4.5;
const PROD_R_MAX = 12.0;
const NORM_POS   = 55;
const NORM_NEG   = 40;
let productionR = BASE_R;
if (isProductionMode && !isMobile) {
  const stepScore = chartMode === 'career'
    ? player.outcomeScore ?? null
    : (player.stepScores ?? []).find(s => s.stepId === currentStepId)?.score ?? null;
  if (stepScore !== null) {
    const delta = stepScore - expectedPickValue; // signed: positive = overperformer
    if (delta >= 0) {
      const t = Math.min(delta / NORM_POS, 1.0);
      productionR = BASE_R + t * (PROD_R_MAX - BASE_R);
    } else {
      const t = Math.min(Math.abs(delta) / NORM_NEG, 1.0);
      productionR = BASE_R - t * (BASE_R - PROD_R_MIN);
    }
  }
}
```

**Also update the two-line comment just above the `const r = isMobile ? ...` assignment:**

Old:
```typescript
// In production mode, exclude `r` from transition so radius snaps instantly
// when entering from Draft Results (variable delta-size → uniform BASE_R+1.5).
```
New:
```typescript
// In production mode, exclude `r` from transition so radius snaps instantly
// when entering from Draft Results (variable delta-size → directional tier-band size).
```

---

## What NOT to Touch

- `deltaToRadius()` function — still used in Draft Results view (`inDraftedView`)
- `pickValueDelta` field on `DotPosition` — still used by Draft Results leader lines
- The `pickValueCurve` fetch in `DraftChart.tsx` — still needed for `pickValueDelta`
- `pick_value_curve.json` — keep in `/public`, still used for Draft Results
- Mobile path (`isMobile ? BASE_R`) — unchanged
- All ST-wash, Pro Bowl ring, All-Pro star logic — untouched

---

## Verification

After making changes:

1. `npm run build` — no TypeScript errors
2. Spot-check the 2021 class at Year 3 (2023 season):
   - **Brock Purdy** (R7): should be at or near max dot size — he's a huge outlier
   - **Kyren Williams** (R5): should be large
   - **Ja'Marr Chase / Micah Parsons** (R1): should be slightly above base, not dramatically larger
   - **Payton Turner** (R1, barely played): should be clearly smaller than base
   - **Kyle Trask** (R2, never played): should be at or near minimum size
3. In Draft Results view: dot sizes should be unchanged from before (deltaToRadius still in effect)
4. Career step: same directional logic applies (uses `player.outcomeScore`)
