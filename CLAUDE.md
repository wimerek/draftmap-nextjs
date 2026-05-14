# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

DraftMap is an NFL Draft prospect visualization tool. It renders an interactive SVG chart mapping prospects by position, round, and tier. The two core views are **Projected** (consensus rankings) and **Drafted** (actual pick results), with animated transitions between them.

## Commands

```bash
npm run dev      # local dev server
npm run build    # production build
npm run lint     # ESLint via next lint
```

No test runner is configured. Feature verification is manual via the browser.

## Environment

Copy `.env.local.example` to `.env.local` and set:
- `SHEETS_SPREADSHEET_ID` — the Google Sheets ID (required, no auth needed; sheet is public)

The Airtable vars in the example file are deprecated leftovers from Phase Alpha migration.

## Architecture

**Data flow (server-only):**
```
Google Sheets (public CSV) → lib/sheets.ts → /api/draft or /api/players route → client fetch()
```

API routes use ISR: 5-minute revalidation by default, 60 seconds when `?live=1` is set. The data layer (`lib/sheets.ts`) is the single source of truth for the `Player` type and CSV parsing — never call Sheets from client components.

**Chart rendering:**
```
lib/chartMath.ts (pure layout math, no D3) → DraftChart.tsx (SVG orchestrator) → chart/ sub-components
```

`computeChartLayout()` and `computeAllDotPositions()` produce all coordinates. Sub-components receive pre-computed positions as props and render pure SVG. D3 is imported only for scales (`d3-scale`), not for DOM manipulation or force simulation.

**View modes and animation:**
- State lives in `DraftChart.tsx` (`viewMode`, `progress`, `isAnimating`)
- `progress` (0–1) interpolates between projected and drafted dot positions
- Animation is driven by `requestAnimationFrame` with a ~550ms duration and staggered dot movement

## Key Files

| File | Role |
|------|------|
| `lib/sheets.ts` | Player type definition + Google Sheets CSV fetch/parse |
| `lib/chartMath.ts` | All coordinate layout math (column widths, Y scale, dot spread) |
| `lib/chartConstants.ts` | Position list, tier colors, role-to-band map, school colors |
| `components/DraftChart.tsx` | Main chart orchestrator — state, layout, event handling |
| `components/Sidebar.tsx` | Controls: view toggle, animation player, filters |
| `components/chart/PlayerDots.tsx` | SVG player dots, tooltips, movement connector lines |
| `app/api/draft/route.ts` | Draft data endpoint with ISR |

## Routing

- `/` redirects to `/draft` (see `next.config.mjs`)
- `/draft` redirects to `/draft/[CURRENT_DRAFT_YEAR]`
- `/draft/[year]` is statically generated for years 2024–2026
- `/players` and `/players/[slug]` are separate table/detail views

## Styling

No CSS-in-JS. Styles come from two sources:
1. **Tailwind** utility classes (`tailwind.config.ts` has custom `dm-*`, `tier-*`, `rd-*` color tokens)
2. **`styles/globals.css`** for layout primitives (`.dm-app-layout`, `.dm-chart-frame`, `.dm-tooltip`, `.pcm-*`, `.sb-*`)

School colors are injected into Player Card modals as CSS custom properties (`--school-bg`, `--school-fg`).

## Brand (locked 2026-05-09)

Do not alter brand assets or colors without explicit instruction. Canonical values:
- Navy `#0B2239`, Gold `#D4A017`, Parchment `#F5F0E8`
- Tier colors: Great `#B45309`, Good `#0E7490`, Solid `#475DA7`, Role `#6B7280`
- Fonts: Barlow Condensed (wordmark), Oswald (headers), Inter (UI)
- Logo: `public/brand/draftmap-mark.svg` — 72×72px in sidebar, 34×34px collapsed

## Positions

The chart columns, left to right: `EDGE · DT · LB · CB · S · RB · WR · TE · OT · IOL · QB`

Each position has up to three role lanes (top/mid/bot) defined in `lib/chartConstants.ts`. Dot X-positions spread within lanes to avoid overlap; lane boundaries are configurable per-position.

## Project Rules (Do Not Override Without Explicit Instruction)

### What's off the board
These features are explicitly NOT being built — do not scaffold, suggest, or reference them:
- Player Comparison / Measurables view
- Year-over-Year Accuracy view
- Mock Draft Partner Tool
- Admin page (Derek manages data directly in Google Sheets)

### Data integrity
Never generate, modify, or suggest edits to player data. All data lives in Google Sheets
and is managed exclusively by Derek. AI-assisted data entry is prohibited.

### Git commits
Do not commit to git automatically. Always stage changes and present a summary,
then wait for Derek to commit manually from his terminal.

### Testing
There is no local test runner. `npm run dev` requires a valid `.env.local` file with
SHEETS_SPREADSHEET_ID set. Production verification is via Vercel deploy at draftmap.app.

### Brand and locked values
Do not alter brand colors, fonts, tier colors, position order, or role lane definitions
without explicit instruction. These are locked. See the Brand section above.

### Phase priority (as of 2026-05-13)
Current phase order: Alpha (foundation) → Beta (mobile redesign) → Gamma (SEO, hard
deadline July 2026) → Delta (Draft Results View) → Epsilon (engagement) → Zeta (polish)
→ Eta (launch). Do not build ahead of the current phase without instruction.
