/**
 * lib/chartConstants.ts
 *
 * All configuration constants for the DraftMap chart.
 */

// ── Luminance helper ──────────────────────────────────────────────────────────

export function luminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// ── Production dot sizing ─────────────────────────────────────────────────────

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
  offense: ['RB', 'WR', 'TE', 'OT', 'IOL', 'QB'],
};

export const POSITION_ORDER: Position[] = [
  'EDGE', 'DT', 'LB', 'CB', 'S', 'RB', 'WR', 'TE', 'OT', 'IOL', 'QB',
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

// ── Round colors (green -> purple progression) ────────────────────────────────

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

  // ── 2026 additions ────────────────────────────────────────────────────────
  "Central Michigan":       { fill: "#6A0032", stroke: "#FFC82E" },
  "Dartmouth":              { fill: "#00693E", stroke: "#FFFFFF" },
  "East Carolina":          { fill: "#592A8A", stroke: "#FFC526" },
  "Florida International":  { fill: "#081E3F", stroke: "#B6862C" },
  "Houston":                { fill: "#C8102E", stroke: "#FFFFFF" },
  "Incarnate Word":         { fill: "#8D1332", stroke: "#C8A600" },
  "James Madison":          { fill: "#450084", stroke: "#CBB677" },
  "Kennesaw State":         { fill: "#000000", stroke: "#FDBB30" },
  "Louisiana":              { fill: "#CE181E", stroke: "#FFFFFF" },
  "Marshall":               { fill: "#00AF66", stroke: "#FFFFFF" },
  "Memphis":                { fill: "#003087", stroke: "#8C8C8C" },
  "Miami (OH)":             { fill: "#C01933", stroke: "#FFFFFF" },
  "Middle Tennessee State": { fill: "#00437A", stroke: "#FFFFFF" },
  "Minnesota":              { fill: "#7A0019", stroke: "#FFCC33" },
  "Mississippi":            { fill: "#00205b", stroke: "#c8102e" },
  "New Mexico":             { fill: "#BA0C2F", stroke: "#63666A" },
  "Nigeria":                { fill: "#008751", stroke: "#FFFFFF" },
  "North Carolina":         { fill: "#4B9CD3", stroke: "#FFFFFF" },
  "North Carolina State":   { fill: "#CC0000", stroke: "#FFFFFF" },
  "Northern Illinois":      { fill: "#C8102E", stroke: "#000000" },
  "Rutgers":                { fill: "#CC0033", stroke: "#FFFFFF" },
  "SMU":                    { fill: "#CC0000", stroke: "#003DA5" },
  "South Alabama":          { fill: "#002469", stroke: "#C41230" },
  "Southeastern Louisiana": { fill: "#006240", stroke: "#C8A951" },
  "Syracuse":               { fill: "#F76900", stroke: "#002147" },
  "Utah State":             { fill: "#00263A", stroke: "#FFFFFF" },
  "Weber State":            { fill: "#492F92", stroke: "#FFFFFF" },
  "West Virginia":          { fill: "#002855", stroke: "#EAAA00" },
  "Wyoming":                { fill: "#492F24", stroke: "#FFC425" },

  // ── Pass 2 additions ──────────────────────────────────────────────────────

  // Category A — aliases for alternate data strings
  "Cal":            { fill: "#041E42", stroke: "#FFC72C" },
  "N.C. State":     { fill: "#CC0000", stroke: "#FFFFFF" },
  "Pitt":           { fill: "#1c2957", stroke: "#cdb87d" },
  "Connecticut":    { fill: "#000E2F", stroke: "#FFFFFF" },

  // Category B — non-collegiate (International Player Pathway)
  "IPP":            { fill: "#0B2239", stroke: "#D4A017" },

  // Power/major conference
  "Virginia Tech":      { fill: "#630031", stroke: "#CF4420" },
  "Oklahoma State":     { fill: "#FF6600", stroke: "#000000" },
  "Oregon State":       { fill: "#DC4405", stroke: "#000000" },
  "Purdue":             { fill: "#CEB888", stroke: "#000000" },
  "Colorado":           { fill: "#CFB87C", stroke: "#000000" },
  "Colorado State":     { fill: "#1E4D2B", stroke: "#C8C372" },
  "Tulane":             { fill: "#006747", stroke: "#418FDE" },
  "Washington State":   { fill: "#981E32", stroke: "#5E6A71" },
  "Appalachian State":  { fill: "#000000", stroke: "#FFB300" },
  "Fresno State":       { fill: "#DB0032", stroke: "#002244" },
  "UNLV":               { fill: "#CF0A2C", stroke: "#858585" },
  "Nevada":             { fill: "#003366", stroke: "#807F84" },
  "Rice":               { fill: "#00205B", stroke: "#7C7E7F" },
  "Western Kentucky":   { fill: "#C60C30", stroke: "#FFFFFF" },
  "Temple":             { fill: "#9D2235", stroke: "#FFFFFF" },
  "USF":                { fill: "#006747", stroke: "#CFC493" },
  "UTEP":               { fill: "#041E42", stroke: "#FF8200" },
  "UL Monroe":          { fill: "#7B0D21", stroke: "#C9A84C" },
  "Ohio":               { fill: "#00694E", stroke: "#FFFFFF" },

  // Mid-major / FBS
  "Bowling Green":      { fill: "#4B1003", stroke: "#F15A22" },
  "Charlotte":          { fill: "#046A38", stroke: "#FFFFFF" },
  "Florida Atlantic":   { fill: "#003366", stroke: "#CC0000" },
  "Houston Christian":  { fill: "#002D72", stroke: "#F26522" },
  "Illinois State":     { fill: "#C01933", stroke: "#FFFFFF" },
  "Louisiana Tech":     { fill: "#002F8F", stroke: "#E31837" },
  "Missouri State":     { fill: "#5C0025", stroke: "#FFFFFF" },
  "Montana":            { fill: "#73000A", stroke: "#999999" },
  "Montana State":      { fill: "#003875", stroke: "#D4A017" },
  "New Hampshire":      { fill: "#003DA5", stroke: "#C8A951" },
  "Northern State":     { fill: "#492F91", stroke: "#FDB827" },
  "Sacramento State":   { fill: "#00553A", stroke: "#C39F37" },
  "South Dakota":       { fill: "#990000", stroke: "#FFFFFF" },
  "South Dakota State": { fill: "#003478", stroke: "#FFC82E" },
  "Towson":             { fill: "#F0A500", stroke: "#000000" },
  "Troy":               { fill: "#8B1C21", stroke: "#A2AAAD" },
  "UC Davis":           { fill: "#002855", stroke: "#DAAA00" },
  "UMass":              { fill: "#881C1C", stroke: "#FFFFFF" },
  "Utah Tech":          { fill: "#CC0000", stroke: "#000000" },
  "Villanova":          { fill: "#00205B", stroke: "#FFFFFF" },
  "William & Mary":     { fill: "#115740", stroke: "#B9975B" },

  // FCS / small programs
  "Central Arkansas":    { fill: "#562C82", stroke: "#9EA2A2" },
  "Central Connecticut": { fill: "#002E6C", stroke: "#B5A300" },
  "Duquesne":            { fill: "#8B2131", stroke: "#003478" },
  "Eastern Kentucky":    { fill: "#881C1C", stroke: "#FFFFFF" },
  "Holy Cross":          { fill: "#582C83", stroke: "#FFFFFF" },
  "Lafayette":           { fill: "#8B0000", stroke: "#FFFFFF" },
  "Lamar":               { fill: "#E31837", stroke: "#FFFFFF" },
  "Merrimack":           { fill: "#002147", stroke: "#FDBB30" },
  "Millsaps":            { fill: "#461D7C", stroke: "#FFFFFF" },
  "Monmouth":            { fill: "#041E42", stroke: "#FFFFFF" },
  "New Haven":           { fill: "#333333", stroke: "#C6A020" },
  "Rhode Island":        { fill: "#002147", stroke: "#75B2DD" },
  "SE Missouri State":   { fill: "#CC0000", stroke: "#000000" },
  "Southern":            { fill: "#0033A0", stroke: "#CFB53B" },
  "Southern Miss":       { fill: "#000000", stroke: "#EFAB00" },
  "Southern Mississippi":{ fill: "#000000", stroke: "#EFAB00" },

  // HBCUs
  "Alabama A&M":            { fill: "#800000", stroke: "#FFFFFF" },
  "Howard":                 { fill: "#003A63", stroke: "#FFFFFF" },
  "North Carolina Central": { fill: "#862633", stroke: "#8B8B8B" },
  "Virginia State":         { fill: "#003366", stroke: "#FF6600" },
  "Winston-Salem State":    { fill: "#C8102E", stroke: "#FFFFFF" },

  // Ivy League
  "Brown": { fill: "#4E3629", stroke: "#FFFFFF" },
  "Yale":  { fill: "#00356B", stroke: "#FFFFFF" },
};

// ── Tier definitions (order = Great -> Role Player/Project) ───────────────────

export const TIER_DEFS: TierDef[] = [
  { name: 'Great',                color: '#B45309', bg: 'rgba(180,83,9,0.06)'    },
  { name: 'Good',                 color: '#0E7490', bg: 'rgba(14,116,144,0.05)'  },
  { name: 'Solid',                color: '#475DA7', bg: 'rgba(71,93,167,0.04)'   },
  { name: 'Role Player / Project', color: '#6B7280', bg: 'rgba(107,114,128,0.03)' },
];

/** Fraction of R1 players that fall in the "Great" tier (picks 1-15 out of ~21). */
export const R1_SPLIT = 15 / 21;

// ── Positional measurable range data ─────────────────────────────────────────

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
// Aliases include full team name, common abbreviations, AND the exact strings
// Airtable sends in the "Team Drafted" field (city/nickname only).
// Both .toUpperCase() and .toLowerCase() variants are also stored in the map.

export interface TeamColor {
  fill: string;
  secondary: string;
}

const _TEAMS: Array<[string[], string, string]> = [
  // AFC East
  [['Buffalo Bills',           'BUF', 'Buffalo'],                                      '#00338D', '#C60C30'],
  [['Miami Dolphins',          'MIA', 'Miami'],                                         '#008E97', '#FC4C02'],
  [['New England Patriots',    'NWE', 'NE', 'NEP', 'New England'],                     '#C60C30', '#002244'],
  [['New York Jets',           'NYJ'],                                                  '#125740', '#000000'],
  // AFC North
  [['Baltimore Ravens',        'BAL', 'Baltimore'],                                     '#241773', '#9E7C0C'],
  [['Cincinnati Bengals',      'CIN', 'Cincinnati'],                                    '#FB4F14', '#000000'],
  [['Cleveland Browns',        'CLE', 'Cleveland'],                                     '#FF3C00', '#311D00'],
  [['Pittsburgh Steelers',     'PIT', 'Pittsburgh'],                                    '#FFB612', '#101820'],
  // AFC South
  [['Houston Texans',          'HOU', 'Houston'],                                       '#A71930', '#03202F'],
  [['Indianapolis Colts',      'IND', 'Indianapolis'],                                  '#002C5F', '#A2AAAD'],
  [['Jacksonville Jaguars',    'JAX', 'Jacksonville'],                                  '#D7A22A', '#101820'],
  [['Tennessee Titans',        'TEN', 'Tennessee'],                                     '#4B92DB', '#0C2340'],
  // AFC West
  [['Denver Broncos',          'DEN', 'Denver'],                                        '#FB4F14', '#002244'],
  [['Kansas City Chiefs',      'KAN', 'KC', 'KCC', 'Kansas City'],                     '#E31837', '#FFB81C'],
  [['Las Vegas Raiders',       'LVR', 'LV', 'OAK', 'RAI', 'Las Vegas'],               '#A5ACAF', '#000000'],
  [['Los Angeles Chargers',    'LAC', 'LA Chargers'],                                   '#0080C6', '#FFC20E'],
  // NFC East
  [['Dallas Cowboys',          'DAL', 'Dallas'],                                        '#003594', '#869397'],
  [['New York Giants',         'NYG'],                                                  '#0B2265', '#A71930'],
  [['Philadelphia Eagles',     'PHI', 'Philadelphia'],                                  '#004C54', '#A5ACAF'],
  [['Washington Commanders',   'WAS', 'WSH', 'WFT', 'Washington'],                     '#5A1414', '#FFB612'],
  // NFC North
  [['Chicago Bears',           'CHI', 'Chicago'],                                       '#C83803', '#0B162A'],
  [['Detroit Lions',           'DET', 'Detroit'],                                       '#0076B6', '#B0B7BC'],
  [['Green Bay Packers',       'GNB', 'GB', 'GBP', 'Green Bay'],                      '#203731', '#FFB612'],
  [['Minnesota Vikings',       'MIN', 'Minnesota'],                                     '#4F2683', '#FFC62F'],
  // NFC South
  [['Atlanta Falcons',         'ATL', 'Atlanta'],                                       '#A71930', '#000000'],
  [['Carolina Panthers',       'CAR', 'Carolina'],                                      '#0085CA', '#101820'],
  [['New Orleans Saints',      'NOR', 'NO', 'NOS', 'New Orleans'],                    '#D3BC8D', '#101820'],
  [['Tampa Bay Buccaneers',    'TAM', 'TB', 'TBB', 'Tampa Bay'],                      '#D50A0A', '#34302B'],
  // NFC West
  [['Arizona Cardinals',       'ARI', 'Arizona'],                                       '#97233F', '#000000'],
  [['Los Angeles Rams',        'LAR', 'LA', 'RAM', 'LA Rams'],                         '#003594', '#FFA300'],
  // Airtable sends "San Fransisco" (Derek typo) -- both spellings keyed.
  [['San Francisco 49ers',     'SFO', 'SF', 'SFN', 'San Francisco', 'San Fransisco'], '#AA0000', '#B3995D'],
  [['Seattle Seahawks',        'SEA', 'Seattle'],                                       '#69BE28', '#002244'],
];

/** Lookup by full team name or any abbreviation variant. Returns fill hex. */
export const TEAM_COLORS: Record<string, TeamColor> = (() => {
  const map: Record<string, TeamColor> = {};
  for (const [aliases, fill, secondary] of _TEAMS) {
    const entry: TeamColor = { fill, secondary };
    for (const alias of aliases) {
      map[alias] = entry;
      map[alias.toUpperCase()] = entry;
      map[alias.toLowerCase()] = entry;
    }
  }
  return map;
})();

/** Canonical full team name ("Indianapolis Colts") for any alias (city/abbr/full). */
export const TEAM_FULL_NAME: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [aliases] of _TEAMS) {
    const full = aliases[0];
    for (const alias of aliases) {
      map[alias] = full;
      map[alias.toUpperCase()] = full;
      map[alias.toLowerCase()] = full;
    }
  }
  return map;
})();

/** Resolve a raw team string (city/abbr/full) to its canonical full name; falls back to input. */
export function resolveTeamName(raw: string | null | undefined): string {
  if (!raw) return '';
  return TEAM_FULL_NAME[raw] ?? TEAM_FULL_NAME[raw.toLowerCase()] ?? raw;
}

/** Resolve NFL team colors from any team string format.
 *  Accepts: full name ("Kansas City Chiefs"), abbreviation ("KC"), city ("Kansas City").
 *  Falls back to DraftMap brand navy/gold if team is not found.
 */
export function resolveTeamColors(rawTeam: string | null | undefined): {
  primary: string;
  secondary: string;
  onPrimary: string;
  onSecondary: string;
} {
  const FALLBACK = { primary: '#0B2239', secondary: '#D4A017', onPrimary: '#FFFFFF', onSecondary: '#1a1a1a' };
  if (!rawTeam) return FALLBACK;
  const entry = TEAM_COLORS[rawTeam] ?? TEAM_COLORS[rawTeam.toLowerCase()] ?? null;
  if (!entry) return FALLBACK;
  const lum = luminance(entry.fill);
  const effectivePrimary   = lum > 0.5 ? entry.secondary : entry.fill;
  const effectiveSecondary = lum > 0.5 ? entry.fill      : entry.secondary;
  const onPrimary   = luminance(effectivePrimary)   > 0.5 ? '#1a1a1a' : '#FFFFFF';
  const onSecondary = luminance(effectiveSecondary) > 0.5 ? '#1a1a1a' : '#FFFFFF';
  return { primary: effectivePrimary, secondary: effectiveSecondary, onPrimary, onSecondary };
}

/** Team colors for a CHART DOT: brand fill + secondary stroke, with NO luminance
 *  contrast-flip. The flip in resolveTeamColors() is for card panels (dark bg +
 *  readable text); on a small dot over parchment it demotes bright-fill teams
 *  (SEA/PIT/JAX/TEN/LV/NO) to their near-black secondary. This keeps Act 3 dots
 *  identical to Acts 1/2 (PlayerDots production: fill=tc.fill, stroke=tc.secondary).
 *  resolveTeamColors() is intentionally left untouched (the player card needs it).
 *  Falls back to brand navy fill / gold stroke for an unmatched team. */
export function teamDotColors(rawTeam: string | null | undefined): { fill: string; stroke: string } {
  const FALLBACK = { fill: '#0B2239', stroke: '#D4A017' };
  if (!rawTeam) return FALLBACK;
  const entry = TEAM_COLORS[rawTeam] ?? TEAM_COLORS[rawTeam.toLowerCase()] ?? null;
  if (!entry) return FALLBACK;
  return { fill: entry.fill, stroke: entry.secondary };
}

/** Resolve school colors for pre-draft player card headers. */
export function resolveSchoolColors(school: string | null | undefined): {
  primary: string;
  secondary: string;
  onPrimary: string;
  onSecondary: string;
} {
  const FALLBACK = { primary: '#0B2239', secondary: '#D4A017', onPrimary: '#FFFFFF', onSecondary: '#1a1a1a' };
  const sc = SCHOOL_COLORS[school ?? ''];
  if (!sc) return FALLBACK;
  const lum = luminance(sc.fill);
  const effectivePrimary   = lum > 0.85 ? sc.stroke : sc.fill;
  const effectiveSecondary = lum > 0.85 ? sc.fill   : sc.stroke;
  const onPrimary   = luminance(effectivePrimary)   > 0.5 ? '#1a1a1a' : '#FFFFFF';
  const onSecondary = luminance(effectiveSecondary) > 0.5 ? '#1a1a1a' : '#FFFFFF';
  return { primary: effectivePrimary, secondary: effectiveSecondary, onPrimary, onSecondary };
}

/** Derive a stroke color from a fill hex: darken by ~25%. */
export function teamStrokeFromFill(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const darken = (c: number) => Math.max(0, Math.round(c * 0.75)).toString(16).padStart(2, '0');
  return `#${darken(r)}${darken(g)}${darken(b)}`;
}
