/**
 * lib/chartConstants.ts
 *
 * All configuration constants for the DraftMap chart.
 * Extracted from chart-engine.js — source of truth for positions, colors,
 * tier definitions, band assignments, and positional measurable ranges.
 *
 * Used by: PlayerCard.tsx (Phase 2b), full D3 refactor (Phase 2c/2d).
 * chart-engine.js still has its own copies of these — this file is the
 * TypeScript foundation, not a live import from the engine yet.
 */

// ── Position types ────────────────────────────────────────────────────────────

export type Position =
  | 'QB' | 'RB' | 'WR' | 'TE' | 'OT' | 'IOL'
  | 'EDGE' | 'DT' | 'LB' | 'CB' | 'S';

export type RoundNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

// ── Tier definition ───────────────────────────────────────────────────────────

export interface TierDef {
  name: string;
  color: string;
  bg: string;
}

// ── Positional measurable range ───────────────────────────────────────────────

export interface MeasurableRange {
  lowest: number;
  good: number;
  great: number;
  highest: number;
  isKey: boolean;
}

export type PositionalRangeData = Partial<Record<Position, Record<string, MeasurableRange>>>;

// ── Positions ─────────────────────────────────────────────────────────────────

export const POSITIONS: { defense: Position[]; offense: Position[] } = {
  defense: ['EDGE', 'DT', 'LB', 'CB', 'S'],
  offense: ['QB', 'RB', 'WR', 'TE', 'OT', 'IOL'],
};

export const POSITION_ORDER: Position[] = [
  'QB', 'RB', 'WR', 'TE', 'OT', 'IOL', 'EDGE', 'DT', 'LB', 'CB', 'S',
];

// ── Band / role assignments per position ─────────────────────────────────────

export const BAND_ASSIGNMENTS: Record<Position, { top: string; mid: string; bot: string }> = {
  QB:   { top: 'Pocket Passer',   mid: 'Balanced', bot: 'Running QB'       },
  RB:   { top: 'Power',           mid: 'Balanced', bot: 'Speed'            },
  WR:   { top: 'Size/Possession', mid: 'Balanced', bot: 'Speed/Quickness'  },
  TE:   { top: 'Blocking',        mid: 'Balanced', bot: 'Receiving'        },
  OT:   { top: 'Power/Strength',  mid: 'Balanced', bot: 'Zone/Agility'    },
  IOL:  { top: 'Power/Strength',  mid: 'Balanced', bot: 'Zone/Agility'    },
  EDGE: { top: 'Power Rusher',    mid: 'Balanced', bot: 'Speed Rusher'    },
  DT:   { top: 'Pass Rusher',     mid: 'Balanced', bot: 'Run Stuffer'     },
  LB:   { top: 'Power/Tackling',  mid: 'Balanced', bot: 'Range/Coverage'  },
  CB:   { top: 'Nickel/Slot',     mid: 'Balanced', bot: 'Outside'         },
  S:    { top: 'Free Safety',     mid: 'Balanced', bot: 'Strong Safety'   },
};

// ── Round colors (green → purple progression) ────────────────────────────────

export const ROUND_COLORS: Record<number, string> = {
  1: '#34d399',
  2: '#a3e635',
  3: '#facc15',
  4: '#fb923c',
  5: '#f87171',
  6: '#c084fc',
  7: '#94a3b8',
};

// ── School colors (100+ schools) ─────────────────────────────────────────────

export const SCHOOL_COLORS: Record<string, { fill: string; stroke: string }> = {
  "Alabama":            { fill: "#9e1b32", stroke: "#FFFFFF" },
  "Arizona":            { fill: "#AB0520", stroke: "#0C234B" },
  "Arizona State":      { fill: "#990033", stroke: "#FFB310" },
  "Arkansas":           { fill: "#9D2235", stroke: "#FFFFFF" },
  "Auburn":             { fill: "#0C2340", stroke: "#F26522" },
  "BYU":                { fill: "#002255", stroke: "#FFFFFF" },
  "Baylor":             { fill: "#003015", stroke: "#fecb00" },
  "Boise State":        { fill: "#09347A", stroke: "#F1632A" },
  "Boston College":     { fill: "#910039", stroke: "#B38F59" },
  "Buffalo":            { fill: "#005bbb", stroke: "#FFFFFF" },
  "California":         { fill: "#041E42", stroke: "#FFC72C" },
  "Cincinnati":         { fill: "#000000", stroke: "#E00122" },
  "Clemson":            { fill: "#F56600", stroke: "#522D80" },
  "Duke":               { fill: "#001A57", stroke: "#FFFFFF" },
  "Florida":            { fill: "#0021a5", stroke: "#FA4616" },
  "Florida State":      { fill: "#782F40", stroke: "#CEB888" },
  "Georgia":            { fill: "#DA291C", stroke: "#000000" },
  "Georgia State":      { fill: "#0039A6", stroke: "#FFFFFF" },
  "Georgia Tech":       { fill: "#C59353", stroke: "#FFFFFF" },
  "Illinois":           { fill: "#e04e39", stroke: "#13294b" },
  "Indiana":            { fill: "#990000", stroke: "#EEEDEB" },
  "Iowa":               { fill: "#000000", stroke: "#FFE100" },
  "Iowa State":         { fill: "#a6192e", stroke: "#FDC82F" },
  "Kansas":             { fill: "#0051BA", stroke: "#E8000D" },
  "Kansas State":       { fill: "#512888", stroke: "#FFFFFF" },
  "Kentucky":           { fill: "#0033A0", stroke: "#FFFFFF" },
  "LSU":                { fill: "#582c83", stroke: "#ffc72c" },
  "Louisville":         { fill: "#AD0000", stroke: "#000000" },
  "Maryland":           { fill: "#c8102e", stroke: "#FFFFFF" },
  "Miami":              { fill: "#005030", stroke: "#f47321" },
  "Michigan":           { fill: "#ffcb05", stroke: "#00274c" },
  "Michigan State":     { fill: "#18453B", stroke: "#FFFFFF" },
  "Mississippi State":  { fill: "#660000", stroke: "#FFFFFF" },
  "Missouri":           { fill: "#000000", stroke: "#F1B82D" },
  "NC State":           { fill: "#CC0000", stroke: "#FFFFFF" },
  "Navy":               { fill: "#00205b", stroke: "#c5b783" },
  "Nebraska":           { fill: "#e41c38", stroke: "#fdf2d9" },
  "North Dakota State": { fill: "#9CA3AF", stroke: "#6B7280" },
  "Northwestern":       { fill: "#4E2A84", stroke: "#FFFFFF" },
  "Notre Dame":         { fill: "#0C2340", stroke: "#C99700" },
  "Ohio State":         { fill: "#bb0000", stroke: "#666666" },
  "Oklahoma":           { fill: "#841617", stroke: "#FDF9D8" },
  "Ole Miss":           { fill: "#00205b", stroke: "#c8102e" },
  "Oregon":             { fill: "#154733", stroke: "#FEE123" },
  "Penn State":         { fill: "#041e42", stroke: "#FFFFFF" },
  "Pittsburgh":         { fill: "#1c2957", stroke: "#cdb87d" },
  "San Diego State":    { fill: "#C41230", stroke: "#000000" },
  "South Carolina":     { fill: "#73000A", stroke: "#000000" },
  "Stanford":           { fill: "#8C1515", stroke: "#FFFFFF" },
  "Stephen F. Austin":  { fill: "#9CA3AF", stroke: "#6B7280" },
  "TCU":                { fill: "#4d1979", stroke: "#FFFFFF" },
  "Tennessee":          { fill: "#FF8200", stroke: "#FFFFFF" },
  "Texas":              { fill: "#BF5700", stroke: "#FFFFFF" },
  "Texas A&M":          { fill: "#500000", stroke: "#FFFFFF" },
  "Texas Tech":         { fill: "#CC0000", stroke: "#000000" },
  "Toledo":             { fill: "#002569", stroke: "#ffce00" },
  "UCF":                { fill: "#000000", stroke: "#BA9B37" },
  "UCLA":               { fill: "#0072ce", stroke: "#ffc72c" },
  "UConn":              { fill: "#000E2F", stroke: "#FFFFFF" },
  "USC":                { fill: "#990000", stroke: "#FFCC00" },
  "UTSA":               { fill: "#0c2340", stroke: "#FFFFFF" },
  "Utah":               { fill: "#CC0000", stroke: "#FFFFFF" },
  "Vanderbilt":         { fill: "#000000", stroke: "#997F3D" },
  "Virginia":           { fill: "#041e42", stroke: "#fa4616" },
  "Wake Forest":        { fill: "#000000", stroke: "#9E7E38" },
  "Washington":         { fill: "#363c74", stroke: "#e8d3a2" },
  "Western Michigan":   { fill: "#6c4023", stroke: "#b5a167" },
  "Wisconsin":          { fill: "#c5050c", stroke: "#FFFFFF" },
};

// ── Tier definitions (order = Great → Role Player/Project) ───────────────────

export const TIER_DEFS: TierDef[] = [
  { name: 'Great',                color: '#B45309', bg: 'rgba(180,83,9,0.06)'    },
  { name: 'Good',                 color: '#0E7490', bg: 'rgba(14,116,144,0.05)'  },
  { name: 'Solid',                color: '#475DA7', bg: 'rgba(71,93,167,0.04)'   },
  { name: 'Role Player / Project', color: '#6B7280', bg: 'rgba(107,114,128,0.03)' },
];

/** Fraction of R1 players that fall in the "Great" tier (picks 1–15 out of ~21). */
export const R1_SPLIT = 15 / 21;

// ── Positional measurable range data ─────────────────────────────────────────
// Thresholds for each combine measurable by position.
// Used in PlayerCard zone-track bars to grade a player vs. their positional peers.
// Fields: lowest / good / great / highest (range endpoints) + isKey (key metric flag).
// For "lower is better" measurables (times), the gradient runs right-to-left in the UI.

export const cardPositionalRangeData: PositionalRangeData = {
  CB: {
    split10: { lowest: 1.64,  good: 1.58,  great: 1.54,  highest: 1.48,  isKey: false },
    cone3:   { lowest: 7.40,  good: 7.10,  great: 6.90,  highest: 6.60,  isKey: true  },
    forty:   { lowest: 4.65,  good: 4.50,  great: 4.40,  highest: 4.25,  isKey: true  },
    arm:     { lowest: 29.5,  good: 31,    great: 32,    highest: 33.5,  isKey: true  },
    bench:   { lowest: 9.5,   good: 14,    great: 17,    highest: 21.5,  isKey: false },
    broad:   { lowest: 120,   good: 123,   great: 125,   highest: 128,   isKey: true  },
    hand:    { lowest: 8.25,  good: 9.0,   great: 9.5,   highest: 10.25, isKey: false },
    height:  { lowest: 5090,  good: 6000,  great: 6020,  highest: 6050,  isKey: true  },
    shuttle: { lowest: 4.70,  good: 4.40,  great: 4.20,  highest: 3.90,  isKey: true  },
    vertical:{ lowest: 30.5,  good: 35,    great: 38,    highest: 42.5,  isKey: true  },
    weight:  { lowest: 178,   good: 190,   great: 198,   highest: 210,   isKey: true  },
  },
  DT: {
    split10: { lowest: 1.875, good: 1.80,  great: 1.75,  highest: 1.675, isKey: false },
    cone3:   { lowest: 8.45,  good: 8.00,  great: 7.70,  highest: 7.25,  isKey: true  },
    forty:   { lowest: 5.40,  good: 5.10,  great: 4.90,  highest: 4.60,  isKey: true  },
    arm:     { lowest: 30.5,  good: 32,    great: 33,    highest: 34.5,  isKey: true  },
    bench:   { lowest: 15,    good: 24,    great: 30,    highest: 39,    isKey: false },
    broad:   { lowest: 94.5,  good: 105,   great: 112,   highest: 122.5, isKey: true  },
    hand:    { lowest: 8.75,  good: 9.5,   great: 10,    highest: 10.75, isKey: false },
    height:  { lowest: 6000,  good: 6020,  great: 6030,  highest: 6050,  isKey: true  },
    shuttle: { lowest: 4.94,  good: 4.79,  great: 4.69,  highest: 4.54,  isKey: true  },
    vertical:{ lowest: 24.5,  good: 29,    great: 32,    highest: 36.5,  isKey: true  },
    weight:  { lowest: 287.5, good: 298,   great: 305,   highest: 315.5, isKey: true  },
  },
  EDGE: {
    split10: { lowest: 1.725, good: 1.65,  great: 1.60,  highest: 1.525, isKey: false },
    cone3:   { lowest: 7.25,  good: 7.10,  great: 7.00,  highest: 6.85,  isKey: false },
    forty:   { lowest: 4.85,  good: 4.70,  great: 4.60,  highest: 4.45,  isKey: true  },
    arm:     { lowest: 30.5,  good: 32,    great: 33,    highest: 34.5,  isKey: true  },
    bench:   { lowest: 16,    good: 22,    great: 26,    highest: 32,    isKey: false },
    broad:   { lowest: 114.5, good: 119,   great: 122,   highest: 126.5, isKey: true  },
    hand:    { lowest: 8.75,  good: 9.5,   great: 10,    highest: 10.75, isKey: false },
    height:  { lowest: 6000,  good: 6030,  great: 6040,  highest: 6060,  isKey: true  },
    shuttle: { lowest: 4.55,  good: 4.40,  great: 4.30,  highest: 4.15,  isKey: true  },
    vertical:{ lowest: 28.5,  good: 33,    great: 36,    highest: 40.5,  isKey: true  },
    weight:  { lowest: 230,   good: 245,   great: 255,   highest: 270,   isKey: true  },
  },
  IOL: {
    split10: { lowest: 1.875, good: 1.80,  great: 1.75,  highest: 1.675, isKey: false },
    cone3:   { lowest: 8.45,  good: 8.00,  great: 7.70,  highest: 7.25,  isKey: false },
    forty:   { lowest: 5.35,  good: 5.20,  great: 5.10,  highest: 4.95,  isKey: true  },
    arm:     { lowest: 30.5,  good: 32,    great: 33,    highest: 34.5,  isKey: true  },
    bench:   { lowest: 15,    good: 24,    great: 30,    highest: 39,    isKey: true  },
    broad:   { lowest: 96,    good: 105,   great: 111,   highest: 120,   isKey: true  },
    hand:    { lowest: 8.75,  good: 9.5,   great: 10,    highest: 10.75, isKey: false },
    height:  { lowest: 6000,  good: 6020,  great: 6040,  highest: 6060,  isKey: false },
    shuttle: { lowest: 4.94,  good: 4.79,  great: 4.69,  highest: 4.54,  isKey: true  },
    vertical:{ lowest: 24.5,  good: 29,    great: 32,    highest: 36.5,  isKey: true  },
    weight:  { lowest: 287.5, good: 298,   great: 305,   highest: 315.5, isKey: false },
  },
  LB: {
    split10: { lowest: 1.68,  good: 1.62,  great: 1.58,  highest: 1.52,  isKey: false },
    cone3:   { lowest: 7.50,  good: 7.20,  great: 7.00,  highest: 6.70,  isKey: true  },
    forty:   { lowest: 4.80,  good: 4.65,  great: 4.55,  highest: 4.40,  isKey: true  },
    arm:     { lowest: 29.5,  good: 31,    great: 32,    highest: 33.5,  isKey: false },
    bench:   { lowest: 12,    good: 18,    great: 22,    highest: 28,    isKey: false },
    broad:   { lowest: 114.5, good: 119,   great: 122,   highest: 126.5, isKey: true  },
    hand:    { lowest: 7.5,   good: 9.0,   great: 10,    highest: 11.5,  isKey: false },
    height:  { lowest: 5090,  good: 6000,  great: 6010,  highest: 6040,  isKey: false },
    shuttle: { lowest: 4.54,  good: 4.39,  great: 4.29,  highest: 4.14,  isKey: true  },
    vertical:{ lowest: 27,    good: 33,    great: 37,    highest: 43,    isKey: true  },
    weight:  { lowest: 222.5, good: 230,   great: 235,   highest: 242.5, isKey: true  },
  },
  OT: {
    split10: { lowest: 1.86,  good: 1.80,  great: 1.76,  highest: 1.70,  isKey: false },
    cone3:   { lowest: 8.00,  good: 7.85,  great: 7.75,  highest: 7.60,  isKey: false },
    forty:   { lowest: 5.35,  good: 5.20,  great: 5.10,  highest: 4.95,  isKey: true  },
    arm:     { lowest: 31,    good: 32.5,  great: 33.5,  highest: 35,    isKey: true  },
    bench:   { lowest: 23,    good: 26,    great: 28,    highest: 31,    isKey: true  },
    broad:   { lowest: 103,   good: 109,   great: 113,   highest: 119,   isKey: true  },
    hand:    { lowest: 8.75,  good: 9.5,   great: 10,    highest: 10.75, isKey: false },
    height:  { lowest: 6040,  good: 6050,  great: 6060,  highest: 6080,  isKey: true  },
    shuttle: { lowest: 4.94,  good: 4.79,  great: 4.69,  highest: 4.54,  isKey: true  },
    vertical:{ lowest: 28,    good: 31,    great: 33,    highest: 36,    isKey: true  },
    weight:  { lowest: 287.5, good: 298,   great: 305,   highest: 315.5, isKey: false },
  },
  QB: {
    split10: { lowest: 1.80,  good: 1.65,  great: 1.55,  highest: 1.40,  isKey: false },
    cone3:   { lowest: 7.375, good: 7.15,  great: 7.00,  highest: 6.775, isKey: false },
    forty:   { lowest: 4.85,  good: 4.70,  great: 4.60,  highest: 4.45,  isKey: false },
    arm:     { lowest: 29.5,  good: 31,    great: 32,    highest: 33.5,  isKey: false },
    bench:   { lowest: 9.5,   good: 14,    great: 17,    highest: 21.5,  isKey: false },
    broad:   { lowest: 114,   good: 120,   great: 124,   highest: 130,   isKey: false },
    hand:    { lowest: 8.75,  good: 9.5,   great: 10,    highest: 10.75, isKey: true  },
    height:  { lowest: 5110,  good: 6010,  great: 6030,  highest: 6050,  isKey: true  },
    shuttle: { lowest: 4.50,  good: 4.35,  great: 4.25,  highest: 4.10,  isKey: false },
    vertical:{ lowest: 27.5,  good: 32,    great: 35,    highest: 39.5,  isKey: false },
    weight:  { lowest: 177.5, good: 200,   great: 215,   highest: 237.5, isKey: false },
  },
  RB: {
    split10: { lowest: 1.665, good: 1.59,  great: 1.54,  highest: 1.465, isKey: false },
    cone3:   { lowest: 7.40,  good: 7.10,  great: 6.90,  highest: 6.60,  isKey: true  },
    forty:   { lowest: 4.74,  good: 4.59,  great: 4.49,  highest: 4.34,  isKey: true  },
    arm:     { lowest: 28.5,  good: 30,    great: 31,    highest: 32.5,  isKey: false },
    bench:   { lowest: 14,    good: 20,    great: 24,    highest: 30,    isKey: false },
    broad:   { lowest: 115,   good: 121,   great: 125,   highest: 131,   isKey: true  },
    hand:    { lowest: 8.25,  good: 9.0,   great: 9.5,   highest: 10.25, isKey: false },
    height:  { lowest: 5080,  good: 5110,  great: 6000,  highest: 6020,  isKey: false },
    shuttle: { lowest: 4.54,  good: 4.39,  great: 4.29,  highest: 4.14,  isKey: true  },
    vertical:{ lowest: 27,    good: 33,    great: 37,    highest: 43,    isKey: true  },
    weight:  { lowest: 190,   good: 205,   great: 215,   highest: 230,   isKey: true  },
  },
  S: {
    split10: { lowest: 1.665, good: 1.59,  great: 1.54,  highest: 1.465, isKey: false },
    cone3:   { lowest: 7.325, good: 7.10,  great: 6.95,  highest: 6.725, isKey: true  },
    forty:   { lowest: 4.74,  good: 4.59,  great: 4.49,  highest: 4.34,  isKey: true  },
    arm:     { lowest: 29.5,  good: 31,    great: 32,    highest: 33.5,  isKey: false },
    bench:   { lowest: 10.5,  good: 15,    great: 18,    highest: 22.5,  isKey: false },
    broad:   { lowest: 120,   good: 123,   great: 125,   highest: 128,   isKey: true  },
    hand:    { lowest: 8.25,  good: 9.0,   great: 9.5,   highest: 10.25, isKey: false },
    height:  { lowest: 5100,  good: 6000,  great: 6010,  highest: 6030,  isKey: false },
    shuttle: { lowest: 4.54,  good: 4.39,  great: 4.29,  highest: 4.14,  isKey: true  },
    vertical:{ lowest: 29.5,  good: 34,    great: 37,    highest: 41.5,  isKey: true  },
    weight:  { lowest: 187.5, good: 195,   great: 200,   highest: 207.5, isKey: true  },
  },
  TE: {
    split10: { lowest: 1.725, good: 1.65,  great: 1.60,  highest: 1.525, isKey: false },
    cone3:   { lowest: 7.35,  good: 7.20,  great: 7.10,  highest: 6.95,  isKey: true  },
    forty:   { lowest: 4.80,  good: 4.65,  great: 4.55,  highest: 4.40,  isKey: false },
    arm:     { lowest: 30.5,  good: 32,    great: 33,    highest: 34.5,  isKey: false },
    bench:   { lowest: 14,    good: 20,    great: 24,    highest: 30,    isKey: false },
    broad:   { lowest: 114.5, good: 119,   great: 122,   highest: 126.5, isKey: false },
    hand:    { lowest: 8.75,  good: 9.5,   great: 10,    highest: 10.75, isKey: false },
    height:  { lowest: 6020,  good: 6040,  great: 6050,  highest: 6070,  isKey: true  },
    shuttle: { lowest: 4.55,  good: 4.40,  great: 4.30,  highest: 4.15,  isKey: true  },
    vertical:{ lowest: 28.5,  good: 33,    great: 36,    highest: 40.5,  isKey: true  },
    weight:  { lowest: 225,   good: 240,   great: 250,   highest: 265,   isKey: true  },
  },
  WR: {
    split10: { lowest: 1.64,  good: 1.58,  great: 1.54,  highest: 1.48,  isKey: false },
    cone3:   { lowest: 7.30,  good: 7.00,  great: 6.80,  highest: 6.50,  isKey: true  },
    forty:   { lowest: 4.565, good: 4.49,  great: 4.44,  highest: 4.365, isKey: true  },
    arm:     { lowest: 29.5,  good: 31,    great: 32,    highest: 33.5,  isKey: false },
    bench:   { lowest: 9.5,   good: 14,    great: 17,    highest: 21.5,  isKey: false },
    broad:   { lowest: 120,   good: 123,   great: 125,   highest: 128,   isKey: true  },
    hand:    { lowest: 8.75,  good: 9.5,   great: 10,    highest: 10.75, isKey: false },
    height:  { lowest: 5100,  good: 6000,  great: 6020,  highest: 6040,  isKey: true  },
    shuttle: { lowest: 4.70,  good: 4.40,  great: 4.20,  highest: 3.90,  isKey: true  },
    vertical:{ lowest: 30.5,  good: 35,    great: 38,    highest: 42.5,  isKey: true  },
    weight:  { lowest: 170,   good: 185,   great: 195,   highest: 210,   isKey: true  },
  },
};

// ── NFL Team colors ───────────────────────────────────────────────────────────
// Pre-computed best visible color per team on a light/cream background.
// Dark primary colors (luminance < 50) fall back to secondary where the
// secondary is more visible. Both full names and common abbreviations are
// keyed so whatever format Airtable sends resolves correctly.

export interface TeamColor {
  fill: string;
  /** Stroke is always a slightly darkened version of fill, computed at render time */
}

const _TEAMS: Array<[string[], string]> = [
  // AFC East
  [['Buffalo Bills',           'BUF'],                          '#C60C30'],
  [['Miami Dolphins',          'MIA'],                          '#008E97'],
  [['New England Patriots',    'NWE', 'NE',  'NEP'],            '#C60C30'],
  [['New York Jets',           'NYJ'],                          '#125740'],
  // AFC North
  [['Baltimore Ravens',        'BAL'],                          '#241773'],
  [['Cincinnati Bengals',      'CIN'],                          '#FB4F14'],
  [['Cleveland Browns',        'CLE'],                          '#FF3C00'],
  [['Pittsburgh Steelers',     'PIT'],                          '#FFB612'],
  // AFC South
  [['Houston Texans',          'HOU'],                          '#A71930'],
  [['Indianapolis Colts',      'IND'],                          '#002C5F'],
  [['Jacksonville Jaguars',    'JAX'],                          '#D7A22A'],
  [['Tennessee Titans',        'TEN'],                          '#4B92DB'],
  // AFC West
  [['Denver Broncos',          'DEN'],                          '#FB4F14'],
  [['Kansas City Chiefs',      'KAN', 'KC',  'KCC'],            '#E31837'],
  [['Las Vegas Raiders',       'LVR', 'LV',  'OAK', 'RAI'],    '#A5ACAF'],
  [['Los Angeles Chargers',    'LAC'],                          '#0080C6'],
  // NFC East
  [['Dallas Cowboys',          'DAL'],                          '#003594'],
  [['New York Giants',         'NYG'],                          '#A71930'],
  [['Philadelphia Eagles',     'PHI'],                          '#004C54'],
  [['Washington Commanders',   'WAS', 'WSH', 'WFT'],            '#FFB612'],
  // NFC North
  [['Chicago Bears',           'CHI'],                          '#C83803'],
  [['Detroit Lions',           'DET'],                          '#0076B6'],
  [['Green Bay Packers',       'GNB', 'GB',  'GBP'],            '#FFB612'],
  [['Minnesota Vikings',       'MIN'],                          '#4F2683'],
  // NFC South
  [['Atlanta Falcons',         'ATL'],                          '#A71930'],
  [['Carolina Panthers',       'CAR'],                          '#0085CA'],
  [['New Orleans Saints',      'NOR', 'NO',  'NOS'],            '#D3BC8D'],
  [['Tampa Bay Buccaneers',    'TAM', 'TB',  'TBB'],            '#D50A0A'],
  // NFC West
  [['Arizona Cardinals',       'ARI'],                          '#97233F'],
  [['Los Angeles Rams',        'LAR', 'LA',  'RAM'],            '#003594'],
  [['San Francisco 49ers',     'SFO', 'SF',  'SFN'],            '#AA0000'],
  [['Seattle Seahawks',        'SEA'],                          '#69BE28'],
];

/** Lookup by full team name or any abbreviation variant. Returns fill hex. */
export const TEAM_COLORS: Record<string, TeamColor> = (() => {
  const map: Record<string, TeamColor> = {};
  for (const [aliases, fill] of _TEAMS) {
    const entry: TeamColor = { fill };
    for (const alias of aliases) {
      map[alias] = entry;
      map[alias.toUpperCase()] = entry;
      map[alias.toLowerCase()] = entry;
    }
  }
  return map;
})();

/** Derive a stroke color from a fill hex: darken by ~20%. */
export function teamStrokeFromFill(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const darken = (c: number) => Math.max(0, Math.round(c * 0.75)).toString(16).padStart(2, '0');
  return `#${darken(r)}${darken(g)}${darken(b)}`;
}
