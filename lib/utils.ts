/**
 * lib/utils.ts
 * Shared utility functions. Safe to import from both client and server.
 */

/**
 * Format an NFL-format height string for display.
 * "6020" → "6'2"" | "6025" → 6'2½" | null → "—"
 *
 * NFL format: 4 digits — first digit = feet, next 2 = whole inches, last = quarter-inches.
 * e.g. "6020" = 6 feet, 2 inches, 0 quarter-inches
 *      "6025" = 6 feet, 2 inches, 2 quarter-inches (½ inch)
 */
export function fmtHeight(h: string | null): string {
  if (!h || h.length < 3) return "—";
  const feet = parseInt(h[0], 10);
  const inches = parseInt(h.slice(1, 3), 10);
  const quarters = h.length >= 4 ? parseInt(h[3], 10) : 0;

  const fracMap: Record<number, string> = { 0: "", 1: "¼", 2: "½", 3: "¾" };
  const frac = fracMap[quarters] ?? "";
  return `${feet}'${inches}${frac}"`;
}

/**
 * Format a number to N decimal places, or return "—" if null.
 */
export function fmtNum(n: number | null, decimals = 2): string {
  if (n === null || n === undefined) return "—";
  return n.toFixed(decimals);
}

/**
 * Return the Tailwind color class for a given round number.
 */
export function roundColorClass(rd: number | null): string {
  const map: Record<number, string> = {
    1: "text-rd-1",
    2: "text-rd-2",
    3: "text-rd-3",
    4: "text-rd-4",
    5: "text-rd-5",
    6: "text-rd-6",
    7: "text-rd-7",
  };
  return rd ? (map[rd] ?? "text-dm-text-secondary") : "text-dm-text-secondary";
}

/**
 * Return the hex color for a given round number (for use in non-Tailwind contexts).
 */
export function roundColor(rd: number | null): string {
  const map: Record<number, string> = {
    1: "#34d399",
    2: "#a3e635",
    3: "#facc15",
    4: "#fb923c",
    5: "#f87171",
    6: "#c084fc",
    7: "#94a3b8",
  };
  return rd ? (map[rd] ?? "#94a3b8") : "#94a3b8";
}

/**
 * Return the tier label and color for a player based on projected round/rank.
 */
export function getTier(rd: number | null, rank: number | null): {
  label: string;
  color: string;
} {
  if (rd === 1 && rank !== null && rank <= 15) {
    return { label: "Great",          color: "#B45309" };
  }
  if (rd === 1 || rd === 2) {
    return { label: "Good",           color: "#0E7490" };
  }
  if (rd === 3) {
    return { label: "Solid",          color: "#475DA7" };
  }
  return   { label: "Role / Project", color: "#6B7280" };
}

/**
 * Offensive positions in chart order.
 */
export const OFFENSE_POSITIONS = ["QB", "RB", "WR", "TE", "OT", "IOL"] as const;

/**
 * Defensive positions in chart order.
 */
export const DEFENSE_POSITIONS = ["EDGE", "DT", "LB", "CB", "S"] as const;

/**
 * All positions in chart order.
 */
export const ALL_POSITIONS = [...OFFENSE_POSITIONS, ...DEFENSE_POSITIONS] as const;

export type Position = (typeof ALL_POSITIONS)[number];
