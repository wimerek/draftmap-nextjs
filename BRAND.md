# DraftMap Brand Specification

Locked as of 2026-05-09. Do not deviate from these values without a deliberate decision.

---

## Primary Lockup (Sidebar Header)

The primary brand lockup consists of the mark, wordmark, and tagline arranged horizontally.

| Element | Spec |
|---|---|
| Mark | `draftmap-mark.svg` — 72 × 72px (sidebar), 34 × 34px (collapsed), border-radius 5px |
| Wordmark | "DraftMap" — Barlow Condensed Black 900, 30px, letter-spacing 0.01em, color #F5F0E8 |
| Tagline | "NFL Draft at a glance." — Inter 400 italic, 10px, color rgba(245,240,232,0.48) |
| Gap (mark → text) | 12px |
| Gap (wordmark → tagline) | 2px |
| Container background | #0B2239 (dark navy) |
| Container bottom border | 2px solid #D4A017 (gold) |

**The wordmark is always mixed case: "DraftMap". Never ALL-CAPS, never all lowercase.**

---

## Lockup Export File

`public/brand/draftmap-lockup.svg` — standalone SVG, 420 × 104px.
Open in a browser and screenshot for PNG export. Mark is embedded inline; uses Barlow Condensed + Inter via Google Fonts.

---

## Collapsed State (Sidebar Icon-Only)

| Element | Spec |
|---|---|
| Mark | `draftmap-mark.svg` — 34 × 34px, border-radius 5px |
| Wordmark | Hidden |
| Tagline | Hidden |

---

## Color System

| Token | Hex | Usage |
|---|---|---|
| Navy | #0B2239 | Brand background, position column headers, sidebar |
| Gold | #D4A017 | Active states, underlines, interactive accents, connector lines, tier pills |
| Parchment | #F5F0E8 | Primary text on dark backgrounds |
| Near-white | #F7F9FA | Chart area background |

---

## Typography

| Usage | Font | Weight | Size |
|---|---|---|---|
| Wordmark | Barlow Condensed | 900 | 30px |
| Position headers | Oswald | 700 | 17px |
| Round labels (R1–R7) | Oswald | 700 | 14px |
| DEFENSE / OFFENSE labels | Oswald | 700 | 8px |
| UI labels | Inter | 800 | 10px |
| Body / hints | Inter | 400–600 | 9–12px |

---

## Mark Description

The DraftMap mark is a coordinate grid (scatter plot reference) on a dark navy background with gold dots representing draft prospects. It is the visual embodiment of the product's core concept — the draft as a data visualization.

**Source files:**
- `public/brand/draftmap-mark.svg` — vector, use for all screen rendering
- `public/brand/draftmap-mark-400.png` — raster fallback at 400px
- `public/brand/draftmap-lockup.svg` — full horizontal lockup (mark + wordmark + tagline)

Do not recolor, crop, or modify the mark. If a new size is needed, scale the SVG.
