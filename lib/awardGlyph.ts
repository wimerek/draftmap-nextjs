/**
 * lib/awardGlyph.ts
 *
 * The single highest-rung award glyph a player wears on his Act 3 dot — computed
 * from his rookie window (draft_year .. draft_year+3). Pure; no React, no layout.
 *
 * Ladder (highest present wins): star > sparkle > chevron > triangle.
 *   star     = All-Pro (1st or 2nd team). MVP folds in (an MVP is always an All-Pro);
 *              the mvp column only NAMES the honor in the hover/card, never the mark.
 *   sparkle  = Pro Bowl (4-point — the "lesser star" below All-Pro).
 *   chevron  = All-Rookie (rookie-year honor; carries forward if nothing higher lands).
 *   triangle = special teams: ST PLACEMENT (stPrimary) OR an ST honor (ST All-Pro /
 *              ST Pro Bowl). Lowest rung, smallest mark. Descending points: 5 · 4 · 3 · 3.
 */
import type { Player } from "./sheets";

export type AwardGlyph = "star" | "sparkle" | "chevron" | "triangle" | null;

export function rookieAwardGlyph(player: Player): AwardGlyph {
  const seasons = player.seasonData;
  if (!seasons || seasons.length === 0) return null;
  const lo = player.draft_year;
  const hi = player.draft_year + 3; // 4-year rookie window, all rounds
  const win = seasons.filter((s) => s.season >= lo && s.season <= hi);
  if (win.length === 0) return null;

  if (win.some((s) => s.allPro || s.allPro2nd)) return "star";
  if (win.some((s) => s.proBowl)) return "sparkle";
  if (win.some((s) => s.allRookie)) return "chevron";
  if (player.usage?.stPrimary || win.some((s) => s.stAllPro || s.stProBowl)) return "triangle";
  return null;
}
