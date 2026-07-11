/**
 * lib/act3FieldGlyph.ts
 *
 * Phase Lambda Act-3 field glyph resolver — the brief-e award ladder with the ONE
 * Lambda amendment: the ST TRIANGLE ALWAYS WINS on ST-primary dots (spike resolution
 * #5). The award ladder (star > sparkle > chevron) is preserved verbatim from
 * lib/awardGlyph.ts; only the ST rung changes:
 *
 *   - ST-primary (usage.stPrimary) → TRIANGLE, suppressing any higher award (all 6
 *     ST-primary award holders earned ST-flavored honors, so the triangle never hides
 *     a "real" position honor; full honors still live on the card).
 *   - ST HONORS are DELETED product-wide (Lambda spec-death #6): a triangle from an
 *     ST All-Pro / ST Pro Bowl with NO ST-primary role must NOT render — only the
 *     ST-primary ROLE yields a triangle.
 *
 * Pure; no React. One-mark doctrine (≤1 glyph per dot).
 */
import type { Player } from './sheets';
import { rookieAwardGlyph, type AwardGlyph } from './awardGlyph';

export function act3FieldGlyph(player: Player): AwardGlyph {
  // ST-primary role → triangle wins over any award (suppression rule). ST HONORS are
  // deleted product-wide (Lambda spec-death #6): rookieAwardGlyph no longer emits a
  // triangle for an ST honor, so the star/sparkle/chevron ladder passes through verbatim.
  if (player.usage?.stPrimary) return 'triangle';
  return rookieAwardGlyph(player);
}
