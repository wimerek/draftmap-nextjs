"use client";
/**
 * components/TeamChip.tsx
 *
 * "Your team" chip + 32-team picker (Epsilon 4 brief f, item 2). Translates 3c 7.2.
 *
 * This is NOT a parallel filter. The chip, the picker, the sidebar ☆ row and the
 * sidebar checkboxes are all just WRITERS of the existing `teamFilter` (the shipped
 * item-1 lens does every bit of the rendering). The one new idea is identity
 * PERSISTENCE — a remembered team (`pinnedTeam`, localStorage, owned by DraftChart).
 *
 * Doctrine (locked, do not deviate):
 *   - "Clicks filter, pins remember." Tapping / browsing applies the session lens;
 *     only an explicit pin writes localStorage. Browse ≠ claim.
 *   - No auto-lens on load: a pinned team hydrates the chip "off"; one tap lights it.
 *   - One state, two surfaces: chip + sidebar both read pinnedTeam + teamFilter, so
 *     they can never disagree.
 *
 * Chip states:
 *   unpinned          →  ☆ MY TEAM ▾        (body or ▾ opens the picker)
 *   pinned, lens off  →  [SEA] Seahawks ▾   (body taps the team INTO teamFilter; ▾ = picker)
 *   pinned, lens on   →  lit styling         (body taps it OUT — others preserved)
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { resolveTeamColors, resolveTeamName, sameTeam } from "@/lib/chartConstants";
import { teamCodeFromFullName } from "@/lib/scoreboardStats";

export interface TeamChipProps {
  /** The saved identity (localStorage), or null when unclaimed. */
  pinnedTeam: string | null;
  /** The active team lens (session-only). */
  teamFilter: string[];
  /** Teams present in the loaded class — the picker grid + the toggle target. */
  availableTeams: string[];
  /** Toggle ONE team's membership in teamFilter (others preserved). The lens writer. */
  onToggleTeam: (team: string) => void;
  /** Claim / change / unclaim. Pass null to unpin. The ONLY pin writer. */
  onPinTeam: (team: string | null) => void;
  /** One-time soft invite pulse (DraftChart fires it once at first Act-3 rest). */
  pulse?: boolean;
}

/** Team nickname = the last word of the canonical full name ("Seattle Seahawks" → "Seahawks"). */
function nickname(team: string): string {
  const full = resolveTeamName(team);
  const parts = full.trim().split(/\s+/);
  return parts[parts.length - 1] || full;
}

export default function TeamChip({
  pinnedTeam,
  teamFilter,
  availableTeams,
  onToggleTeam,
  onPinTeam,
  pulse = false,
}: TeamChipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close the picker on outside click / ESC (standard popover behavior).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // The chip reflects the ACTIVE team, not just the pinned one (7.2 "chip and sidebar
  // always agree"). PIN WINS THE DISPLAY; otherwise a single-team lens shows. Multi-team
  // with no pin → null → the ☆ MY TEAM invitation.
  const shownTeam = pinnedTeam ?? (teamFilter.length === 1 ? teamFilter[0] : null);
  // Star = OWNERSHIP: gold ★ when the shown team is the pin (claimed), empty ☆ when a
  // team is merely lensed. Display-only — pin/change/remove stay in the ▾ picker.
  const isClaimed = shownTeam != null && sameTeam(shownTeam, pinnedTeam);
  // Lit when the shown team is in the active filter (alias-agnostic).
  const lensOn = shownTeam != null && teamFilter.some((t) => sameTeam(t, shownTeam));
  // The in-class string to toggle so the chip and the sidebar checkbox agree.
  const shownTarget = shownTeam
    ? (availableTeams.find((t) => sameTeam(t, shownTeam)) ?? shownTeam)
    : null;

  const togglePin = (team: string) => onPinTeam(sameTeam(team, pinnedTeam) ? null : team);

  const browse = (team: string) => { onToggleTeam(team); setOpen(false); };

  const pulseClass = pulse ? " dm-team-chip--pulse" : "";

  // ── The chip ────────────────────────────────────────────────────────────────
  let chip: ReactNode;
  if (!shownTeam) {
    // No active team — a single quiet invitation; body or caret opens the picker.
    chip = (
      <button
        type="button"
        className={`dm-team-chip dm-team-chip--empty${pulseClass}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Pin your team — one click, every visit"
      >
        <span className="dm-tc-star" aria-hidden="true">☆</span>
        <span className="dm-tc-label">MY TEAM</span>
        <span className="dm-tc-caret" aria-hidden="true">▾</span>
      </button>
    );
  } else {
    // A team is active (pinned, or a single-team lens). Pin wins the display.
    const colors = resolveTeamColors(shownTeam);
    const code = teamCodeFromFullName(resolveTeamName(shownTeam));
    chip = (
      <div className={`dm-team-chip dm-team-chip--pinned${lensOn ? " dm-team-chip--on" : ""}${pulseClass}`}>
        {/* Body = the lens toggle (distinct click zone). The star inside is display-
            only (no handler) — it signals ownership, not a third click zone. */}
        <button
          type="button"
          className="dm-tc-body"
          onClick={() => shownTarget && onToggleTeam(shownTarget)}
          aria-pressed={lensOn}
          title={lensOn ? `Hide ${nickname(shownTeam)}` : `Show only ${nickname(shownTeam)}`}
        >
          <span
            className={`dm-tc-star${isClaimed ? " dm-tc-star--claimed" : ""}`}
            aria-hidden="true"
          >{isClaimed ? "★" : "☆"}</span>
          <span
            className="dm-tc-code"
            style={{ background: colors.primary, color: colors.onPrimary }}
            aria-hidden="true"
          >{code}</span>
          <span className="dm-tc-label">{nickname(shownTeam)}</span>
        </button>
        {/* Caret = the picker (distinct click zone). */}
        <button
          type="button"
          className="dm-tc-caret-btn"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Change or remove your team"
        ><span className="dm-tc-caret" aria-hidden="true">▾</span></button>
      </div>
    );
  }

  // ── The picker ───────────────────────────────────────────────────────────────
  const picker = open && (
    <div className="dm-tc-picker" role="menu">
      <div className="dm-tc-pick-head">
        Tap a team to view · <span className="dm-tc-pin-glyph">☆</span> to make it yours
      </div>
      <div className="dm-tc-pick-grid">
        {availableTeams.map((team) => {
          const colors = resolveTeamColors(team);
          const code = teamCodeFromFullName(resolveTeamName(team));
          const isPinned = sameTeam(team, pinnedTeam);
          const isLit = teamFilter.some((t) => sameTeam(t, team));
          return (
            <div
              key={team}
              className={`dm-tc-pick-item${isLit ? " dm-tc-pick-item--lit" : ""}`}
            >
              <button
                type="button"
                className="dm-tc-pick-chip"
                style={{ background: colors.primary, color: colors.onPrimary }}
                onClick={() => browse(team)}
                title={`View ${resolveTeamName(team)}`}
              >{code}</button>
              <button
                type="button"
                className={`dm-tc-pin${isPinned ? " dm-tc-pin--active" : ""}`}
                onClick={() => togglePin(team)}
                aria-pressed={isPinned}
                title={isPinned ? "Remove your team" : "Make this your team"}
              >{isPinned ? "★" : "☆"}</button>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="dm-tc-root" ref={rootRef}>
      {chip}
      {picker}
    </div>
  );
}
