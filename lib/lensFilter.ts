/**
 * lib/lensFilter.ts
 *
 * THE single scope-filter predicate — lifted out of PlayerDots (Epsilon 4 brief f).
 *
 * One definition, three consumers, no drift:
 *   - Acts 1/2 — PlayerDots ghosts non-matching dots (opacity 0.12).
 *   - Act 3   — Act3Field ghosts non-lit dots/threads + re-lights the lit ones
 *               (the lit-id set is derived from THIS predicate in DraftChart).
 *   - Scoreboard — the SAME lit set feeds computeScoreboardStats, so the slot can
 *               never contradict the chart beside it (7.0 lens contract).
 *
 * ⚠ SCOPE-ONLY (7.0): this is position / round / team / school / vs-consensus. It must
 * NEVER learn a display toggle (Hide Drafted, movement lines, dot size). `chartMode`
 * and `currentStepId` ride along ONLY as resolution context (which team/round field to
 * read per view-state) — they are not display filters. Keep it that way: the moment a
 * display toggle enters here it leaks into the scoreboard scope and the drift returns.
 *
 * vs-consensus (Filter Pane Brief 3) is a categorical scope dimension keyed on the
 * SHARED classifyDraftMove — the same classification the scoreboard strip + Act-2 hover
 * use, so the three touchpoints can never disagree. It is ACT-AWARE: the deviation is
 * undefined before the draft, so it scopes nothing in Act 1 (chartMode 'projection') —
 * the selection persists in state and re-applies on return to Act 2+.
 */

import type { Player } from "./sheets";
import type { ChartMode } from "./dataAvailability";
import { TEAM_COLORS } from "./chartConstants";
import { classifyDraftMove, type DraftMove } from "./scoreboardStats";

/**
 * Returns TRUE when `player` is filtered OUT of the active scope (no active scope in a
 * dimension = that dimension passes everyone). A lit/in-scope player is the negation.
 */
export function isPlayerFiltered(
  player: Player,
  positionFilter: string[],
  roundFilter: (number | "UDFA")[],
  teamFilter: string[],
  schoolFilter: string[],
  currentStepId: string | undefined,
  chartMode: ChartMode,
  consensusFilter: DraftMove[] = [],
  classMaxPick = 0,
): boolean {
  if (positionFilter.length > 0 && !positionFilter.includes(player.pos)) return true;

  if (schoolFilter.length > 0 && !schoolFilter.includes(player.school ?? "")) return true;

  if (roundFilter.length > 0) {
    const hasUDFA = roundFilter.includes("UDFA");
    const numericRounds = roundFilter.filter((r): r is number => r !== "UDFA");

    if (chartMode === "projection") {
      if (numericRounds.length > 0 && player.rd != null && !numericRounds.includes(player.rd as number)) return true;
    } else {
      const isUDFA = !player.rd_drafted;
      if (isUDFA) {
        if (!hasUDFA) return true;
      } else {
        if (numericRounds.length > 0) {
          if (!numericRounds.includes(player.rd_drafted as number)) return true;
        } else if (hasUDFA) {
          return true;
        }
      }
    }
  }

  if (teamFilter.length > 0) {
    let playerTeam: string | null = null;
    if (chartMode === "player-production" && currentStepId) {
      const entry = (player.stepScores ?? []).find(s => s.stepId === currentStepId);
      playerTeam = entry?.team ?? player.team_drafted ?? null;
    } else if (chartMode === "career") {
      const lastEntry = [...(player.stepScores ?? [])].reverse().find(s => s.team);
      playerTeam = lastEntry?.team ?? player.team_drafted ?? null;
    } else {
      playerTeam = player.team_drafted ?? null;
    }
    if (!playerTeam) return true;
    // Compare via TEAM_COLORS entry reference so "PIT" and "Pittsburgh Steelers"
    // are treated as the same team regardless of which format the data uses.
    const playerEntry = TEAM_COLORS[playerTeam] ?? TEAM_COLORS[playerTeam.toLowerCase()];
    const matches = teamFilter.some(t => {
      const filterEntry = TEAM_COLORS[t] ?? TEAM_COLORS[t.toLowerCase()];
      if (playerEntry && filterEntry) return playerEntry === filterEntry;
      return t === playerTeam;
    });
    if (!matches) return true;
  }

  // vs-consensus (Brief 3) — categorical scope on the SHARED classifyDraftMove. Inert in
  // Act 1 (chartMode 'projection'): the deviation is undefined before the draft, so the
  // selection scopes nothing there but stays remembered in state. Mirror the established
  // imputation EXACTLY (rank = p.rank ?? classMaxPick+1, UDFA → null) so a player's
  // REACH/STEAL designation matches his Act-2 hover + the scoreboard count. A UDFA player
  // classifies 'UNDRAFTED', never in the chip set, so any active selection scopes him out.
  if (consensusFilter.length > 0 && chartMode !== "projection") {
    const pick = player.pick_drafted;
    const isUDFA = !(pick != null && pick > 0);
    const move = classifyDraftMove(
      isUDFA ? null : (player.rank ?? classMaxPick + 1),
      isUDFA ? null : pick,
    );
    if (!consensusFilter.includes(move)) return true;
  }

  return false;
}
