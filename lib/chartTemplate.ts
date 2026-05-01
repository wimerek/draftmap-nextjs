/**
 * lib/chartTemplate.ts
 *
 * HTML structure for the DraftMap chart — extracted from draftmap-mockup-v2.html.
 * Injected into the DraftChart component container via innerHTML.
 * Includes font <link> tags, both <style> blocks, and all body HTML.
 * Does NOT include the chart JS — that lives in public/chart-engine.js.
 *
 * Auto-generated: do not edit by hand.
 * To update: re-run the extraction script or edit draftmap-mockup-v2.html and re-extract.
 */

export const CHART_HTML_TEMPLATE = `  <title>DraftMap - Flipped Layout</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link
    href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&family=Oswald:wght@400;500;600;700&display=swap"
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: #F5EFE4;
      color: #101820;
      padding: 24px;
    }

    .container {
      max-width: 100%;
      margin: 0 auto;
    }

    /* ============ DraftMap header ============ */
    .dm-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(11, 34, 57, 0.1);
      margin-bottom: 28px;
      gap: 16px;
      flex-wrap: wrap;
    }

    .dm-brand {
      display: inline-flex;
      align-items: center;
      gap: 12px;
    }

    .dm-brand img {
      height: 60px;
      width: auto;
      display: block;
      border-radius: 10px;
      box-shadow:
        0 1px 0 rgba(255, 255, 255, 0.6) inset,
        0 1px 2px rgba(11, 34, 57, 0.08),
        0 6px 16px rgba(11, 34, 57, 0.14),
        0 12px 28px rgba(11, 34, 57, 0.08);
    }

    .dm-wordmark {
      font-family: 'Inter', sans-serif;
      font-weight: 800;
      font-size: 32px;
      letter-spacing: -0.5px;
      color: #0B2239;
      line-height: 1;
    }

    .dm-beta-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: rgba(212, 160, 23, 0.12);
      border: 1px solid rgba(212, 160, 23, 0.4);
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      color: #A67B00;
      font-family: 'JetBrains Mono', monospace;
      letter-spacing: 0.04em;
    }

    .dm-beta-pill::before {
      content: "";
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #D4A017;
    }

    /* ============ DraftMap footer ============ */
    .dm-footer {
      margin-top: 28px;
      padding-top: 20px;
      border-top: 1px solid rgba(11, 34, 57, 0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }

    .dm-foot-caption {
      font-size: 13px;
      color: #4A6274;
      font-style: italic;
    }

    .dm-foot-meta {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #7A8E9A;
      letter-spacing: 0.04em;
    }

    .controls {
      display: flex;
      gap: 32px;
      align-items: center;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    .chart-hint {
      margin-left: auto;
      font-size: 11px;
      font-weight: 500;
      color: #7A8E9A;
      letter-spacing: 0.2px;
      font-style: italic;
    }

    .live-draft-btn {
      padding: 6px 13px;
      border: 1.5px solid rgba(74, 98, 116, 0.35);
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      background: transparent;
      color: #4A6274;
      font-family: 'Inter', sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      transition: all 0.2s ease;
      white-space: nowrap;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .live-draft-btn:hover {
      background: rgba(11, 34, 57, 0.06);
      border-color: #4A6274;
      color: #0B2239;
    }
    .live-draft-btn.active {
      background: #0B2239;
      border-color: #0B2239;
      color: #fff;
    }
    .live-dot-indicator {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #6B7280;
      flex-shrink: 0;
      transition: background 0.2s ease;
    }
    .live-draft-btn.active .live-dot-indicator {
      background: #34d399;
    }

    .view-toggle-btn {
      padding: 6px 13px;
      border: 1.5px solid rgba(74, 98, 116, 0.35);
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      background: transparent;
      color: #4A6274;
      font-family: 'Inter', sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      transition: all 0.2s ease;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .view-toggle-btn:hover {
      background: rgba(11, 34, 57, 0.06);
      border-color: #4A6274;
      color: #0B2239;
    }

    .button-group {
      display: flex;
      gap: 8px;
      background: #DDE2E6;
      padding: 4px;
      border-radius: 8px;
      /* Sharper corners for technical look */
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      background: transparent;
      color: #4A6274;
      font-family: 'Inter', sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .btn.active {
      background: #0B2239;
      /* Deep NFL Navy */
      color: #FFFFFF;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }

    .btn:hover:not(.active) {
      color: #0B2239;
      background: rgba(11, 34, 57, 0.05);
    }

    .year-label {
      font-size: 13px;
      color: #4A6274;
      font-weight: 700;
      text-transform: uppercase;
    }

    .chart-wrapper {
      background: #FFFFFF;
      border-radius: 8px;
      padding: 0;
      overflow: hidden;
      position: relative;
      border: 1px solid #DDE2E6;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
      height: 78vh;
      min-height: 640px;
    }

    .zoom-viewport {
      width: 100%;
      height: 100%;
      overflow: hidden;
      position: relative;
      cursor: grab;
      touch-action: none;
      border-radius: 8px;
      background:
        linear-gradient(rgba(11, 34, 57, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(11, 34, 57, 0.03) 1px, transparent 1px),
        #F7F3EC;
      background-size: 28px 28px, 28px 28px, auto;
    }

    .zoom-viewport.dragging {
      cursor: grabbing;
    }

    .zoom-stage {
      position: absolute;
      top: 0;
      left: 0;
      transform-origin: 0 0;
      will-change: transform;
      filter: drop-shadow(0 12px 24px rgba(0, 0, 0, 0.08));
    }

    svg {
      display: block;
    }

    /* Tooltip: Moving away from green to a dark, objective slate */
    .tooltip {
      position: absolute;
      background: #101820;
      border: 1px solid #4A6274;
      border-radius: 4px;
      padding: 12px;
      font-size: 12px;
      z-index: 1000;
      pointer-events: none;
      max-width: 200px;
      color: #FFFFFF;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
    }

    .tooltip-line {
      margin: 4px 0;
      color: #FFFFFF;
    }

    .tooltip-label {
      color: #AAB8C2;
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 600;
    }

    /* Legend: Replaced gold with High-Contrast Orange */
    .players-legend {
      display: none;
      position: absolute;
      right: 18px;
      bottom: 18px;
      flex-direction: column;
      gap: 8px;
      padding: 14px 18px;
      background: rgba(255, 255, 255, 0.96);
      border: 1px solid #D7DEE5;
      border-left: 5px solid #FF4D00;
      border-radius: 8px;
      font-size: 12px;
      min-width: 280px;
      max-width: 320px;
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.10);
      z-index: 25;
    }

    .players-legend-title {
      color: #FF4D00;
      font-weight: 800;
      font-size: 12px;
      letter-spacing: 1.4px;
      text-transform: uppercase;
      margin-bottom: 8px;
      border-bottom: 1px solid #ECEFF2;
      padding-bottom: 8px;
    }

    .players-legend-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      /* Square/technical dots instead of circles */
      background: #0B2239;
      border: 1px solid #FFFFFF;
      flex-shrink: 0;
    }

    .legend-lines {
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .legend-line-1 {
      color: #101820;
      font-weight: 700;
      font-size: 11px;
      line-height: 1.35;
    }

    .legend-line-2 {
      color: #4A6274;
      font-size: 10px;
      font-weight: 600;
      line-height: 1.35;
    }

    .legend-line-3 {
      color: #5F7467;
      font-size: 10px;
      line-height: 1.4;
    }

    /* ── Zoom control widget (Google Maps style) ── */
    .zoom-control {
      position: absolute;
      bottom: 20px;
      right: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid #C8D0D8;
      border-radius: 8px;
      padding: 8px 6px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
      z-index: 20;
      user-select: none;
    }

    .zoom-btn {
      width: 28px;
      height: 28px;
      border: 1px solid #C8D0D8;
      background: #FFFFFF;
      border-radius: 5px;
      font-size: 18px;
      font-weight: 400;
      line-height: 1;
      cursor: pointer;
      color: #0B2239;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s, color 0.15s;
      font-family: 'Inter', sans-serif;
    }

    .zoom-btn:hover:not(:disabled) {
      background: #0B2239;
      color: #FFFFFF;
      border-color: #0B2239;
    }

    .zoom-btn:disabled {
      opacity: 0.25;
      cursor: default;
    }

    .zoom-track {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 2px 0;
    }

    .zoom-seg {
      width: 16px;
      height: 8px;
      border-radius: 2px;
      background: #DDE2E6;
      transition: background 0.2s, transform 0.15s, opacity 0.2s;
      cursor: default;
      opacity: 0.7;
    }

    .zoom-seg.active {
      background: #0B2239;
      transform: scaleX(1.2);
      opacity: 1;
    }

    @media (max-width: 900px) {
      .players-legend {
        right: 14px;
        bottom: 14px;
        min-width: 240px;
        max-width: 270px;
        padding: 12px 14px;
      }

      .players-legend-title {
        font-size: 11px;
      }

      .legend-line-1,
      .legend-line-2,
      .legend-line-3 {
        font-size: 9px;
      }
    }
  </style>

  <!-- ── Player Card Modal Styles ─────────────────────────────────────────── -->
  <style>
    /* Backdrop */
    #pcm-bd {
      position: fixed;
      inset: 0;
      background: rgba(13, 21, 38, 0.82);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 16px;
    }

    /* Card wrapper — scrollable container */
    #pcm-wrap {
      position: relative;
      width: min(1060px, 94vw);
      max-height: 90vh;
      overflow-y: auto;
      overflow-x: hidden;
      background: #f7f1e4;
      border: 2px solid rgba(20, 16, 12, 0.72);
      outline: 2px solid rgba(20, 16, 12, 0.55);
      outline-offset: -12px;
      padding: 22px 24px 52px;

      /* CSS vars for the card — defaults; overridden per-player by JS */
      --pcm-bg: #ece7dc;
      --pcm-surface: #f7f1e4;
      --pcm-ink: #171411;
      --pcm-text-primary: #1e1a16;
      --pcm-text-secondary: #5f564a;
      --pcm-text-muted: #7a7062;
      --pcm-border: rgba(30, 26, 22, 0.14);
      --pcm-border-strong: rgba(30, 26, 22, 0.26);

      --pcm-metric-great-bg: rgba(212, 160, 23, 0.38);
      --pcm-metric-great-border: rgba(212, 160, 23, 0.70);
      --pcm-metric-great-text: #5A3800;
      --pcm-metric-good-bg: rgba(212, 160, 23, 0.16);
      --pcm-metric-good-border: rgba(212, 160, 23, 0.45);
      --pcm-metric-good-text: #7A5000;
      --pcm-metric-below-bg: rgba(30, 26, 22, 0.09);
      --pcm-metric-below-border: rgba(30, 26, 22, 0.20);
      --pcm-metric-below-text: #7a7062;

      --pcm-zone-below-bg: rgba(30, 26, 22, 0.06);
      --pcm-zone-good-bg: rgba(212, 160, 23, 0.20);
      --pcm-zone-good-div: rgba(212, 160, 23, 0.42);
      --pcm-zone-great-bg: rgba(212, 160, 23, 0.46);
      --pcm-zone-great-div: rgba(212, 160, 23, 0.68);

      /* Team colors — overridden per-player */
      --pcm-team-primary: #4A4A4A;
      --pcm-team-secondary: #6B7280;
      --pcm-team-primary-wash: rgba(74, 74, 74, 0.20);
    }

    /* Inset border frame — handled via outline on #pcm-wrap (paints above section bands) */

    /* Close button */
    #pcm-close {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1.5px solid rgba(20, 16, 12, 0.30);
      background: rgba(20, 16, 12, 0.06);
      color: var(--pcm-ink);
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
    }
    #pcm-close:hover { background: rgba(20, 16, 12, 0.14); }

    /* Draft result badge — upper right of card header, visible only when player is picked */
    #pcmDraftResult {
      position: absolute;
      top: 4px;
      right: 48px;
      background: rgba(30, 26, 22, 0.06);
      border: 1px solid rgba(30, 26, 22, 0.18);
      border-radius: 6px;
      padding: 5px 9px 6px;
      display: none;
    }
    .pcm-draft-badge-label {
      font-size: 7.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.9px;
      color: var(--pcm-text-muted);
      margin-bottom: 4px;
    }
    .pcm-draft-table {
      border-collapse: collapse;
    }
    .pcm-draft-table td {
      padding: 1.5px 0;
      font-size: 10px;
      color: var(--pcm-text-primary);
      line-height: 1.2;
    }
    .pcm-draft-table td:first-child {
      color: var(--pcm-text-muted);
      font-size: 8px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      padding-right: 8px;
    }
    .pcm-draft-table td:last-child {
      font-weight: 700;
    }

    /* Card ID */
    .pcm-card-id {
      font-family: 'Oswald', sans-serif;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: var(--pcm-ink);
      margin-bottom: 4px;
    }

    /* Player name */
    .pcm-player-name {
      font-family: 'Oswald', sans-serif;
      font-size: clamp(32px, 5vw, 50px);
      font-weight: 700;
      line-height: 0.95;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--pcm-ink);
      text-align: center;
      margin: 4px 60px 10px;
    }

    /* Identity line */
    .pcm-identity-line {
      display: flex;
      justify-content: center;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px 12px;
      font-family: 'Oswald', sans-serif;
      font-size: 20px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--pcm-text-primary);
      margin-bottom: 8px;
    }
    .pcm-meta-divider {
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: var(--pcm-team-primary);
      opacity: 0.75;
      flex-shrink: 0;
    }

    /* Section bands */
    .pcm-section-band {
      position: relative;
      margin: 20px -14px 14px;
      padding: 0 30px 6px;
      min-height: 32px;
      display: flex;
      align-items: center;
      font-family: 'Oswald', sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 15px;
      color: #fffaf0;
      background: var(--pcm-team-primary);
      border: 2px solid rgba(23, 20, 17, 0.85);
    }
    .pcm-section-band::after {
      content: "";
      position: absolute;
      left: -2px; right: -2px; bottom: -2px;
      height: 6px;
      background: var(--pcm-team-secondary);
      border-top: 1px solid rgba(23, 20, 17, 0.12);
    }

    .pcm-section-block {
      padding: 0 0 12px;
      border-bottom: 1px solid var(--pcm-border);
    }
    .pcm-section-block:last-of-type { border-bottom: none; padding-bottom: 0; }

    /* Profile rail */
    .pcm-profile-rail {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0 28px;
      align-items: center;
    }
    .pcm-profile-label {
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--pcm-text-muted);
      margin-bottom: 6px;
    }
    .pcm-role-pennant {
      display: inline-flex;
      align-items: center;
      padding: 12px 38px 12px 18px;
      background: var(--pcm-team-secondary);
      color: #fffaf0;
      font-family: 'Oswald', sans-serif;
      font-size: 20px;
      font-weight: 600;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      clip-path: polygon(0 0, calc(100% - 22px) 0, 100% 50%, calc(100% - 22px) 100%, 0 100%);
      white-space: nowrap;
    }
    .pcm-strengths-panel {
      min-width: 0;
      padding-left: 20%;
    }
    .pcm-strength-stack { display: flex; flex-direction: column; gap: 6px; }
    .pcm-strength-row   { display: flex; align-items: stretch; width: 72%; }
    .pcm-strength-row.pcm-s-secondary  { width: 58%; }
    .pcm-strength-row.pcm-s-supportive { width: 46%; }
    .pcm-pennant-tail {
      width: 12px; flex-shrink: 0;
      display: flex; flex-direction: column; gap: 3px;
    }
    .pcm-tail-strip { flex: 1; background: var(--pcm-team-secondary); }
    .pcm-tail-strip.upper { clip-path: polygon(0 0, 100% 0, 100% 100%, 28% 100%); }
    .pcm-tail-strip.lower { clip-path: polygon(28% 0, 100% 0, 100% 100%, 0 100%); }
    .pcm-pennant-flag {
      flex: 1;
      display: flex; flex-direction: column; justify-content: center;
      padding: 8px 24px 8px 12px;
      background: var(--pcm-team-primary-wash);
      clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%);
      min-height: 40px;
    }
    .pcm-pennant-kicker {
      font-family: 'Inter', sans-serif;
      font-size: 8px; font-weight: 800;
      letter-spacing: 0.14em; text-transform: uppercase;
      color: var(--pcm-text-muted); margin-bottom: 2px;
    }
    .pcm-pennant-text {
      font-family: 'Oswald', sans-serif;
      font-size: 18px; font-weight: 600;
      letter-spacing: 0.03em; text-transform: uppercase;
      color: var(--pcm-ink); line-height: 1.05; white-space: nowrap;
    }

    /* Metric table */
    .pcm-metric-table { display: grid; row-gap: 0; }
    .pcm-metric-head,
    .pcm-metric-item {
      display: grid;
      grid-template-columns: 132px 96px minmax(300px, 1.45fr) 60px minmax(160px, 0.75fr);
      column-gap: 12px;
      align-items: center;
    }
    .pcm-metric-head {
      padding: 0 0 6px;
      border-bottom: 1px solid var(--pcm-border);
      margin-bottom: 4px;
    }
    .pcm-metric-head div {
      font-size: 10px; font-weight: 800;
      letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--pcm-text-muted);
    }
    .pcm-metric-legend {
      display: flex; align-items: center; justify-content: center;
      gap: 6px; flex-wrap: wrap; margin-top: 3px;
    }
    .pcm-legend-zone, .pcm-legend-peer {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 8.5px; font-weight: 800;
      letter-spacing: 0.06em; text-transform: uppercase;
      color: var(--pcm-text-muted);
    }
    .pcm-legend-swatch {
      width: 18px; height: 8px; border-radius: 2px; border: 1px solid; flex-shrink: 0;
    }
    .pcm-legend-swatch.below { background: var(--pcm-zone-below-bg); border-color: rgba(30,26,22,0.18); }
    .pcm-legend-swatch.good  { background: var(--pcm-zone-good-bg);  border-color: var(--pcm-zone-good-div); }
    .pcm-legend-swatch.great { background: var(--pcm-zone-great-bg); border-color: var(--pcm-zone-great-div); }
    .pcm-legend-peer-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: rgba(110,96,78,0.28); border: 1px solid rgba(110,96,78,0.16); flex-shrink: 0;
    }
    .pcm-metric-subtitle {
      margin: 12px 0 6px;
      font-family: 'Oswald', sans-serif;
      font-size: 12px; font-weight: 600;
      letter-spacing: 0.08em; text-transform: uppercase;
      color: var(--pcm-text-secondary);
    }
    .pcm-metric-item {
      min-height: 40px; padding: 8px 0;
      border-bottom: 1px solid var(--pcm-border);
    }
    .pcm-metric-item:last-child { border-bottom: none; }
    .pcm-metric-name {
      font-size: 11px; font-weight: 700;
      color: var(--pcm-text-secondary);
      display: flex; align-items: center; gap: 6px;
    }
    .pcm-metric-item.key .pcm-metric-name { color: var(--pcm-text-primary); }
    .pcm-key-marker {
      position: relative;
      display: inline-flex; align-items: center; justify-content: center;
      width: 13px; height: 13px; border-radius: 50%;
      font-size: 9px; line-height: 1; font-weight: 800;
      color: #7A5000;
      background: rgba(212,160,23,0.16);
      border: 1px solid rgba(212,160,23,0.42);
      cursor: help; flex: 0 0 auto;
    }
    .pcm-key-marker::before { content: "★"; }
    .pcm-key-marker::after {
      content: "Key metric for this position";
      position: absolute;
      left: 50%; bottom: calc(100% + 6px);
      transform: translateX(-50%);
      background: rgba(23,20,17,0.94); color: #fffaf0;
      padding: 5px 7px; border-radius: 5px;
      font-size: 9px; font-weight: 700;
      letter-spacing: 0.04em; text-transform: none; white-space: nowrap;
      opacity: 0; pointer-events: none;
      transition: opacity 0.15s ease; z-index: 20;
    }
    .pcm-key-marker:hover::after { opacity: 1; }
    .pcm-metric-value {
      display: inline-flex; align-items: center;
      width: fit-content;
      font-size: 12px; font-weight: 800;
      font-variant-numeric: tabular-nums; white-space: nowrap;
      padding: 3px 8px; border-radius: 999px; border: 2px solid;
    }
    .pcm-tier-great { background: var(--pcm-metric-great-bg); border-color: var(--pcm-metric-great-border); color: var(--pcm-metric-great-text); }
    .pcm-tier-good  { background: var(--pcm-metric-good-bg);  border-color: var(--pcm-metric-good-border);  color: var(--pcm-metric-good-text); }
    .pcm-tier-below { background: var(--pcm-metric-below-bg); border-color: var(--pcm-metric-below-border); color: var(--pcm-metric-below-text); }
    .pcm-metric-item.na .pcm-metric-name,
    .pcm-metric-item.na .pcm-metric-desc { color: var(--pcm-text-muted); }
    .pcm-metric-item.na .pcm-zone-track-wrap { opacity: 0.45; }
    .pcm-metric-better {
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700;
      color: rgba(30,26,22,0.46); line-height: 1;
    }
    .pcm-metric-better.na { color: rgba(30,26,22,0.18); }
    .pcm-metric-desc {
      font-size: 11.5px; font-weight: 500;
      color: var(--pcm-text-secondary); line-height: 1.35; padding-left: 8px;
    }

    /* Zone track */
    .pcm-zone-track-wrap {
      position: relative; width: 100%; height: 70px;
      display: flex; align-items: flex-start;
    }
    .pcm-zone-track {
      position: absolute; left: 0; right: 0; top: 14px; height: 12px;
      display: flex; border-radius: 4px; overflow: hidden;
      border: 1px solid rgba(30,26,22,0.13);
    }
    .pcm-zone-seg { height: 100%; flex-shrink: 0; }
    .pcm-zone-below { background: var(--pcm-zone-below-bg); }
    .pcm-zone-good  { background: var(--pcm-zone-good-bg);  border-left: 1.5px solid var(--pcm-zone-good-div); }
    .pcm-zone-great { background: var(--pcm-zone-great-bg); border-left: 1.5px solid var(--pcm-zone-great-div); }
    .pcm-zone-overlay {
      position: absolute; left: 0; right: 0; top: 0; height: 70px;
      pointer-events: none;
    }
    .pcm-peer-dot {
      position: absolute; width: 5px; height: 5px; border-radius: 50%;
      background: rgba(110,96,78,0.22); border: 1px solid rgba(110,96,78,0.10);
      transform: translate(-50%, -50%);
    }
    .pcm-player-callout {
      position: absolute; top: 3px; transform: translateX(-50%);
      font-size: 9px; font-weight: 800; font-family: 'Inter', sans-serif;
      color: var(--pcm-team-primary); white-space: nowrap;
      letter-spacing: 0.02em; line-height: 1;
    }
    .pcm-player-dot-halo {
      position: absolute; top: 14px; margin-top: -3px;
      width: 18px; height: 18px; border-radius: 50%;
      background: #f7f1e4; transform: translate(-50%, 0); z-index: 4;
    }
    .pcm-player-dot-marker {
      position: absolute; top: 14px; margin-top: 0.5px;
      width: 11px; height: 11px; border-radius: 50%;
      background: var(--pcm-team-primary);
      border: 2px solid #f7f1e4;
      box-shadow: 0 0 0 1.5px rgba(30,26,22,0.22), 0 2px 5px rgba(30,26,22,0.20);
      transform: translate(-50%, 0); z-index: 5;
    }
    .pcm-threshold-tick {
      position: absolute; top: 27px; width: 1.5px; height: 7px;
      background: rgba(30,26,22,0.25); transform: translateX(-50%);
    }
    .pcm-zone-area-lbl {
      position: absolute; top: 37px; text-align: center;
      font-size: 7px; font-weight: 800; letter-spacing: 0.09em;
      text-transform: uppercase; color: rgba(30,26,22,0.32);
      white-space: nowrap; overflow: hidden; line-height: 1;
    }
    .pcm-threshold-val {
      position: absolute; top: 48px; transform: translateX(-50%);
      font-size: 6.5px; font-weight: 700; font-family: 'Inter', sans-serif;
      color: rgba(30,26,22,0.38); white-space: nowrap; letter-spacing: 0.02em; line-height: 1;
    }
    .pcm-zone-na-label {
      font-size: 11px; font-weight: 600; color: var(--pcm-text-muted); margin-top: 14px;
    }

    /* Responsive */
    @media (max-width: 700px) {
      #pcm-wrap { padding: 16px 14px 22px; }
      .pcm-metric-head { display: none; }
      .pcm-metric-item {
        grid-template-columns: 1fr;
        row-gap: 5px; padding: 10px 0;
      }
      .pcm-zone-track-wrap { max-width: 380px; }
      .pcm-profile-rail { grid-template-columns: 1fr; gap: 14px 0; }
      .pcm-strength-row.pcm-s-secondary  { width: 86%; }
      .pcm-strength-row.pcm-s-supportive { width: 72%; }
    }
  </style>
</head>

<body>
  <div class="container">
    <header class="dm-header">
      <div class="dm-brand">
        <img
          src="data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+CiAgPGRlZnM+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9InZnIiBjeD0iNTAlIiBjeT0iNDUlIiByPSI2NSUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjMjIzMDUyIj48L3N0b3A+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzFBMjU0MCI+PC9zdG9wPgogICAgPC9yYWRpYWxHcmFkaWVudD4KICA8L2RlZnM+CiAgPHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiMxQTI1NDAiPjwvcmVjdD4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0idXJsKCN2ZykiPjwvcmVjdD4KICA8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSg0MCwgNDApIHNjYWxlKDgpIj4KICAgIDxsaW5lIHgxPSI4IiB5MT0iNCIgeDI9IjgiIHkyPSIzNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMTgpIiBzdHJva2Utd2lkdGg9IjAuNCI+PC9saW5lPjxsaW5lIHgxPSI0IiB5MT0iOCIgeDI9IjM2IiB5Mj0iOCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMTgpIiBzdHJva2Utd2lkdGg9IjAuNCI+PC9saW5lPjxsaW5lIHgxPSIxNiIgeTE9IjQiIHgyPSIxNiIgeTI9IjM2IiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xOCkiIHN0cm9rZS13aWR0aD0iMC40Ij48L2xpbmU+PGxpbmUgeDE9IjQiIHkxPSIxNiIgeDI9IjM2IiB5Mj0iMTYiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjE4KSIgc3Ryb2tlLXdpZHRoPSIwLjQiPjwvbGluZT48bGluZSB4MT0iMjQiIHkxPSI0IiB4Mj0iMjQiIHkyPSIzNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMTgpIiBzdHJva2Utd2lkdGg9IjAuNCI+PC9saW5lPjxsaW5lIHgxPSI0IiB5MT0iMjQiIHgyPSIzNiIgeTI9IjI0IiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4xOCkiIHN0cm9rZS13aWR0aD0iMC40Ij48L2xpbmU+PGxpbmUgeDE9IjMyIiB5MT0iNCIgeDI9IjMyIiB5Mj0iMzYiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjE4KSIgc3Ryb2tlLXdpZHRoPSIwLjQiPjwvbGluZT48bGluZSB4MT0iNCIgeTE9IjMyIiB4Mj0iMzYiIHkyPSIzMiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMTgpIiBzdHJva2Utd2lkdGg9IjAuNCI+PC9saW5lPjxsaW5lIHgxPSI0IiB5MT0iMzYiIHgyPSIzNC40IiB5Mj0iMzYiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjMwKSIgc3Ryb2tlLXdpZHRoPSIwLjgiPjwvbGluZT48bGluZSB4MT0iNCIgeTE9IjM2IiB4Mj0iNCIgeTI9IjUuNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMzApIiBzdHJva2Utd2lkdGg9IjAuOCI+PC9saW5lPjxwb2x5Z29uIHBvaW50cz0iMzYsMzYgMzQuNCwzNS4yIDM0LjQsMzYuOCIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjc4KSI+PC9wb2x5Z29uPjxwb2x5Z29uIHBvaW50cz0iNCw0IDMuMiw1LjYgNC44LDUuNiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjc4KSI+PC9wb2x5Z29uPjxjaXJjbGUgY3g9IjE0LjIyNiIgY3k9IjguNDQ4IiByPSIxLjA5MyIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuMjEzIiBjeT0iOC41OTUiIHI9IjEuMTQ3IiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxNi45NjkiIGN5PSI4LjA0OCIgcj0iMC44OTkiIGZpbGw9IiNENEEwMTciPjwvY2lyY2xlPjxjaXJjbGUgY3g9IjE3LjYyNyIgY3k9IjcuOTI3IiByPSIwLjYzMiIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTkuMDg2IiBjeT0iOC42NDEiIHI9IjAuMjk3IiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIyMC43NjkiIGN5PSI5LjkzNiIgcj0iMC4zNDIiIGZpbGw9IiNENEEwMTciPjwvY2lyY2xlPjxjaXJjbGUgY3g9IjIxLjYzNyIgY3k9IjkuODc3IiByPSIwLjU1NSIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMjQuODQ2IiBjeT0iMTUuNTMwIiByPSIwLjk1MyIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMjUuNDk5IiBjeT0iMTcuNDU0IiByPSIxLjA1OSIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMjYuMDQ2IiBjeT0iMTcuNjUzIiByPSIxLjExNyIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMjYuNTkwIiBjeT0iMTkuNzU2IiByPSIxLjY5MCIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMjQuNDc5IiBjeT0iMjUuMjY2IiByPSIxLjE4MSIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMjMuMDkwIiBjeT0iMjcuNjEzIiByPSIxLjc4OSIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMjIuODA3IiBjeT0iMjkuMDU0IiByPSIxLjUwNyIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTcuNzI4IiBjeT0iMzEuODkwIiByPSIwLjMzNyIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTUuOTM4IiBjeT0iMzEuNzM2IiByPSIxLjA1NyIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTMuOTM2IiBjeT0iMzIuMzU0IiByPSIxLjM2NiIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTMuNDQ1IiBjeT0iMzEuNTkyIiByPSIxLjY5OSIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTMuODE2IiBjeT0iMzEuNDM0IiByPSIxLjc1OCIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTMuODcxIiBjeT0iMzIuMjExIiByPSIxLjQzMCIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuMzc1IiBjeT0iMzIuNDU3IiByPSIxLjI3MyIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuNDQ2IiBjeT0iMzIuNDAxIiByPSIxLjI4MyIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuNTQ4IiBjeT0iMzIuNjk3IiByPSIxLjE1MSIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuMDE1IiBjeT0iMzIuNjc0IiByPSIxLjIyNiIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTMuNjU3IiBjeT0iMzIuNDAxIiByPSIxLjM1OCIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuMDY2IiBjeT0iMzEuNDIyIiByPSIxLjcyOCIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuMzE2IiBjeT0iMzEuMjg4IiByPSIxLjcxOCIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuNTY5IiBjeT0iMzEuOTEyIiByPSIxLjQ0MSIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuMzc0IiBjeT0iMzEuNzIyIiByPSIxLjU1MyIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTMuNzE5IiBjeT0iMzEuNjM3IiByPSIxLjY4MCIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuNDUxIiBjeT0iMzEuNDA5IiByPSIxLjY0MiIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTMuOTEzIiBjeT0iMzIuNjQ1IiByPSIxLjI0NiIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuMTcyIiBjeT0iMzEuMzM3IiByPSIxLjczNyIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuMDg0IiBjeT0iMzEuMzY5IiByPSIxLjc0NCIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTMuNDY0IiBjeT0iMzEuODA2IiByPSIxLjYwOSIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuMTE1IiBjeT0iMzIuMjk1IiByPSIxLjM3MyIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuMjQ4IiBjeT0iMzIuMjcwIiByPSIxLjM2NiIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTMuODA1IiBjeT0iMzIuNTQ0IiByPSIxLjI5NCIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuMzMwIiBjeT0iMzIuMTI4IiByPSIxLjQwOSIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuNTUzIiBjeT0iMzEuNzI3IiByPSIxLjUwOSIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuNTQ3IiBjeT0iMzIuNDczIiByPSIxLjIzOCIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuNDI1IiBjeT0iMzEuMzExIiByPSIxLjY4MCIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTMuNDM5IiBjeT0iMzEuNjQ4IiByPSIxLjY3NSIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuMTI5IiBjeT0iMzIuMDcyIiByPSIxLjQ2MSIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuMDEyIiBjeT0iMzEuNzUzIiByPSIxLjYwNSIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuMDI2IiBjeT0iMzIuNTA5IiByPSIxLjI5NCIgZmlsbD0iI0Q0QTAxNyI+PC9jaXJjbGU+PGNpcmNsZSBjeD0iMTQuMjA2IiBjeT0iNy41NjgiIHI9IjAuNzAxIiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxNS4xMDYiIGN5PSIxMS4wMzYiIHI9IjEuNjU4IiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxNC41NjQiIGN5PSIxMi45OTYiIHI9IjAuNjAxIiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxNC43MzAiIGN5PSIxOC4wODEiIHI9IjAuMjk3IiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxNC4zMTEiIGN5PSIxOS41MzkiIHI9IjAuMjk3IiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxNC45NTMiIGN5PSIyMi4yNzciIHI9IjAuMjk3IiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxMy41NDkiIGN5PSIyNS44MDMiIHI9IjAuMjk3IiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxNC4yNTEiIGN5PSIyOC42ODciIHI9IjEuNDE3IiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxNC41NzUiIGN5PSIyOS44MzciIHI9IjEuNzE1IiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxNC42MDYiIGN5PSIzMC44MTEiIHI9IjEuNzM2IiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxMy44MDAiIGN5PSIzMS45ODAiIHI9IjEuNTMxIiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxMy45OTQiIGN5PSIzMi40MjkiIHI9IjEuMzMwIiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxNS4wODMiIGN5PSIzMS45NjgiIHI9IjEuMjg2IiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxNS4yMTEiIGN5PSIzMS44NTMiIHI9IjEuMjgwIiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxMy43NzMiIGN5PSIzMi4wOTgiIHI9IjEuNDgzIiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxMy44NTUiIGN5PSIzMi4xNzMiIHI9IjEuNDQ3IiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxMy45NzgiIGN5PSIzMi4zMjUiIHI9IjEuMzc0IiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxNC40NzQiIGN5PSIzMS44NTkiIHI9IjEuNDgyIiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxNC44NjUiIGN5PSIzMS42NjIiIHI9IjEuNDQzIiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxNC4wNDMiIGN5PSIzMS44NzkiIHI9IjEuNTUwIiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxNC45NzMiIGN5PSIzMi4wMTciIHI9IjEuMzAyIiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxMy42MDYiIGN5PSIzMS42NDgiIHI9IjEuNjc4IiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxNC4yODEiIGN5PSIzMS43MjgiIHI9IjEuNTcxIiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxNC4xNDEiIGN5PSIzMS45NjQiIHI9IjEuNTAzIiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxNC4wMjEiIGN5PSIzMi40MzUiIHI9IjEuMzI1IiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT48Y2lyY2xlIGN4PSIxMy41NjQiIGN5PSIzMi4xNzQiIHI9IjEuNDU1IiBmaWxsPSIjRDRBMDE3Ij48L2NpcmNsZT4KICA8L2c+Cjwvc3ZnPg=="
          alt="DraftMap" />
        <div class="dm-wordmark">DraftMap</div>
      </div>
      <div class="dm-beta-pill">LIVE BETA · 2026</div>
    </header>

    <div class="controls">
      <div class="button-group">
        <button class="btn active" data-view="all">All Positions</button>
        <button class="btn" data-view="offense">Offense</button>
        <button class="btn" data-view="defense">Defense</button>
      </div>
      <div class="year-label">2026 Draft Class</div>
      <button id="live-draft-btn" class="live-draft-btn" title="Grey out drafted players">
        <span class="live-dot-indicator"></span>
        Live Draft
      </button>
      <div class="chart-hint">Scroll or pinch to zoom &nbsp;·&nbsp; drag to pan &nbsp;·&nbsp; click a dot to open player details (double-tap on mobile)</div>
    </div>

    <div class="chart-wrapper">
      <div id="players-legend" class="players-legend">
        <div class="players-legend-title">Player Legend</div>
        <div class="players-legend-row">
          <div class="legend-dot"></div>
          <div class="legend-lines">
            <div class="legend-line-1">Player Name</div>
            <div class="legend-line-2">Round &nbsp;·&nbsp; Pick</div>
            <div class="legend-line-2">Height &nbsp;·&nbsp; Weight</div>
            <div class="legend-line-3">• Primary Strength</div>
            <div class="legend-line-3">• Secondary Strength</div>
            <div class="legend-line-3">• Supporting Strength</div>
          </div>
        </div>
      </div>

      <div id="zoom-viewport" class="zoom-viewport">
        <div id="zoom-stage" class="zoom-stage">
          <svg id="chart"></svg>
        </div>
      </div>

      <div class="zoom-control" id="zoom-widget">
        <button class="zoom-btn" id="zoom-in-btn" title="Zoom in">+</button>
        <div class="zoom-track" title="Zoom level">
          <div class="zoom-seg" data-level="4" title="Closest"></div>
          <div class="zoom-seg" data-level="3" title="Close"></div>
          <div class="zoom-seg active" data-level="2" title="Normal"></div>
          <div class="zoom-seg" data-level="1" title="Far"></div>
          <div class="zoom-seg" data-level="0" title="Farthest"></div>
        </div>
        <button class="zoom-btn" id="zoom-out-btn" title="Zoom out">−</button>
      </div>
    </div>

    <footer class="dm-footer">
      <div class="dm-foot-caption">See the draft. Don't just read about it.</div>
      <div class="dm-foot-meta">DRAFTMAP · 2026</div>
    </footer>
  </div>

  <div id="tooltip" class="tooltip" style="display:none;"></div>

  <!-- ── Player Card Modal ─────────────────────────────────────────────── -->
  <div id="pcm-bd">
    <div id="pcm-wrap">
      <button id="pcm-close" aria-label="Close player card">&#x2715;</button>

      <!-- Header -->
      <div style="position:relative; padding: 4px 2px 0;">
        <div class="pcm-card-id" id="pcmCardId"></div>
        <!-- Draft result badge: shown when player has been picked -->
        <div id="pcmDraftResult">
          <div class="pcm-draft-badge-label">Drafted</div>
          <table class="pcm-draft-table">
            <tr><td>Team</td><td id="pcmTeamDrafted">—</td></tr>
            <tr><td>Round</td><td id="pcmRdDrafted">—</td></tr>
            <tr><td>Pick</td><td id="pcmPickDrafted">—</td></tr>
          </table>
        </div>
        <div style="text-align:center; margin: 2px 48px 8px;">
          <h1 class="pcm-player-name" id="pcmPlayerName"></h1>
        </div>
        <div class="pcm-identity-line">
          <span id="pcmPos"></span>
          <span class="pcm-meta-divider"></span>
          <span id="pcmSchool"></span>
        </div>
      </div>

      <!-- Player Profile -->
      <div class="pcm-section-band">Player Profile</div>
      <div class="pcm-section-block">
        <div class="pcm-profile-rail">
          <div>
            <div class="pcm-profile-label">Role</div>
            <div class="pcm-role-pennant" id="pcmRole"></div>
          </div>
          <div class="pcm-strengths-panel">
            <div class="pcm-profile-label">Strengths Profile</div>
            <div class="pcm-strength-stack">
              <div class="pcm-strength-row">
                <div class="pcm-pennant-tail">
                  <div class="pcm-tail-strip upper"></div>
                  <div class="pcm-tail-strip lower"></div>
                </div>
                <div class="pcm-pennant-flag">
                  <div class="pcm-pennant-kicker">Primary</div>
                  <span class="pcm-pennant-text" id="pcmS1"></span>
                </div>
              </div>
              <div class="pcm-strength-row pcm-s-secondary">
                <div class="pcm-pennant-tail">
                  <div class="pcm-tail-strip upper"></div>
                  <div class="pcm-tail-strip lower"></div>
                </div>
                <div class="pcm-pennant-flag">
                  <div class="pcm-pennant-kicker">Secondary</div>
                  <span class="pcm-pennant-text" id="pcmS2"></span>
                </div>
              </div>
              <div class="pcm-strength-row pcm-s-supportive">
                <div class="pcm-pennant-tail">
                  <div class="pcm-tail-strip upper"></div>
                  <div class="pcm-tail-strip lower"></div>
                </div>
                <div class="pcm-pennant-flag">
                  <div class="pcm-pennant-kicker">Supportive</div>
                  <span class="pcm-pennant-text" id="pcmS3"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Size & Length -->
      <div class="pcm-section-band">Size &amp; Length</div>
      <div class="pcm-section-block">
        <div class="pcm-metric-table">
          <div class="pcm-metric-head">
            <div>Metric</div>
            <div>Value</div>
            <div>
              <div style="text-align:center;">Range Profile</div>
              <div class="pcm-metric-legend">
                <span class="pcm-legend-zone"><span class="pcm-legend-swatch below"></span>Avg/Below</span>
                <span class="pcm-legend-zone"><span class="pcm-legend-swatch good"></span>Good</span>
                <span class="pcm-legend-zone"><span class="pcm-legend-swatch great"></span>Great</span>
                <span class="pcm-legend-peer"><span class="pcm-legend-peer-dot"></span><span class="pcm-peer-label"></span></span>
              </div>
            </div>
            <div>Better</div>
            <div>Context</div>
          </div>
          <div id="pcmGroupSizeLength"></div>
        </div>
      </div>

      <!-- Athletic Profile -->
      <div class="pcm-section-band">Athletic Profile</div>
      <div class="pcm-section-block">
        <div class="pcm-metric-table">
          <div class="pcm-metric-head">
            <div>Metric</div>
            <div>Value</div>
            <div>
              <div style="text-align:center;">Range Profile</div>
              <div class="pcm-metric-legend">
                <span class="pcm-legend-zone"><span class="pcm-legend-swatch below"></span>Avg/Below</span>
                <span class="pcm-legend-zone"><span class="pcm-legend-swatch good"></span>Good</span>
                <span class="pcm-legend-zone"><span class="pcm-legend-swatch great"></span>Great</span>
                <span class="pcm-legend-peer"><span class="pcm-legend-peer-dot"></span><span class="pcm-peer-label"></span></span>
              </div>
            </div>
            <div>Better</div>
            <div>Context</div>
          </div>
          <div id="pcmGroupExplosion"><h3 class="pcm-metric-subtitle">Speed &amp; Explosion</h3></div>
          <div id="pcmGroupAgility"><h3 class="pcm-metric-subtitle">Agility</h3></div>
          <div id="pcmGroupStrength"><h3 class="pcm-metric-subtitle">Strength</h3></div>
        </div>
      </div>
    </div><!-- /pcm-wrap -->
  </div><!-- /pcm-bd -->

`;
