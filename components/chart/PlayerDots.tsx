"use client";
/**
 * components/chart/PlayerDots.tsx
 *
 * Session E:
 *   - zoomLevel removed; fixed dot radius (6px) and stroke width.
 *   - School colors preserved as primary fill.
 *   - Single-click callback (no double-tap logic; handled in DraftChart).
 */
import type { Player } from "@/lib/airtable";
import type { DotPosition } from "@/lib/chartMath";
import { SCHOOL_COLORS } from "@/lib/chartConstants";

interface Props {
  dotPositions: DotPosition[];
  liveMode: boolean;
  onDotClick: (player: Player) => void;
  onDotHover: (player: Player, clientX: number, clientY: number) => void;
  onDotLeave: () => void;
}

const DOT_RADIUS = 6;
const DOT_STROKE_WIDTH = "1.5";

export default function PlayerDots({
  dotPositions, liveMode,
  onDotClick, onDotHover, onDotLeave,
}: Props) {
  return (
    <g>
      {dotPositions.map(({ player, x, y }, i) => {
        const sc       = SCHOOL_COLORS[player.school ?? ""] ?? { fill: "#9CA3AF", stroke: "#6B7280" };
        const isDrafted = liveMode && player.drafted;
        const fill     = isDrafted ? "rgba(210,200,185,0.35)" : sc.fill;
        const stroke   = isDrafted ? "rgba(160,150,135,0.45)" : "#4A4A4A";

        return (
          <circle
            key={`${player.id}-${i}`}
            cx={x} cy={y}
            r={DOT_RADIUS}
            fill={fill}
            stroke={stroke}
            strokeWidth={DOT_STROKE_WIDTH}
            style={{ cursor: "pointer" }}
            onClick={e => {
              e.stopPropagation();
              onDotClick(player);
            }}
            onMouseEnter={e => onDotHover(player, e.clientX, e.clientY)}
            onMouseLeave={onDotLeave}
          />
        );
      })}
    </g>
  );
}
