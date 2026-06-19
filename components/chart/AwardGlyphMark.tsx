import type { AwardGlyph } from "@/lib/awardGlyph";
import {
  GLYPH_FILL, GLYPH_KEYLINE, GLYPH_KEYLINE_W, GLYPH_DOT_FRAC,
} from "@/lib/act3Constants";

/** One award glyph centered on a dot — ivory fill + navy keyline, painted under the
 *  fill so the outline reads at small size. Highest rung only (rookieAwardGlyph).
 *  pointer-events off so the dot keeps its own hover/click.
 *
 *  Shared between the Act-3 field (JellyfishField) and the sidebar Act Key (ActKey)
 *  so the legend's shapes are byte-identical to the chart's — import, never redraw. */
export function AwardGlyphMark({
  glyph, cx, cy, r,
}: { glyph: AwardGlyph; cx: number; cy: number; r: number }) {
  if (!glyph) return null;
  // Size by RANK (salience tracks importance): star biggest → triangle smallest.
  const RANK: Record<NonNullable<AwardGlyph>, number> = {
    star: 1.15, sparkle: 1.0, chevron: 1.0, triangle: 0.78,
  };
  const s = r * GLYPH_DOT_FRAC * RANK[glyph]; // glyph half-extent (px)
  const pt = (x: number, y: number) => `${(cx + x * s).toFixed(2)},${(cy + y * s).toFixed(2)}`;
  const poly = (pts: Array<[number, number]>) => "M" + pts.map(([x, y]) => pt(x, y)).join("L") + "Z";
  let d = "";
  if (glyph === "star") {
    d = poly([[0, -1], [0.25, -0.34], [0.95, -0.31], [0.4, 0.13], [0.59, 0.81], [0, 0.42], [-0.59, 0.81], [-0.4, 0.13], [-0.95, -0.31], [-0.25, -0.34]]);
  } else if (glyph === "sparkle") {
    d = poly([[0, -1], [0.2, -0.2], [1, 0], [0.2, 0.2], [0, 1], [-0.2, 0.2], [-1, 0], [-0.2, -0.2]]);
  } else if (glyph === "triangle") {
    d = poly([[0, -0.82], [0.8, 0.62], [-0.8, 0.62]]);
  } else { // chevron — rising double
    d = poly([[-0.9, -0.12], [0, -0.62], [0.9, -0.12], [0.9, 0.16], [0, -0.34], [-0.9, 0.16]])
      + poly([[-0.9, 0.5], [0, 0.0], [0.9, 0.5], [0.9, 0.78], [0, 0.28], [-0.9, 0.78]]);
  }
  return (
    <path
      d={d} fill={GLYPH_FILL} stroke={GLYPH_KEYLINE} strokeWidth={GLYPH_KEYLINE_W}
      strokeLinejoin="round" paintOrder="stroke" style={{ pointerEvents: "none" }}
    />
  );
}
