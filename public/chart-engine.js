// chart-engine.js — DraftMap chart logic extracted from draftmap-mockup-v2.html
// Players are injected by DraftChart.tsx via window.__draftMapPlayers before this script runs.
// Call window.initDraftMap() to reinitialize on re-mount.

const players = window.__draftMapPlayers ?? [];

    // ── Config ──────────────────────────────────────────────────────────
    const POSITIONS = {
      defense: ['EDGE', 'DT', 'LB', 'CB', 'S'],
      offense: ['RB', 'WR', 'TE', 'OT', 'IOL', 'QB']
    };
    const POSITION_ORDER = ['EDGE', 'DT', 'LB', 'CB', 'S', 'RB', 'WR', 'TE', 'OT', 'IOL', 'QB'];

    const BAND_ASSIGNMENTS = {
      'QB': { top: 'Pocket Passer', mid: 'Balanced', bot: 'Running QB' },
      'RB': { top: 'Power', mid: 'Balanced', bot: 'Speed' },
      'WR': { top: 'Size/Possession', mid: 'Balanced', bot: 'Speed/Quickness' },
      'TE': { top: 'Blocking', mid: 'Balanced', bot: 'Receiving' },
      'OT': { top: 'Power/Strength', mid: 'Balanced', bot: 'Zone/Agility' },
      'IOL': { top: 'Power/Strength', mid: 'Balanced', bot: 'Zone/Agility' },
      'EDGE': { top: 'Power Rusher', mid: 'Balanced', bot: 'Speed Rusher' },
      'DT': { top: 'Pass Rusher', mid: 'Balanced', bot: 'Run Stuffer' },
      'LB': { top: 'Power/Tackling', mid: 'Balanced', bot: 'Range/Coverage' },
      'CB': { top: 'Nickel/Slot', mid: 'Balanced', bot: 'Outside' },
      'S': { top: 'Free Safety', mid: 'Balanced', bot: 'Strong Safety' }
    };

    const ROUND_COLORS = {
      1: '#34d399', 2: '#a3e635', 3: '#facc15',
      4: '#fb923c', 5: '#f87171', 6: '#c084fc', 7: '#94a3b8'
    };

    const SCHOOL_COLORS = {
      "Alabama": { fill: "#9e1b32", stroke: "#FFFFFF" },
      "Arizona": { fill: "#AB0520", stroke: "#0C234B" },
      "Arizona State": { fill: "#990033", stroke: "#FFB310" },
      "Arkansas": { fill: "#9D2235", stroke: "#FFFFFF" },
      "Auburn": { fill: "#0C2340", stroke: "#F26522" },
      "BYU": { fill: "#002255", stroke: "#FFFFFF" },
      "Baylor": { fill: "#003015", stroke: "#fecb00" },
      "Boise State": { fill: "#09347A", stroke: "#F1632A" },
      "Boston College": { fill: "#910039", stroke: "#B38F59" },
      "Buffalo": { fill: "#005bbb", stroke: "#FFFFFF" },
      "California": { fill: "#041E42", stroke: "#FFC72C" },
      "Cincinnati": { fill: "#000000", stroke: "#E00122" },
      "Clemson": { fill: "#F56600", stroke: "#522D80" },
      "Duke": { fill: "#001A57", stroke: "#FFFFFF" },
      "Florida": { fill: "#0021a5", stroke: "#FA4616" },
      "Florida State": { fill: "#782F40", stroke: "#CEB888" },
      "Georgia": { fill: "#DA291C", stroke: "#000000" },
      "Georgia State": { fill: "#0039A6", stroke: "#FFFFFF" },
      "Georgia Tech": { fill: "#C59353", stroke: "#FFFFFF" },
      "Illinois": { fill: "#e04e39", stroke: "#13294b" },
      "Indiana": { fill: "#990000", stroke: "#EEEDEB" },
      "Iowa": { fill: "#000000", stroke: "#FFE100" },
      "Iowa State": { fill: "#a6192e", stroke: "#FDC82F" },
      "Kansas": { fill: "#0051BA", stroke: "#E8000D" },
      "Kansas State": { fill: "#512888", stroke: "#FFFFFF" },
      "Kentucky": { fill: "#0033A0", stroke: "#FFFFFF" },
      "LSU": { fill: "#582c83", stroke: "#ffc72c" },
      "Louisville": { fill: "#AD0000", stroke: "#000000" },
      "Maryland": { fill: "#c8102e", stroke: "#FFFFFF" },
      "Miami": { fill: "#005030", stroke: "#f47321" },
      "Michigan": { fill: "#ffcb05", stroke: "#00274c" },
      "Michigan State": { fill: "#18453B", stroke: "#FFFFFF" },
      "Mississippi State": { fill: "#660000", stroke: "#FFFFFF" },
      "Missouri": { fill: "#000000", stroke: "#F1B82D" },
      "NC State": { fill: "#CC0000", stroke: "#FFFFFF" },
      "Navy": { fill: "#00205b", stroke: "#c5b783" },
      "Nebraska": { fill: "#e41c38", stroke: "#fdf2d9" },
      "North Dakota State": { fill: "#9CA3AF", stroke: "#6B7280" },
      "Northwestern": { fill: "#4E2A84", stroke: "#FFFFFF" },
      "Notre Dame": { fill: "#0C2340", stroke: "#C99700" },
      "Ohio State": { fill: "#bb0000", stroke: "#666666" },
      "Oklahoma": { fill: "#841617", stroke: "#FDF9D8" },
      "Ole Miss": { fill: "#00205b", stroke: "#c8102e" },
      "Oregon": { fill: "#154733", stroke: "#FEE123" },
      "Penn State": { fill: "#041e42", stroke: "#FFFFFF" },
      "Pittsburgh": { fill: "#1c2957", stroke: "#cdb87d" },
      "San Diego State": { fill: "#C41230", stroke: "#000000" },
      "South Carolina": { fill: "#73000A", stroke: "#000000" },
      "Stanford": { fill: "#8C1515", stroke: "#FFFFFF" },
      "Stephen F. Austin": { fill: "#9CA3AF", stroke: "#6B7280" },
      "TCU": { fill: "#4d1979", stroke: "#FFFFFF" },
      "Tennessee": { fill: "#FF8200", stroke: "#FFFFFF" },
      "Texas": { fill: "#BF5700", stroke: "#FFFFFF" },
      "Texas A&M": { fill: "#500000", stroke: "#FFFFFF" },
      "Texas Tech": { fill: "#CC0000", stroke: "#000000" },
      "Toledo": { fill: "#002569", stroke: "#ffce00" },
      "UCF": { fill: "#000000", stroke: "#BA9B37" },
      "UCLA": { fill: "#0072ce", stroke: "#ffc72c" },
      "UConn": { fill: "#000E2F", stroke: "#FFFFFF" },
      "USC": { fill: "#990000", stroke: "#FFCC00" },
      "UTSA": { fill: "#0c2340", stroke: "#FFFFFF" },
      "Utah": { fill: "#CC0000", stroke: "#FFFFFF" },
      "Vanderbilt": { fill: "#000000", stroke: "#997F3D" },
      "Virginia": { fill: "#041e42", stroke: "#fa4616" },
      "Wake Forest": { fill: "#000000", stroke: "#9E7E38" },
      "Washington": { fill: "#363c74", stroke: "#e8d3a2" },
      "Western Michigan": { fill: "#6c4023", stroke: "#b5a167" },
      "Wisconsin": { fill: "#c5050c", stroke: "#FFFFFF" }
    };

    const TIER_DEFS = [
      { name: 'Great', color: '#B45309', bg: 'rgba(180,83,9,0.06)' },
      { name: 'Good', color: '#0E7490', bg: 'rgba(14,116,144,0.05)' },
      { name: 'Solid', color: '#475DA7', bg: 'rgba(71,93,167,0.04)' },
      { name: 'Role Player / Project', color: '#6B7280', bg: 'rgba(107,114,128,0.03)' }
    ];

    // R1 Great/Good split: picks 1–15 out of ~21 R1 players
    const R1_SPLIT = 15 / 21;

    let currentView = 'all';
    let zoomLevel = 2;
    let liveMode = false; // Live Draft mode: greys out drafted players when enabled

    // Touch device detection — used to choose single-click vs double-tap for card
    const IS_TOUCH = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    // Double-tap state for mobile card opening
    let _pcmLastTapMs = 0;
    let _pcmLastTapPlayer = null;

    let chartWrapper;
    let zoomViewport;

    const camera = {
      scale: 1,
      minScale: 0.55,
      maxScale: 2.4,
      x: 40,
      y: 40
    };

    let isDragging = false;
    let dragStart = { x: 0, y: 0 };
    let cameraStart = { x: 0, y: 0 };

    // ── Helpers ─────────────────────────────────────────────────────────
    function svgEl(tag, attrs, text) {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      if (text !== undefined) el.textContent = text;
      return el;
    }

    function fmtHeight(h) {
      if (!h || h === 'N/A') return '';
      const s = String(h).trim();

      // Convert values like "60-54" -> "6054"
      const normalized = s.replace('-', '');

      // Keep only the first 4 digits when available
      const digits = normalized.replace(/\D/g, '');
      if (digits.length >= 4) return digits.slice(0, 4);

      return digits || s;
    }

    function getVisiblePositions() {
      if (currentView === 'offense') return POSITIONS.offense;
      if (currentView === 'defense') return POSITIONS.defense;
      return POSITION_ORDER;
    }

    function getBandForRole(role, pos) {
      const b = BAND_ASSIGNMENTS[pos];
      if (!b) return 'mid';
      if (role === b.top) return 'top';
      if (role === b.bot) return 'bot';
      return 'mid';
    }

    function getByPosRound(pos, rd) {
      return players.filter(p => p.pos === pos && p.rd === rd)
        .sort((a, b) => (a.rank || 9999) - (b.rank || 9999));
    }

    function getInBand(pos, rd, band) {
      return getByPosRound(pos, rd).filter(p => getBandForRole(p.role, pos) === band);
    }

    function fmtStrengths(s1, s2, s3) {
      return [s1, s2, s3].filter(s => s && s !== 'N/A').join(' · ');
    }

    // Pre-compute rank range per round for proportional dot spacing
    function buildRdRankRange() {
      const ranges = {};
      for (let rd = 1; rd <= 7; rd++) {
        const rdPlayers = players.filter(p => p.rd === rd);
        // Exclude rank=0 (unranked) so they don't drag min down and
        // compress all ranked players into a sliver at the bottom of the zone.
        // Rank=0 players use the fallback index distribution in rankToY instead.
        const ranked = rdPlayers.filter(p => p.rank > 0);
        if (ranked.length > 0) {
          const ranks = ranked.map(p => p.rank);
          ranges[rd] = { min: Math.min(...ranks), max: Math.max(...ranks) };
        } else {
          // All unranked — rankToY fallback handles distribution; sentinel values
          ranges[rd] = { min: 0, max: 0 };
        }
      }
      return ranges;
    }
    const RD_RANK_RANGE = buildRdRankRange();

    function rankToY(rank, rd, ry, rh, fallbackIndex, fallbackTotal) {
      const { min, max } = RD_RANK_RANGE[rd];
      const pad = 24;

      // rank=0 means unranked — distribute evenly across the zone using caller-supplied index
      if (rank === 0) {
        if (fallbackTotal != null && fallbackTotal > 1) {
          const t = fallbackIndex / (fallbackTotal - 1);
          return ry + pad + t * (rh - 2 * pad);
        }
        return ry + rh / 2;
      }

      if (max === min) return ry + rh / 2;

      const t = (rank - min) / (max - min);

      // Mild top-weighted exaggeration:
      // - expands early rank differences a bit more
      // - keeps later ranks closer to linear
      // - preserves exact ordering
      const curveStrengthByRound = {
        1: 0.18,
        2: 0.20,
        3: 0.22,
        4: 0.24,
        5: 0.22,
        6: 0.20,
        7: 0.16
      };

      const exponentByRound = {
        1: 0.93,
        2: 0.91,
        3: 0.89,
        4: 0.87,
        5: 0.89,
        6: 0.91,
        7: 0.94
      };

      const curveStrength = curveStrengthByRound[rd] ?? 0.20;
      const exponent = exponentByRound[rd] ?? 0.90;

      const curvedT = Math.pow(t, exponent);
      const displayT = (t * (1 - curveStrength)) + (curvedT * curveStrength);

      return ry + pad + displayT * (rh - 2 * pad);
    }

    // Spread dots vertically so none overlap (radius 5 = min 11px gap)
    function spreadDots(dotData, ry, rh) {
      const DOT_R = 5;
      const MIN_GAP = DOT_R * 2 + 1; // 11px clearance
      const PAD = DOT_R + 2;       // keep dots off row edges

      const total = dotData.length;
      let pts = dotData.map((p, i) => ({
        y: rankToY(p.rank, p.rd, ry, rh, i, total),
        player: p
      }));

      // Iteratively push adjacent dots apart until no overlaps remain
      for (let iter = 0; iter < 30; iter++) {
        pts.sort((a, b) => a.y - b.y);
        let changed = false;
        for (let i = 0; i < pts.length - 1; i++) {
          const gap = pts[i + 1].y - pts[i].y;
          if (gap < MIN_GAP) {
            const push = (MIN_GAP - gap) / 2;
            pts[i].y -= push;
            pts[i + 1].y += push;
            changed = true;
          }
        }
        if (!changed) break;
      }

      // Clamp within row bounds
      pts.forEach(p => {
        p.y = Math.max(ry + PAD, Math.min(ry + rh - PAD, p.y));
      });

      return pts;
    }

    // ══════════════════════════════════════════════════════════════════════
    // PLAYER CARD MODAL
    // ══════════════════════════════════════════════════════════════════════

    // ── Positional range data (thresholds: lowest/good/great/highest + isKey) ──
    const cardPositionalRangeData = {
      "CB": {
        "split10": { lowest: 1.64, good: 1.58, great: 1.54, highest: 1.48, isKey: false },
        "cone3":   { lowest: 7.40, good: 7.10, great: 6.90, highest: 6.60, isKey: true },
        "forty":   { lowest: 4.65, good: 4.50, great: 4.40, highest: 4.25, isKey: true },
        "arm":     { lowest: 29.5, good: 31,   great: 32,   highest: 33.5, isKey: true },
        "bench":   { lowest: 9.5,  good: 14,   great: 17,   highest: 21.5, isKey: false },
        "broad":   { lowest: 120,  good: 123,  great: 125,  highest: 128,  isKey: true },
        "hand":    { lowest: 8.25, good: 9.0,  great: 9.5,  highest: 10.25,isKey: false },
        "height":  { lowest: 5090, good: 6000, great: 6020, highest: 6050, isKey: true },
        "shuttle": { lowest: 4.70, good: 4.40, great: 4.20, highest: 3.90, isKey: true },
        "vertical":{ lowest: 30.5, good: 35,   great: 38,   highest: 42.5, isKey: true },
        "weight":  { lowest: 178,  good: 190,  great: 198,  highest: 210,  isKey: true }
      },
      "DT": {
        "split10": { lowest: 1.875,good: 1.80, great: 1.75, highest: 1.675,isKey: false },
        "cone3":   { lowest: 8.45, good: 8.00, great: 7.70, highest: 7.25, isKey: true },
        "forty":   { lowest: 5.40, good: 5.10, great: 4.90, highest: 4.60, isKey: true },
        "arm":     { lowest: 30.5, good: 32,   great: 33,   highest: 34.5, isKey: true },
        "bench":   { lowest: 15,   good: 24,   great: 30,   highest: 39,   isKey: false },
        "broad":   { lowest: 94.5, good: 105,  great: 112,  highest: 122.5,isKey: true },
        "hand":    { lowest: 8.75, good: 9.5,  great: 10,   highest: 10.75,isKey: false },
        "height":  { lowest: 6000, good: 6020, great: 6030, highest: 6050, isKey: true },
        "shuttle": { lowest: 4.94, good: 4.79, great: 4.69, highest: 4.54, isKey: true },
        "vertical":{ lowest: 24.5, good: 29,   great: 32,   highest: 36.5, isKey: true },
        "weight":  { lowest: 287.5,good: 298,  great: 305,  highest: 315.5,isKey: true }
      },
      "EDGE": {
        "split10": { lowest: 1.725,good: 1.65, great: 1.60, highest: 1.525,isKey: false },
        "cone3":   { lowest: 7.25, good: 7.10, great: 7.00, highest: 6.85, isKey: false },
        "forty":   { lowest: 4.85, good: 4.70, great: 4.60, highest: 4.45, isKey: true },
        "arm":     { lowest: 30.5, good: 32,   great: 33,   highest: 34.5, isKey: true },
        "bench":   { lowest: 16,   good: 22,   great: 26,   highest: 32,   isKey: false },
        "broad":   { lowest: 114.5,good: 119,  great: 122,  highest: 126.5,isKey: true },
        "hand":    { lowest: 8.75, good: 9.5,  great: 10,   highest: 10.75,isKey: false },
        "height":  { lowest: 6000, good: 6030, great: 6040, highest: 6060, isKey: true },
        "shuttle": { lowest: 4.55, good: 4.40, great: 4.30, highest: 4.15, isKey: true },
        "vertical":{ lowest: 28.5, good: 33,   great: 36,   highest: 40.5, isKey: true },
        "weight":  { lowest: 230,  good: 245,  great: 255,  highest: 270,  isKey: true }
      },
      "IOL": {
        "split10": { lowest: 1.875,good: 1.80, great: 1.75, highest: 1.675,isKey: false },
        "cone3":   { lowest: 8.45, good: 8.00, great: 7.70, highest: 7.25, isKey: false },
        "forty":   { lowest: 5.35, good: 5.20, great: 5.10, highest: 4.95, isKey: true },
        "arm":     { lowest: 30.5, good: 32,   great: 33,   highest: 34.5, isKey: true },
        "bench":   { lowest: 15,   good: 24,   great: 30,   highest: 39,   isKey: true },
        "broad":   { lowest: 96,   good: 105,  great: 111,  highest: 120,  isKey: true },
        "hand":    { lowest: 8.75, good: 9.5,  great: 10,   highest: 10.75,isKey: false },
        "height":  { lowest: 6000, good: 6020, great: 6040, highest: 6060, isKey: false },
        "shuttle": { lowest: 4.94, good: 4.79, great: 4.69, highest: 4.54, isKey: true },
        "vertical":{ lowest: 24.5, good: 29,   great: 32,   highest: 36.5, isKey: true },
        "weight":  { lowest: 287.5,good: 298,  great: 305,  highest: 315.5,isKey: false }
      },
      "LB": {
        "split10": { lowest: 1.68, good: 1.62, great: 1.58, highest: 1.52, isKey: false },
        "cone3":   { lowest: 7.50, good: 7.20, great: 7.00, highest: 6.70, isKey: true },
        "forty":   { lowest: 4.80, good: 4.65, great: 4.55, highest: 4.40, isKey: true },
        "arm":     { lowest: 29.5, good: 31,   great: 32,   highest: 33.5, isKey: false },
        "bench":   { lowest: 12,   good: 18,   great: 22,   highest: 28,   isKey: false },
        "broad":   { lowest: 114.5,good: 119,  great: 122,  highest: 126.5,isKey: true },
        "hand":    { lowest: 7.5,  good: 9.0,  great: 10,   highest: 11.5, isKey: false },
        "height":  { lowest: 5090, good: 6000, great: 6010, highest: 6040, isKey: false },
        "shuttle": { lowest: 4.54, good: 4.39, great: 4.29, highest: 4.14, isKey: true },
        "vertical":{ lowest: 27,   good: 33,   great: 37,   highest: 43,   isKey: true },
        "weight":  { lowest: 222.5,good: 230,  great: 235,  highest: 242.5,isKey: true }
      },
      "OT": {
        "split10": { lowest: 1.86, good: 1.80, great: 1.76, highest: 1.70, isKey: false },
        "cone3":   { lowest: 8.00, good: 7.85, great: 7.75, highest: 7.60, isKey: false },
        "forty":   { lowest: 5.35, good: 5.20, great: 5.10, highest: 4.95, isKey: true },
        "arm":     { lowest: 31,   good: 32.5, great: 33.5, highest: 35,   isKey: true },
        "bench":   { lowest: 23,   good: 26,   great: 28,   highest: 31,   isKey: true },
        "broad":   { lowest: 103,  good: 109,  great: 113,  highest: 119,  isKey: true },
        "hand":    { lowest: 8.75, good: 9.5,  great: 10,   highest: 10.75,isKey: false },
        "height":  { lowest: 6040, good: 6050, great: 6060, highest: 6080, isKey: true },
        "shuttle": { lowest: 4.94, good: 4.79, great: 4.69, highest: 4.54, isKey: true },
        "vertical":{ lowest: 28,   good: 31,   great: 33,   highest: 36,   isKey: true },
        "weight":  { lowest: 287.5,good: 298,  great: 305,  highest: 315.5,isKey: false }
      },
      "QB": {
        "split10": { lowest: 1.80, good: 1.65, great: 1.55, highest: 1.40, isKey: false },
        "cone3":   { lowest: 7.375,good: 7.15, great: 7.00, highest: 6.775,isKey: false },
        "forty":   { lowest: 4.85, good: 4.70, great: 4.60, highest: 4.45, isKey: false },
        "arm":     { lowest: 29.5, good: 31,   great: 32,   highest: 33.5, isKey: false },
        "bench":   { lowest: 9.5,  good: 14,   great: 17,   highest: 21.5, isKey: false },
        "broad":   { lowest: 114,  good: 120,  great: 124,  highest: 130,  isKey: false },
        "hand":    { lowest: 8.75, good: 9.5,  great: 10,   highest: 10.75,isKey: true },
        "height":  { lowest: 5110, good: 6010, great: 6030, highest: 6050, isKey: true },
        "shuttle": { lowest: 4.50, good: 4.35, great: 4.25, highest: 4.10, isKey: false },
        "vertical":{ lowest: 27.5, good: 32,   great: 35,   highest: 39.5, isKey: false },
        "weight":  { lowest: 177.5,good: 200,  great: 215,  highest: 237.5,isKey: false }
      },
      "RB": {
        "split10": { lowest: 1.665,good: 1.59, great: 1.54, highest: 1.465,isKey: false },
        "cone3":   { lowest: 7.40, good: 7.10, great: 6.90, highest: 6.60, isKey: true },
        "forty":   { lowest: 4.74, good: 4.59, great: 4.49, highest: 4.34, isKey: true },
        "arm":     { lowest: 28.5, good: 30,   great: 31,   highest: 32.5, isKey: false },
        "bench":   { lowest: 14,   good: 20,   great: 24,   highest: 30,   isKey: false },
        "broad":   { lowest: 115,  good: 121,  great: 125,  highest: 131,  isKey: true },
        "hand":    { lowest: 8.25, good: 9.0,  great: 9.5,  highest: 10.25,isKey: false },
        "height":  { lowest: 5080, good: 5110, great: 6000, highest: 6020, isKey: false },
        "shuttle": { lowest: 4.54, good: 4.39, great: 4.29, highest: 4.14, isKey: true },
        "vertical":{ lowest: 27,   good: 33,   great: 37,   highest: 43,   isKey: true },
        "weight":  { lowest: 190,  good: 205,  great: 215,  highest: 230,  isKey: true }
      },
      "S": {
        "split10": { lowest: 1.665,good: 1.59, great: 1.54, highest: 1.465,isKey: false },
        "cone3":   { lowest: 7.325,good: 7.10, great: 6.95, highest: 6.725,isKey: true },
        "forty":   { lowest: 4.74, good: 4.59, great: 4.49, highest: 4.34, isKey: true },
        "arm":     { lowest: 29.5, good: 31,   great: 32,   highest: 33.5, isKey: false },
        "bench":   { lowest: 10.5, good: 15,   great: 18,   highest: 22.5, isKey: false },
        "broad":   { lowest: 120,  good: 123,  great: 125,  highest: 128,  isKey: true },
        "hand":    { lowest: 8.25, good: 9.0,  great: 9.5,  highest: 10.25,isKey: false },
        "height":  { lowest: 5100, good: 6000, great: 6010, highest: 6030, isKey: false },
        "shuttle": { lowest: 4.54, good: 4.39, great: 4.29, highest: 4.14, isKey: true },
        "vertical":{ lowest: 29.5, good: 34,   great: 37,   highest: 41.5, isKey: true },
        "weight":  { lowest: 187.5,good: 195,  great: 200,  highest: 207.5,isKey: true }
      },
      "TE": {
        "split10": { lowest: 1.725,good: 1.65, great: 1.60, highest: 1.525,isKey: false },
        "cone3":   { lowest: 7.35, good: 7.20, great: 7.10, highest: 6.95, isKey: true },
        "forty":   { lowest: 4.80, good: 4.65, great: 4.55, highest: 4.40, isKey: false },
        "arm":     { lowest: 30.5, good: 32,   great: 33,   highest: 34.5, isKey: false },
        "bench":   { lowest: 14,   good: 20,   great: 24,   highest: 30,   isKey: false },
        "broad":   { lowest: 114.5,good: 119,  great: 122,  highest: 126.5,isKey: false },
        "hand":    { lowest: 8.75, good: 9.5,  great: 10,   highest: 10.75,isKey: false },
        "height":  { lowest: 6020, good: 6040, great: 6050, highest: 6070, isKey: true },
        "shuttle": { lowest: 4.55, good: 4.40, great: 4.30, highest: 4.15, isKey: true },
        "vertical":{ lowest: 28.5, good: 33,   great: 36,   highest: 40.5, isKey: true },
        "weight":  { lowest: 225,  good: 240,  great: 250,  highest: 265,  isKey: true }
      },
      "WR": {
        "split10": { lowest: 1.64, good: 1.58, great: 1.54, highest: 1.48, isKey: false },
        "cone3":   { lowest: 7.30, good: 7.00, great: 6.80, highest: 6.50, isKey: true },
        "forty":   { lowest: 4.565,good: 4.49, great: 4.44, highest: 4.365,isKey: true },
        "arm":     { lowest: 29.5, good: 31,   great: 32,   highest: 33.5, isKey: false },
        "bench":   { lowest: 9.5,  good: 14,   great: 17,   highest: 21.5, isKey: false },
        "broad":   { lowest: 120,  good: 123,  great: 125,  highest: 128,  isKey: true },
        "hand":    { lowest: 8.75, good: 9.5,  great: 10,   highest: 10.75,isKey: false },
        "height":  { lowest: 5100, good: 6000, great: 6020, highest: 6040, isKey: true },
        "shuttle": { lowest: 4.70, good: 4.40, great: 4.20, highest: 3.90, isKey: true },
        "vertical":{ lowest: 30.5, good: 35,   great: 38,   highest: 42.5, isKey: true },
        "weight":  { lowest: 170,  good: 185,  great: 195,  highest: 210,  isKey: true }
      }
    };

    // ── Card helper functions ─────────────────────────────────────────────

    function pcmFormatHeight(code) {
      if (code == null || isNaN(code)) return 'N/A';
      const s = String(Math.round(code)).padStart(4, '0');
      const feet = s[0];
      const inches = parseInt(s.slice(1, 3), 10);
      const eighths = parseInt(s[3], 10);
      if (!eighths) return `${feet}'${inches}"`;
      const fracs = { 1:'⅛',2:'¼',3:'⅜',4:'½',5:'⅝',6:'¾',7:'⅞' };
      return `${feet}'${inches} ${fracs[eighths] || ''}"`;
    }

    function pcmFormatThreshold(m, val) {
      if (val == null) return '';
      // Height thresholds are stored as real inches after conversion — format accordingly
      if (m.key === 'height')  return inchesToHeightDisplay(val);
      if (['arm','hand','vertical','broad'].includes(m.key)) return `${val}"`;
      if (m.key === 'weight')  return `${val} lbs`;
      if (m.key === 'bench')   return `${val} reps`;
      return `${val}`;
    }

    function pcmGetTier(m, value) {
      if (value == null || m.good == null || m.great == null) return 'na';
      if (m.better === 'higher') {
        if (value >= m.great) return 'great';
        if (value >= m.good)  return 'good';
        return 'below';
      } else {
        if (value <= m.great) return 'great';
        if (value <= m.good)  return 'good';
        return 'below';
      }
    }

    // Convert NFL scout height format (e.g. 6020 = 6'2") to real inches for linear math
    function scoutToInches(code) {
      if (code == null || isNaN(code)) return null;
      const s = String(Math.round(code)).padStart(4, '0');
      const feet   = parseInt(s[0], 10);
      const inches = parseInt(s.slice(1, 3), 10);
      const eighths = parseInt(s[3], 10);
      return feet * 12 + inches + eighths / 8;
    }

    // Format real inches back to feet/inches display (e.g. 74.5 → 6'2½")
    function inchesToHeightDisplay(totalInches) {
      if (totalInches == null || isNaN(totalInches)) return 'N/A';
      const feet   = Math.floor(totalInches / 12);
      const inches = Math.floor(totalInches % 12);
      const eighths = Math.round((totalInches % 1) * 8);
      if (!eighths) return `${feet}'${inches}"`;
      const fracs = { 1:'⅛',2:'¼',3:'⅜',4:'½',5:'⅝',6:'¾',7:'⅞' };
      return `${feet}'${inches} ${fracs[eighths] || ''}"`;
    }

    function pcmBuildZoneTrack(m) {
      if (m.lowest == null || m.highest == null || m.good == null || m.great == null) return null;
      const totalRange = m.better === 'higher'
        ? m.highest - m.lowest
        : m.lowest  - m.highest;
      if (totalRange <= 0) return null;

      let belowPct, goodPct, greatPct;
      if (m.better === 'higher') {
        belowPct = (m.good    - m.lowest)  / totalRange * 100;
        goodPct  = (m.great   - m.good)    / totalRange * 100;
        greatPct = (m.highest - m.great)   / totalRange * 100;
      } else {
        belowPct = (m.lowest  - m.good)    / totalRange * 100;
        goodPct  = (m.good    - m.great)   / totalRange * 100;
        greatPct = (m.great   - m.highest) / totalRange * 100;
      }

      function toDisplayPct(val) {
        let raw;
        if (m.better === 'higher') {
          raw = (val - m.lowest) / totalRange * 100;
        } else {
          raw = (m.lowest - val) / totalRange * 100;
        }
        return Math.max(3, Math.min(97, raw));
      }

      // Deterministic jitter — no Math.random, identical on every render
      function jitter(idx, seed) {
        return Math.sin(idx * 2.618 + seed * 0.41) * 8;
      }
      const seed = m.key.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

      const goodBoundaryPct  = belowPct;
      const greatBoundaryPct = belowPct + goodPct;

      const wrap = document.createElement('div');
      wrap.className = 'pcm-zone-track-wrap';

      const bar = document.createElement('div');
      bar.className = 'pcm-zone-track';
      bar.innerHTML = `
        <div class="pcm-zone-seg pcm-zone-below" style="width:${belowPct.toFixed(2)}%"></div>
        <div class="pcm-zone-seg pcm-zone-good"  style="width:${goodPct.toFixed(2)}%"></div>
        <div class="pcm-zone-seg pcm-zone-great" style="width:${greatPct.toFixed(2)}%"></div>
      `;
      wrap.appendChild(bar);

      const overlay = document.createElement('div');
      overlay.className = 'pcm-zone-overlay';

      // Peer dots
      if (m.peers && m.peers.length > 0) {
        m.peers.forEach((val, idx) => {
          const pct = toDisplayPct(val);
          const j = jitter(idx, seed);
          const dot = document.createElement('div');
          dot.className = 'pcm-peer-dot';
          dot.style.left = `${pct}%`;
          dot.style.top  = `calc(20px + ${j}px)`;
          overlay.appendChild(dot);
        });
      }

      // Player callout + dot
      if (m.value != null) {
        const pct = toDisplayPct(m.value);

        const callout = document.createElement('div');
        callout.className = 'pcm-player-callout';
        callout.style.left = `${pct}%`;
        callout.textContent = m.display;
        overlay.appendChild(callout);

        const halo = document.createElement('div');
        halo.className = 'pcm-player-dot-halo';
        halo.style.left = `${pct}%`;
        overlay.appendChild(halo);

        const pDot = document.createElement('div');
        pDot.className = 'pcm-player-dot-marker';
        pDot.style.left = `${pct}%`;
        overlay.appendChild(pDot);
      }

      // Zone area labels
      [
        { text: 'Avg',   left: 0,                         width: belowPct },
        { text: 'Good',  left: belowPct,                   width: goodPct  },
        { text: 'Great', left: belowPct + goodPct,          width: greatPct }
      ].forEach(({ text, left, width }) => {
        const lbl = document.createElement('div');
        lbl.className = 'pcm-zone-area-lbl';
        lbl.textContent = text;
        lbl.style.left  = `${left.toFixed(2)}%`;
        lbl.style.width = `${width.toFixed(2)}%`;
        overlay.appendChild(lbl);
      });

      // Threshold ticks + value labels
      [
        { pct: goodBoundaryPct,  val: m.good  },
        { pct: greatBoundaryPct, val: m.great }
      ].forEach(({ pct, val }) => {
        const tick = document.createElement('div');
        tick.className = 'pcm-threshold-tick';
        tick.style.left = `${pct.toFixed(2)}%`;
        overlay.appendChild(tick);

        const tvLbl = document.createElement('div');
        tvLbl.className = 'pcm-threshold-val';
        tvLbl.style.left = `${pct.toFixed(2)}%`;
        tvLbl.textContent = pcmFormatThreshold(m, val);
        overlay.appendChild(tvLbl);
      });

      wrap.appendChild(overlay);
      return wrap;
    }

    function pcmRenderMetricRow(m) {
      const row = document.createElement('div');
      row.className = 'pcm-metric-item';
      if (m.isKey)       row.classList.add('key');
      if (m.value == null) row.classList.add('na');

      // Col 1: label
      const nameEl = document.createElement('div');
      nameEl.className = 'pcm-metric-name';
      nameEl.innerHTML = `
        <span>${m.label}</span>
        ${m.isKey ? '<span class="pcm-key-marker" aria-label="Key metric"></span>' : ''}
      `;

      // Col 2: value pill
      const valEl = document.createElement('div');
      valEl.className = 'pcm-metric-value';
      if (m.value == null) {
        valEl.classList.add('pcm-tier-below');
        valEl.textContent = 'N/A';
      } else if (m.lowest == null) {
        valEl.classList.add('pcm-tier-below');
        valEl.textContent = m.display;
      } else {
        const tier = pcmGetTier(m, m.value);
        valEl.classList.add(tier === 'great' ? 'pcm-tier-great' : tier === 'good' ? 'pcm-tier-good' : 'pcm-tier-below');
        valEl.textContent = m.display;
      }

      // Col 3: zone track
      let trackEl;
      if (m.value == null) {
        trackEl = document.createElement('div');
        trackEl.className = 'pcm-zone-track-wrap';
        trackEl.innerHTML = '<span class="pcm-zone-na-label">—</span>';
      } else {
        const built = pcmBuildZoneTrack(m);
        if (built) {
          trackEl = built;
        } else {
          trackEl = document.createElement('div');
          trackEl.className = 'pcm-zone-track-wrap';
        }
      }

      // Col 4: better direction
      const betterEl = document.createElement('div');
      betterEl.className = 'pcm-metric-better';
      if (m.value == null || m.lowest == null) {
        betterEl.classList.add('na');
        betterEl.textContent = '—';
      } else {
        betterEl.textContent = m.better === 'higher' ? '→' : '←';
      }

      // Col 5: context
      const descEl = document.createElement('div');
      descEl.className = 'pcm-metric-desc';
      descEl.textContent = m.description || '';

      row.appendChild(nameEl);
      row.appendChild(valEl);
      row.appendChild(trackEl);
      row.appendChild(betterEl);
      row.appendChild(descEl);
      return row;
    }

    function pcmBuildMetricDefs(player, heightNum) {
      const pos    = player.pos;
      const ranges = cardPositionalRangeData[pos] || {};

      // Derive peer arrays from the live players array (excludes current player)
      // Height peers are returned in real inches (not scout format) for linear math
      function buildPeerArr(key) {
        return players
          .filter(p => p.pos === pos && p.name !== player.name)
          .map(p => {
            if (key === 'height') {
              const h = parseInt(p.height, 10);
              return isNaN(h) ? null : scoutToInches(h);
            }
            const v = p[key];
            return (v != null && !isNaN(Number(v))) ? Number(v) : null;
          })
          .filter(v => v !== null);
      }

      function makeDef(key, label, better, value, display, groupId, description) {
        const r = ranges[key] || {};
        return {
          key, label, better, value, display, groupId, description,
          lowest: r.lowest, good: r.good, great: r.great, highest: r.highest,
          isKey: r.isKey || false,
          peers: buildPeerArr(key)
        };
      }

      const w = (player.weight > 0) ? player.weight : null;

      // Height is handled separately: scout format → real inches for correct linear math
      const rH = ranges['height'] || {};
      const hInches = scoutToInches(heightNum);
      const heightDef = {
        key: 'height', label: 'Height', better: 'higher',
        value:   hInches,
        display: inchesToHeightDisplay(hInches),
        groupId: 'pcmGroupSizeLength',
        description: 'Frame profile.',
        lowest:  scoutToInches(rH.lowest),
        good:    scoutToInches(rH.good),
        great:   scoutToInches(rH.great),
        highest: scoutToInches(rH.highest),
        isKey:   rH.isKey || false,
        peers:   buildPeerArr('height')
      };

      return [
        heightDef,
        makeDef('weight',  'Weight',       'higher', w,
          w ? `${w} lbs` : 'N/A',             'pcmGroupSizeLength', 'Body mass profile.'),
        makeDef('arm',     'Arm Length',   'higher', player.arm,
          player.arm != null ? `${player.arm}"` : 'N/A', 'pcmGroupSizeLength', 'Length profile.'),
        makeDef('hand',    'Hand Size',    'higher', player.hand,
          player.hand != null ? `${player.hand}"` : 'N/A', 'pcmGroupSizeLength', 'Grip profile.'),
        makeDef('forty',   '40 Yard Dash', 'lower',  player.forty,
          player.forty != null ? `${player.forty} sec.` : 'N/A', 'pcmGroupExplosion', 'Speed over distance.'),
        makeDef('vertical','Vertical Jump','higher', player.vertical,
          player.vertical != null ? `${player.vertical}"` : 'N/A', 'pcmGroupExplosion', 'Explosiveness and leg strength.'),
        makeDef('broad',   'Broad Jump',   'higher', player.broad,
          player.broad != null ? `${player.broad}"` : 'N/A', 'pcmGroupExplosion', 'Explosiveness and leg strength.'),
        makeDef('split10', '10 Yard Split','lower',  player.split10,
          player.split10 != null ? `${player.split10} sec.` : 'N/A', 'pcmGroupAgility', 'Initial burst.'),
        makeDef('cone3',   '3 Cone',       'lower',  player.cone3,
          player.cone3 != null ? `${player.cone3} sec.` : 'N/A', 'pcmGroupAgility', 'Agility and change of direction.'),
        makeDef('shuttle', 'Short Shuttle','lower',  player.shuttle,
          player.shuttle != null ? `${player.shuttle} sec.` : 'N/A', 'pcmGroupAgility', 'Flexibility, burst, and balance.'),
        makeDef('bench',   'Bench Press',  'higher', player.bench,
          player.bench != null ? `${player.bench} reps` : 'N/A', 'pcmGroupStrength', 'Upper-body strength.')
      ];
    }

    function pcmApplyTeamColors(rootEl, primaryHex, secondaryHex) {
      function _hexToRgb(hex) {
        const n = parseInt(hex.replace('#',''), 16);
        return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
      }
      function _rgba(hex, a) {
        const { r, g, b } = _hexToRgb(hex);
        return `rgba(${r},${g},${b},${a})`;
      }
      function _luminance(hex) {
        const { r, g, b } = _hexToRgb(hex);
        return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      }
      // If secondary is too light (e.g. white, cream, gold), fall back to a
      // semi-transparent primary so the role pennant and tails stay readable
      const effectiveSecondary = _luminance(secondaryHex) > 0.70
        ? _rgba(primaryHex, 0.65)
        : secondaryHex;
      const vars = {
        '--pcm-team-primary':      primaryHex,
        '--pcm-team-secondary':    effectiveSecondary,
        '--pcm-team-primary-wash': _rgba(primaryHex, 0.20)
      };
      Object.entries(vars).forEach(([k, v]) => rootEl.style.setProperty(k, v));
    }

    function openPlayerCard(player) {
      hideTooltip();

      const bd   = document.getElementById('pcm-bd');
      const wrap = document.getElementById('pcm-wrap');

      // Team colors from the chart's SCHOOL_COLORS object
      const sc = SCHOOL_COLORS[player.school] || { fill: '#4A4A4A', stroke: '#6B7280' };
      pcmApplyTeamColors(wrap, sc.fill, sc.stroke);

      // Static text fields
      document.getElementById('pcmCardId').textContent =
        `${player.pos}-${String(player.posRank || 1).padStart(2, '0')}`;
      document.getElementById('pcmPlayerName').textContent = player.name;
      document.getElementById('pcmPos').textContent        = player.pos;
      document.getElementById('pcmSchool').textContent     = player.school || '';
      document.getElementById('pcmRole').textContent =
        (player.role && player.role !== 'N/A') ? player.role : 'Balanced';
      document.getElementById('pcmS1').textContent =
        (player.s1 && player.s1 !== 'N/A') ? player.s1 : '—';
      document.getElementById('pcmS2').textContent =
        (player.s2 && player.s2 !== 'N/A') ? player.s2 : '—';
      document.getElementById('pcmS3').textContent =
        (player.s3 && player.s3 !== 'N/A') ? player.s3 : '—';

      // Draft result badge
      const draftBadge = document.getElementById('pcmDraftResult');
      if (player.drafted) {
        document.getElementById('pcmTeamDrafted').textContent  = player.team_drafted || '—';
        document.getElementById('pcmRdDrafted').textContent    = player.rd_drafted   != null ? `Rd ${player.rd_drafted}`  : '—';
        document.getElementById('pcmPickDrafted').textContent  = player.pick_drafted != null ? `#${player.pick_drafted}` : '—';
        draftBadge.style.display = 'block';
      } else {
        draftBadge.style.display = 'none';
      }

      // Peer label (e.g. "2026 WR class")
      bd.querySelectorAll('.pcm-peer-label').forEach(el => {
        el.textContent = `2026 ${player.pos} class`;
      });

      // Clear existing metric rows (keep subtitle h3 headers)
      ['pcmGroupSizeLength','pcmGroupExplosion','pcmGroupAgility','pcmGroupStrength'].forEach(id => {
        document.getElementById(id).querySelectorAll('.pcm-metric-item').forEach(el => el.remove());
      });

      // Build and render metric rows
      const heightNum = parseInt(player.height, 10);
      const defs = pcmBuildMetricDefs(player, isNaN(heightNum) ? null : heightNum);
      defs.forEach(m => {
        const group = document.getElementById(m.groupId);
        if (group) group.appendChild(pcmRenderMetricRow(m));
      });

      // Show
      bd.style.display = 'flex';
    }

    function closePlayerCard() {
      document.getElementById('pcm-bd').style.display = 'none';
    }

    // ══════════════════════════════════════════════════════════════════════

    // ── Main draw ────────────────────────────────────────────────────────
    function drawChart() {
      const svg = document.getElementById('chart');
      svg.innerHTML = '';

      const visiblePositions = getVisiblePositions();
      const ROLES_THRESHOLD = 0.88; // scale at which role lanes appear (≈ 2 zoom-outs from original 1.35)
      const isOverview = camera.scale < ROLES_THRESHOLD;
      const isRoles = camera.scale >= ROLES_THRESHOLD;
      const isPlayers = zoomLevel >= 4;

      const hasD = visiblePositions.some(p => POSITIONS.defense.includes(p));
      const hasO = visiblePositions.some(p => POSITIONS.offense.includes(p));

      // Column widths
      const colW = 190;
      const subColW = Math.floor(colW / 3);
      const sepW = (hasD && hasO) ? 28 : 0;

      // Margins
      const margin = { top: 108, right: 100, bottom: 20, left: 240 };
      const tierLabelW = 90; // space for tier pill labels within left margin

      // Compute row heights (larger base height + gentler dynamic expansion)
      const BASE_ROW_HEIGHT = 160;

      const BASE_ROW_HEIGHTS = {
        1: Math.round(BASE_ROW_HEIGHT * 1.40),
        2: Math.round(BASE_ROW_HEIGHT * 1.32),
        3: Math.round(BASE_ROW_HEIGHT * 1.24),
        4: Math.round(BASE_ROW_HEIGHT * 1.12),
        5: Math.round(BASE_ROW_HEIGHT * 1.06),
        6: BASE_ROW_HEIGHT,
        7: 240
      };

      const rdH = {};
      for (let rd = 1; rd <= 7; rd++) {
        let maxCount = 0;

        visiblePositions.forEach(pos => {
          if (isOverview) {
            maxCount = Math.max(maxCount, getByPosRound(pos, rd).length);
          } else {
            ['top', 'mid', 'bot'].forEach(band => {
              maxCount = Math.max(maxCount, getInBand(pos, rd, band).length);
            });
          }
        });

        // Reduced density impact so crowded rounds do not balloon as much
        const dynamicHeight = maxCount * 20 + 40;

        // All rounds (including R7) expand dynamically with player count
        rdH[rd] = Math.max(BASE_ROW_HEIGHTS[rd], dynamicHeight);
      }

      // R1 is split into Great + Good sub-rows
      const greatH = Math.round(rdH[1] * R1_SPLIT);
      const goodH = rdH[1] - greatH;

      // Total chart dimensions
      const totalRdH = Object.values(rdH).reduce((a, b) => a + b, 0);
      const chartW = visiblePositions.length * colW + sepW;
      const svgW = margin.left + chartW + margin.right;
      const svgH = margin.top + totalRdH + margin.bottom;

      const finalSvgW = Math.max(svgW, 600);
      svg.setAttribute('width', finalSvgW);
      svg.setAttribute('height', svgH);

      // Let the wrapper expand naturally with the SVG (no inner scroll)

      // Compute column X positions
      const colXMap = {};
      let curX = margin.left;
      let sepInserted = false;
      visiblePositions.forEach(pos => {
        if (POSITIONS.offense.includes(pos) && !sepInserted && hasD && hasO) {
          curX += sepW;
          sepInserted = true;
        }
        colXMap[pos] = curX;
        curX += colW;
      });

      // Compute round row Y positions
      const rdY = {};
      let curY = margin.top;
      for (let rd = 1; rd <= 7; rd++) {
        rdY[rd] = curY;
        curY += rdH[rd];
      }
      const totalChartH = curY - margin.top;

      // ── 1. Tier background fills (horizontal bands) ──────────────────
      // Great: top portion of R1
      const tierBands = [
        { y1: rdY[1], y2: rdY[1] + greatH, ...TIER_DEFS[0] },
        { y1: rdY[1] + greatH, y2: rdY[2] + rdH[2], ...TIER_DEFS[1] },
        { y1: rdY[3], y2: rdY[3] + rdH[3], ...TIER_DEFS[2] },
        { y1: rdY[4], y2: rdY[7] + rdH[7], ...TIER_DEFS[3] },
      ];

      // Right-side header for tier pills
      const pillW = 76;
      const pillGapFromRounds = 28;
      const pillX = margin.left - 12 - pillGapFromRounds - pillW;
      const pillHdrX = pillX + pillW / 2;

      tierBands.forEach(t => {
        // Background fill
        svg.appendChild(svgEl('rect', {
          x: margin.left, y: t.y1,
          width: chartW, height: t.y2 - t.y1,
          fill: t.bg
        }));

        // Right-side pill label (wider so text fits); show stacked word lines
        const px = pillX;
        const py = t.y1 + 4;
        const pH = Math.max(28, (t.y2 - t.y1) - 8);
        svg.appendChild(svgEl('rect', {
          x: px, y: py,
          width: pillW, height: pH,
          rx: '8', fill: t.color,
          'fill-opacity': '0.65',
          stroke: t.color, 'stroke-width': '1.2'
        }));
        // Split long labels into stacked lines
        const labelLines = t.name === 'Role Player / Project'
          ? ['Role Player', 'or', 'Project']
          : [t.name];
        const lineH = 12;
        const totalH = labelLines.length * lineH;
        const startY = py + (pH - totalH) / 2 + lineH - 2;
        const cx = px + pillW / 2;
        labelLines.forEach((line, i) => {
          svg.appendChild(svgEl('text', {
            x: cx, y: startY + i * lineH,
            'text-anchor': 'middle', 'font-size': '10', 'font-weight': '800',
            fill: '#FFFFFF',
            stroke: 'rgba(0,0,0,0.25)', 'stroke-width': '0.5', 'paint-order': 'stroke fill'
          }, line));
        });
      });


      // ── 1b. Vertical direction arrows (left + right) ─────────────────
      const arrowTopY = rdY[1];
      const arrowBotY = margin.top + totalChartH;
      const segStroke = 2.5;
      const tickHalf = 5;
      const aHead = 6; // arrowhead triangle size

      // Y positions where tiers transition (for hash marks)
      const tierBoundaries = [
        rdY[1] + greatH,  // Great → Good
        rdY[3],           // Good → Solid
        rdY[4],           // Solid → Role Player
      ];

      [
        { x: pillX + pillW + 10, anchor: 'end', dx: -4 },
        { x: margin.left + chartW + 16, anchor: 'start', dx: 4 }
      ].forEach(({ x, anchor, dx }) => {

        // Graphic group at 0.7 opacity (lines + arrowhead only)
        const gGraphic = svgEl('g', { opacity: '0.7' });

        tierBands.forEach(t => {
          gGraphic.appendChild(svgEl('line', {
            x1: x, y1: t.y1, x2: x, y2: t.y2,
            stroke: t.color, 'stroke-width': String(segStroke),
            'stroke-linecap': 'round'
          }));
        });

        tierBoundaries.forEach(by => {
          gGraphic.appendChild(svgEl('line', {
            x1: x - tickHalf, y1: by, x2: x + tickHalf, y2: by,
            stroke: '#8A9BAA', 'stroke-width': '1.5'
          }));
        });

        gGraphic.appendChild(svgEl('polygon', {
          points: `${x},${arrowTopY - aHead} ${x - aHead},${arrowTopY} ${x + aHead},${arrowTopY}`,
          fill: TIER_DEFS[0].color,
          stroke: 'rgba(0,0,0,0.35)', 'stroke-width': '1.2', 'stroke-linejoin': 'round'
        }));

        svg.appendChild(gGraphic);

        // Text labels at full opacity — separate group so SVG group opacity doesn't wash them out
        svg.appendChild(svgEl('text', {
          x: x + dx, y: arrowTopY - aHead - 5,
          'text-anchor': anchor,
          'font-size': '9', 'font-weight': '800',
          fill: TIER_DEFS[0].color,
          stroke: 'rgba(255,255,255,0.7)', 'stroke-width': '1.2', 'paint-order': 'stroke fill'
        }, 'Top Prospects'));

        svg.appendChild(svgEl('text', {
          x: x + dx, y: arrowBotY + 12,
          'text-anchor': anchor,
          'font-size': '9', 'font-weight': '800',
          fill: TIER_DEFS[3].color,
          stroke: 'rgba(255,255,255,0.7)', 'stroke-width': '1.2', 'paint-order': 'stroke fill'
        }, 'Lower Prospects'));
      });

      // ── 2. Column backgrounds + position headers ─────────────────────
      visiblePositions.forEach((pos, posIdx) => {
        const isOff = POSITIONS.offense.includes(pos);
        const colX = colXMap[pos];
        const colBg = posIdx % 2 === 0 ? '#F8F3EA' : '#EFE9DE';
        const accentClr = '#0B2239';

        // Column background (chart area)
        svg.appendChild(svgEl('rect', {
          x: colX, y: margin.top,
          width: colW, height: totalChartH,
          fill: colBg, opacity: '0.55'
        }));

        // Header background
        svg.appendChild(svgEl('rect', {
          x: colX,
          y: 0,
          width: colW,
          height: margin.top,
          fill: '#E4E9EE'
        }));

        // (top accent strip is drawn once as unified bar in section 6)

        // Position name
        const headerFontSize =
          zoomLevel === 0 ? 10 :
            zoomLevel === 1 ? 13 :
              zoomLevel === 2 ? 18 :
                20;

        svg.appendChild(svgEl('text', {
          x: colX + colW / 2,
          y: isOverview ? 44 : 36,
          'text-anchor': 'middle',
          'font-size': String(headerFontSize),
          'font-weight': '900',
          fill: '#081B2C',
          'letter-spacing': '0.6'
        }, pos));

        // Role sub-column headers (roles/players mode)
        if (isRoles) {
          const bands = BAND_ASSIGNMENTS[pos];
          const subLabels = [bands.top, bands.mid, bands.bot];

          subLabels.forEach((name, bi) => {
            const scX = colX + bi * subColW + subColW / 2;
            const isMid = bi === 1;
            const roleColor = '#4F6477';
            const roleStyle = isMid ? 'italic' : 'normal';
            const roleWeight = '700';

            if (bi > 0) {
              svg.appendChild(svgEl('line', {
                x1: colX + bi * subColW,
                y1: 44,
                x2: colX + bi * subColW,
                y2: margin.top + totalChartH,
                stroke: '#D8D3CA',
                'stroke-width': '0.7'
              }));
            }

            let lines = [];

            if (name.includes('/')) {
              const parts = name.split('/').map(s => s.trim());
              lines = [`${parts[0]}/`, parts[1]];
            } else if (name.includes(' ')) {
              const parts = name.split(' ');
              if (parts.length === 2) {
                lines = [parts[0], parts[1]];
              } else {
                const mid = Math.ceil(parts.length / 2);
                lines = [
                  parts.slice(0, mid).join(' '),
                  parts.slice(mid).join(' ')
                ];
              }
            } else {
              lines = [name];
            }

            if (lines.length === 1) {
              svg.appendChild(svgEl('text', {
                x: scX,
                y: 64,
                'text-anchor': 'middle',
                'font-size': '9',
                'font-style': roleStyle,
                'font-weight': roleWeight,
                fill: roleColor
              }, lines[0]));
            } else {
              svg.appendChild(svgEl('text', {
                x: scX,
                y: 58,
                'text-anchor': 'middle',
                'font-size': '8.5',
                'font-style': roleStyle,
                'font-weight': roleWeight,
                fill: roleColor
              }, lines[0]));

              svg.appendChild(svgEl('text', {
                x: scX,
                y: 69,
                'text-anchor': 'middle',
                'font-size': '8.5',
                'font-style': roleStyle,
                'font-weight': roleWeight,
                fill: roleColor
              }, lines[1]));
            }
          });
        }

        // Bottom border under header
        svg.appendChild(svgEl('line', {
          x1: colX,
          y1: margin.top,
          x2: colX + colW,
          y2: margin.top,
          stroke: '#AEB8C2',
          'stroke-width': '1.4'
        }));

        // Right border
        svg.appendChild(svgEl('line', {
          x1: colX + colW, y1: 0,
          x2: colX + colW, y2: margin.top + totalChartH,
          stroke: '#B9C3CC', 'stroke-width': '1.2'
        }));

      });
      // ── 3. Section labels (DEFENSE / OFFENSE) in header ──────────────
      if (zoomLevel >= 1) {
        if (hasD) {
          const firstDefX = colXMap[visiblePositions.find(p => POSITIONS.defense.includes(p))];
          svg.appendChild(svgEl('text', {
            x: firstDefX + 4, y: margin.top - 10,
            'font-size': zoomLevel === 1 ? '7' : '8',
            'font-weight': '700',
            fill: '#0B2239', opacity: '0.5', 'letter-spacing': '2'
          }, 'DEFENSE'));
        }

        if (hasO) {
          const firstOffPos = visiblePositions.find(p => POSITIONS.offense.includes(p));
          if (firstOffPos) {
            svg.appendChild(svgEl('text', {
              x: colXMap[firstOffPos] + 4, y: margin.top - 10,
              'font-size': zoomLevel === 1 ? '7' : '8',
              'font-weight': '700',
              fill: '#0B2239', opacity: '0.5', 'letter-spacing': '2'
            }, 'OFFENSE'));
          }
        }
      }

      // D/O vertical separator
      if (hasD && hasO) {
        const firstOffPos = visiblePositions.find(p => POSITIONS.offense.includes(p));
        const sepX = colXMap[firstOffPos] - sepW / 2;
        svg.appendChild(svgEl('line', {
          x1: sepX, y1: 18,
          x2: sepX, y2: margin.top + totalChartH,
          stroke: '#C4D0CC', 'stroke-width': '1.5',
          'stroke-dasharray': '6,4'
        }));
      }

      // ── 4. Round rows: labels + horizontal dividers ───────────────────
      for (let rd = 1; rd <= 7; rd++) {
        const ry = rdY[rd];
        const rh = rdH[rd];
        const clr = ROUND_COLORS[rd];

        // Round label
        svg.appendChild(svgEl('text', {
          x: margin.left - 8, y: ry + rh / 2 + 5,
          'text-anchor': 'end',
          'font-size': '12', 'font-weight': '700',
          fill: '#4A6274'
        }, `R${rd}`));

        // Horizontal divider below row (except last)
        if (rd < 7) {
          svg.appendChild(svgEl('line', {
            x1: margin.left, y1: ry + rh,
            x2: margin.left + chartW, y2: ry + rh,
            stroke: '#C4C0B8', 'stroke-width': '1'
          }));
        }
      }

      // ── 5. Dots ───────────────────────────────────────────────────────
      visiblePositions.forEach(pos => {
        const colX = colXMap[pos];

        for (let rd = 1; rd <= 7; rd++) {
          const ry = rdY[rd];
          const rh = rdH[rd];
          const allRd = getByPosRound(pos, rd);

          if (isOverview) {
            const spread = spreadDots(allRd, ry, rh);
            spread.forEach(({ y, player }) => {
              const x = colX + colW / 2;
              drawDot(svg, x, y, player, false, 0);
            });
          } else {
            ['top', 'mid', 'bot'].forEach((key, bi) => {
              const bp = getInBand(pos, rd, key);
              const scX = colX + bi * subColW + subColW / 2;
              const spread = spreadDots(bp, ry, rh);

              let lastLabeledY = -Infinity;
              const minLabelGap = 82;

              spread.forEach(({ y, player }, idx) => {
                const canShowLabel =
                  isPlayers && ((y - lastLabeledY) >= minLabelGap);

                drawDot(svg, scX, y, player, canShowLabel, idx);

                if (canShowLabel) {
                  lastLabeledY = y;
                }
              });
            });
          }
        }
      });

      // ── 6. Chart border ──────────────────────────────────────────────
      // Unified top dark bar
      svg.appendChild(svgEl('rect', {
        x: margin.left,
        y: 0,
        width: chartW,
        height: 6,
        fill: '#0B2239',
        opacity: '0.55'
      }));

      // Left outer border (full height including header)
      svg.appendChild(svgEl('line', {
        x1: margin.left,
        y1: 0,
        x2: margin.left,
        y2: margin.top + totalChartH,
        stroke: '#AEB8C2',
        'stroke-width': '1.4'
      }));

      // Right outer border (full height including header)
      svg.appendChild(svgEl('line', {
        x1: margin.left + chartW,
        y1: 0,
        x2: margin.left + chartW,
        y2: margin.top + totalChartH,
        stroke: '#AEB8C2',
        'stroke-width': '1.4'
      }));

      // Bottom border line
      svg.appendChild(svgEl('line', {
        x1: margin.left,
        y1: margin.top + totalChartH,
        x2: margin.left + chartW,
        y2: margin.top + totalChartH,
        stroke: '#AEB8C2',
        'stroke-width': '1.4'
      }));

      updateLegend();
    }

    // ── Draw dot + optional label ─────────────────────────────────────────
    function drawDot(svg, x, y, player, showLabel, idx) {
      const sc = SCHOOL_COLORS[player.school] || { fill: '#9CA3AF', stroke: '#6B7280' };
      const dotRadius =
        zoomLevel === 0 ? 5.5 :
          zoomLevel === 1 ? 7 :
            8.75;

      // Live Draft mode: drafted players fade to a faint cream — still clickable
      const isDrafted = liveMode && player.drafted;
      const dotFill   = isDrafted ? 'rgba(210, 200, 185, 0.35)' : sc.fill;
      const dotStroke = isDrafted ? 'rgba(160, 150, 135, 0.45)' : '#4A4A4A';

      const circle = svgEl('circle', {
        cx: x,
        cy: y,
        r: String(dotRadius),
        fill: dotFill,
        stroke: dotStroke,
        'stroke-width': zoomLevel <= 1 ? '1.5' : '2',
        cursor: 'pointer'
      });
      circle.addEventListener('mouseenter', e => showTooltip(e, player));
      circle.addEventListener('mouseleave', hideTooltip);
      circle.addEventListener('click', e => {
        e.stopPropagation();
        if (IS_TOUCH) {
          const now = Date.now();
          if (now - _pcmLastTapMs < 350 && _pcmLastTapPlayer === player) {
            // Double-tap → open full card
            _pcmLastTapMs = 0;
            _pcmLastTapPlayer = null;
            if (typeof window.__openPlayerCard === 'function') window.__openPlayerCard(player);
          } else {
            // Single tap → tooltip preview
            _pcmLastTapMs = now;
            _pcmLastTapPlayer = player;
            showTooltip(e, player);
          }
        } else {
          // Desktop click → open full card via React bridge
          if (typeof window.__openPlayerCard === 'function') window.__openPlayerCard(player);
        }
      });
      svg.appendChild(circle);

      if (showLabel && !isDrafted) {
        const lineH = 11;
        // Stagger: even idx → label right, odd → label left
        const goRight = (idx % 2 === 0);
        const lx = goRight ? x + 8 : x - 8;
        const anchor = goRight ? 'start' : 'end';
        const baseY = y - lineH;

        svg.appendChild(svgEl('text', {
          x: lx, y: baseY, 'text-anchor': anchor,
          'font-size': '9', 'font-weight': '600',
          fill: '#1A2720', 'pointer-events': 'none'
        }, player.name));

        // Line 1: Round + Rank
        svg.appendChild(svgEl('text', {
          x: lx, y: baseY + lineH, 'text-anchor': anchor,
          'font-size': '8',
          fill: '#5A7868',
          'pointer-events': 'none'
        }, `R${player.rd} · #${player.rank}`));

        // Line 2: Height + Weight
        svg.appendChild(svgEl('text', {
          x: lx, y: baseY + lineH * 2, 'text-anchor': anchor,
          'font-size': '8',
          fill: '#6B8577',
          'pointer-events': 'none'
        }, `${fmtHeight(player.height)} · ${player.weight} lbs`));

        const strengths = [player.s1, player.s2, player.s3].filter(s => s && s !== 'N/A');

        if (strengths.length) {
          const strengthBaseY = baseY + lineH * 3;

          strengths.forEach((strength, i) => {
            const styles = [
              { fill: '#4F6F60', 'font-weight': '700' }, // Primary
              { fill: '#5E7A6C', 'font-weight': '600' }, // Secondary
              { fill: '#6A8477', 'font-weight': '500' }  // Supporting
            ][i] || { fill: '#6A8477', 'font-weight': '500' };

            const bulletStrength = `• ${strength}`;

            svg.appendChild(svgEl('text', {
              x: lx,
              y: strengthBaseY + (i * 9),
              'text-anchor': anchor,
              'font-size': '7.5',
              fill: styles.fill,
              'font-weight': styles['font-weight'],
              'pointer-events': 'none'
            }, bulletStrength));
          });
        }
      }
    }

    // ── Tooltip ───────────────────────────────────────────────────────────
    function showTooltip(event, player) {
      const tt = document.getElementById('tooltip');

      // Strengths: one per line, progressive boldness, light colors for dark background
      const strengths = [player.s1, player.s2, player.s3].filter(s => s && s !== 'N/A');
      const strengthStyles = [
        { color: '#B8D4C4', fontWeight: '700' }, // Primary — lightest, boldest
        { color: '#9ABFAD', fontWeight: '600' }, // Secondary
        { color: '#7EA896', fontWeight: '500' }  // Supporting
      ];
      const strHtml = strengths.length
        ? `<div style="margin-top:6px">${strengths.map((s, i) => {
          const st = strengthStyles[i] || strengthStyles[2];
          return `<div style="color:${st.color};font-weight:${st.fontWeight};font-size:11px">• ${s}</div>`;
        }).join('')}</div>`
        : '';

      tt.innerHTML = `
        <div class="tooltip-line"><strong>${player.name}</strong> &mdash; ${player.pos}</div>
        <div class="tooltip-line"><span class="tooltip-label">School:</span> ${player.school || 'N/A'}</div>
        <div class="tooltip-line"><span class="tooltip-label">Role:</span> ${player.role}</div>
        <div class="tooltip-line"><span class="tooltip-label">R${player.rd}, Pick #${player.rank}</span></div>
        <div class="tooltip-line">${fmtHeight(player.height)} &nbsp;·&nbsp; ${player.weight} lbs</div>
        ${strHtml}
    `;

      tt.style.display = 'block';
      tt.style.left = (event.pageX + 14) + 'px';
      tt.style.top = (event.pageY + 12) + 'px';
    }

    function hideTooltip() {
      document.getElementById('tooltip').style.display = 'none';
    }
    function clampCameraToBounds() {
      const viewport = document.getElementById('zoom-viewport');
      const stage = document.getElementById('zoom-stage');
      const svg = document.getElementById('chart');

      if (!viewport || !stage || !svg) return;

      const viewportRect = viewport.getBoundingClientRect();
      const svgWidth = parseFloat(svg.getAttribute('width')) || 0;
      const svgHeight = parseFloat(svg.getAttribute('height')) || 0;

      const scaledWidth = svgWidth * camera.scale;
      const scaledHeight = svgHeight * camera.scale;

      const padding = 120;

      let minX = viewportRect.width - scaledWidth - padding;
      let maxX = padding;
      let minY = viewportRect.height - scaledHeight - padding;
      let maxY = padding;

      if (scaledWidth + padding * 2 < viewportRect.width) {
        minX = maxX = (viewportRect.width - scaledWidth) / 2;
      }

      if (scaledHeight + padding * 2 < viewportRect.height) {
        minY = maxY = (viewportRect.height - scaledHeight) / 2;
      }

      camera.x = Math.min(maxX, Math.max(minX, camera.x));
      camera.y = Math.min(maxY, Math.max(minY, camera.y));
    }

    function applyCameraTransform() {
      const stage = document.getElementById('zoom-stage');
      clampCameraToBounds();
      stage.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`;
    }
    function updateLegend() {
      const legend = document.getElementById('players-legend');
      if (legend) legend.style.display = zoomLevel >= 4 ? 'flex' : 'none';
    }

    // ── Controls (button clicks) ──────────────────────────────────────────
    document.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentView = e.target.dataset.view;
        drawChart();
      });
    });


    // ── Live Draft mode toggle ────────────────────────────────────────────
    document.getElementById('live-draft-btn').addEventListener('click', () => {
      liveMode = !liveMode;
      document.getElementById('live-draft-btn').classList.toggle('active', liveMode);
      drawChart();
    });

    // ── Zoom: wheel + pinch → progressively reveal detail ─────────────────
    let zoomTimer = null;
    const ZOOM_DEBOUNCE_MS = 120;
    const MIN_ZOOM_LEVEL = 0;
    const MAX_ZOOM_LEVEL = 4;
    function updateZoomLevelFromScale() {
      if (camera.scale < 0.8) zoomLevel = 0;
      else if (camera.scale < 1.0) zoomLevel = 1;
      else if (camera.scale < 1.35) zoomLevel = 2;
      else if (camera.scale < 1.8) zoomLevel = 3;
      else zoomLevel = 4;
    }

    function updateZoomControl() {
      updateZoomLevelFromScale();

      document.querySelectorAll('.zoom-seg').forEach(seg => {
        seg.classList.toggle('active', parseInt(seg.dataset.level) === zoomLevel);
      });

      document.getElementById('zoom-in-btn').disabled = (camera.scale >= camera.maxScale);
      document.getElementById('zoom-out-btn').disabled = (camera.scale <= camera.minScale);
    }

    function zoomAtPoint(nextScale, clientX, clientY) {
      const viewport = document.getElementById('zoom-viewport');
      const rect = viewport.getBoundingClientRect();

      const pointX = clientX - rect.left;
      const pointY = clientY - rect.top;

      const worldX = (pointX - camera.x) / camera.scale;
      const worldY = (pointY - camera.y) / camera.scale;

      camera.scale = Math.max(camera.minScale, Math.min(camera.maxScale, nextScale));
      camera.x = pointX - worldX * camera.scale;
      camera.y = pointY - worldY * camera.scale;

      updateZoomControl();
      applyCameraTransform(); // immediate — just a CSS transform, very cheap

      // Debounce the expensive SVG redraw so rapid pinch events don't pile up
      clearTimeout(zoomTimer);
      zoomTimer = setTimeout(() => drawChart(), ZOOM_DEBOUNCE_MS);
    }

    // Desktop: mouse-wheel zoom on the chart wrapper
    // Desktop: scroll wheel over the chart zooms; outside it scrolls the page normally.
    // Uses a hover flag so we don't hijack page scroll when cursor isn't on the chart.
    chartWrapper = document.querySelector('.chart-wrapper');
    zoomViewport = document.getElementById('zoom-viewport');

    let cursorOverChart = false;

    chartWrapper.addEventListener('mouseenter', () => { cursorOverChart = true; });
    chartWrapper.addEventListener('mouseleave', () => { cursorOverChart = false; });

    // Drag to pan
    zoomViewport.addEventListener('mousedown', e => {
      isDragging = true;
      zoomViewport.classList.add('dragging');
      dragStart = { x: e.clientX, y: e.clientY };
      cameraStart = { x: camera.x, y: camera.y };
    });

    window.addEventListener('mousemove', e => {
      if (!isDragging) return;

      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      camera.x = cameraStart.x + dx;
      camera.y = cameraStart.y + dy;
      applyCameraTransform();
    });

    window.addEventListener('mouseup', () => {
      isDragging = false;
      zoomViewport.classList.remove('dragging');
    });
    window.addEventListener('wheel', e => {
      if (!cursorOverChart) return;

      e.preventDefault();

      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
      const nextScale = camera.scale * zoomFactor;

      zoomAtPoint(nextScale, e.clientX, e.clientY);
    }, { passive: false });

    // Mobile: pinch-to-zoom on the chart wrapper
    let pinchStartDist = null;
    let pinchStartLevel = 0;

    chartWrapper.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        // Two fingers: begin pinch-to-zoom; cancel any active single-finger pan
        isDragging = false;
        pinchStartDist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );
        pinchStartLevel = zoomLevel;
        e.preventDefault();
      } else if (e.touches.length === 1) {
        // One finger: begin pan (same state variables as mouse drag)
        // NOTE: no e.preventDefault() here — allows click events on buttons inside chartWrapper
        isDragging = true;
        hideTooltip(); // dismiss any open player card when panning starts
        dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        cameraStart = { x: camera.x, y: camera.y };
      }
    }, { passive: false });

    chartWrapper.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && pinchStartDist !== null) {
        // Two-finger pinch-to-zoom
        const dist = Math.hypot(
          e.touches[1].clientX - e.touches[0].clientX,
          e.touches[1].clientY - e.touches[0].clientY
        );

        const ratio = dist / pinchStartDist;
        const nextScale = camera.scale * ratio;

        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

        zoomAtPoint(nextScale, centerX, centerY);
        pinchStartDist = dist;
        e.preventDefault();
      } else if (e.touches.length === 1 && isDragging) {
        // Single-finger pan
        const dx = e.touches[0].clientX - dragStart.x;
        const dy = e.touches[0].clientY - dragStart.y;
        const prevX = camera.x;
        const prevY = camera.y;
        camera.x = cameraStart.x + dx;
        camera.y = cameraStart.y + dy;
        applyCameraTransform(); // clamps camera to bounds
        // Only consume the event if the camera actually moved.
        // If fully clamped (at boundary), release so the outer page can scroll.
        const cameraMoved = Math.abs(camera.x - prevX) > 0.5 || Math.abs(camera.y - prevY) > 0.5;
        if (cameraMoved) e.preventDefault();
      }
    }, { passive: false });

    chartWrapper.addEventListener('touchend', e => {
      if (e.touches.length < 2) pinchStartDist = null;
      if (e.touches.length === 0) isDragging = false;
    });

    // ── Zoom widget + / − buttons ──────────────────────────────────────────
    document.getElementById('zoom-in-btn').addEventListener('click', () => {
      const viewport = document.getElementById('zoom-viewport');
      const rect = viewport.getBoundingClientRect();
      zoomAtPoint(camera.scale * 1.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });

    document.getElementById('zoom-out-btn').addEventListener('click', () => {
      const viewport = document.getElementById('zoom-viewport');
      const rect = viewport.getBoundingClientRect();
      zoomAtPoint(camera.scale * 0.8, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });

    // Dismiss tooltip on any click outside a dot (dots use stopPropagation to prevent this)
    document.addEventListener('click', hideTooltip);

    drawChart();
    updateZoomControl();
    applyCameraTransform();

// ── Public init API (called by DraftChart.tsx on re-mount) ─────────────────
window.initDraftMap = function () {
  drawChart();
  updateZoomControl();
  applyCameraTransform();
};
