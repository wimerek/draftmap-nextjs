"use client";
/**
 * components/chart/PlayerDots.tsx
 * Renders all player circles. Colored by school, sized by zoomLevel.
 * Live Draft mode fades drafted players to a ghost dot.
 * Delegates click/hover handling to DraftChart.tsx via callbacks.
 */
import type { Player } from "@/lib/airtable";
import type { DotPosition } from "@/lib/chartMath";
import { SCHOOL_COLORS } from "@/lib/chartConstants";

interface Props {
  dotPositions: DotPosition[];
  zoomLevel: number;
  liveMode: boolean;
  onDotClick: (player: Player, clientX: number, clientY: number) => void;
  onDotHover: (player: Player, clientX: number, clientY: number) => void;
  onDotLeave: () => void;
}

function dotRadius(zoomLevel: number): number {
  if (zoomLevel === 0) return 5.5;
  if (zoomLevel === 1) return 7;
  return 8.75;
}

function strokeWidth(zoomLevel: number): string {
  return zoomLevel <= 1 ? "1.5" : "2";
}

export default function PlayerDots({
  dotPositions, zoomLevel, liveMode,
  onDotClick, onDotHover, onDotLeave,
}: Props) {
  const r  = dotRadius(zoomLevel);
  const sw = strokeWidth(zoomLevel);

  return (
    <g>
      {dotPositions.map(({ player, x, y }, i) => {
        const sc         = SCHOOL_COLORS[player.school ?? ""] ?? { fill: "#9CA3AF", stroke: "#6B7280" };
        const isDrafted  = liveMode && player.drafted;
        const fill       = isDrafted ? "rgba(210,200,185,0.35)" : sc.fill;
        const stroke     = isDrafted ? "rgba(160,150,135,0.45)" : "#4A4A4A";

        return (
          <circle
            key={`${player.id}-${i}`}
            cx={x} cy={y} r={r}
            fill={fill}
            stroke={stroke}
            strokeWidth={sw}
            style={{ cursor: "pointer" }}
            onClick={e => {
              e.stopPropagation();
              onDotClick(player, e.clientX, e.clientY);
            }}
            onMouseEnter={e => onDotHover(player, e.clientX, e.clientY)}
            onMouseLeave={onDotLeave}
          />
        );
      })}
    </g>
  );
}
