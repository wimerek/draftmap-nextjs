# DraftMap Brand Specification

Locked as of 2026-05-09. Do not deviate from these values without a deliberate decision.

---

## Primary Lockup (Sidebar Header)

The primary brand lockup consists of the mark, wordmark, and tagline arranged horizontally.

| Element | Spec |
|---|---|
| Mark | `draftmap-mark.svg` — 64 × 64px, border-radius 5px |
| Wordmark | "DRAFTMAP" — Oswald Bold 700, 22px, letter-spacing 0.03em, color #F5F0E8 |
| Tagline | "NFL Draft at a glance." — Inter 400 italic, 9px, color rgba(245,240,232,0.48) |
| Gap (mark → text) | 10px |
| Gap (wordmark → tagline) | 2px |
| Container background | #0B2239 (dark navy) |
| Container bottom border | 2px solid #D4A017 (gold) |

**The wordmark is always ALL-CAPS. Never sentence case, never mixed case.**

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
| Gold | #D4A017 | Active states, underlines, interactive accents, connector lines |
| Parchment | #F5F0E8 | Primary text on dark backgrounds |
| Near-white | #F7F9FA | Chart area background |

---

## Typography

| Usage | Font | Weight | Size |
|---|---|---|---|
| Wordmark | Oswald | 700 | 22px |
| Position headers | Oswald | 700 | 17px |
| Round labels (R1–R7) | Oswald | 700 | 11px |
| DEFENSE / OFFENSE labels | Oswald | 700 | 8px |
| UI labels | Inter | 800 | 10px |
| Body / hints | Inter | 400–600 | 9–12px |

---

## Mark Description

The DraftMap mark is a coordinate grid (scatter plot reference) on a dark navy background with gold dots representing draft prospects. It is the visual embodiment of the product's core concept — the draft as a data visualization.

**Source files:**
- `public/brand/draftmap-mark.svg` — vector, use for all screen rendering
- `public/brand/draftmap-mark-400.png` — raster fallback at 400px

Do not recolor, crop, or modify the mark. If a new size is needed, scale the SVG.
