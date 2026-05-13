"use client";
/**
 * components/chart/PlayerLabels.tsx
 * Player name + round/rank + height/weight + strengths.
 * Only visible at zoomLevel >= 4 and only for non-drafted players in liveMode.
 * Labels alternate left/right by index to reduce overlap.
 */
import type { DotPosition } from "@/lib/chartMath";
import { inchesToHeightDisplay, scoutToInches } from "@/lib/chartMath";

interface Props {
  dotPositions: DotPosition[];
  zoomLevel: number;
  liveMode: boolean;
}

const STRENGTH_STYLES = [
  { fill: "#4F6F60", fontWeight: "700" },
  { fill: "#5E7A6C", fontWeight: "600" },
  { fill: "#6A8477", fontWeight: "500" },
];

export default function PlayerLabels({ dotPositions, zoomLevel, liveMode }: Props) {
  if (zoomLevel < 4) return <g />;

  const lineH = 11;
  // Track last labeled Y per (pos, rd, band-x) group to enforce minimum gap
  const lastLabeledY: Record<string, number> = {};
  const MIN_LABEL_GAP = 82;

  const labels: React.ReactNode[] = [];

  dotPositions.forEach(({ player, x, y }, idx) => {
    if (liveMode && player.drafted) return;

    // Grouping key to enforce label gap within the same column/band
    const key = `${player.pos}-${player.rd}-${Math.round(x)}`;
    const last = lastLabeledY[key] ?? -Infinity;
    if (y - last < MIN_LABEL_GAP) return;
    lastLabeledY[key] = y;

    const goRight = idx % 2 === 0;
    const lx      = goRight ? x + 8 : x - 8;
    const anchor  = goRight ? "start" : "end";
    const baseY   = y - lineH;

    const heightIn  = scoutToInches(player.height);
    const heightStr = inchesToHeightDisplay(heightIn);
    const strengths = [player.s1, player.s2, player.s3].filter((s): s is string => !!s && s !== "N/A");

    labels.push(
      <g key={`label-${player.player_id}-${idx}`} pointerEvents="none">
        <text x={lx} y={baseY} textAnchor={anchor} fontSize={9} fontWeight={600} fill="#1A2720">
          {player.name}
        </text>
        <text x={lx} y={baseY + lineH} textAnchor={anchor} fontSize={8} fill="#5A7868">
          R{player.rd} · #{player.rank}
        </text>
        <text x={lx} y={baseY + lineH * 2} textAnchor={anchor} fontSize={8} fill="#6B8577">
          {heightStr} · {player.weight} lbs
        </text>
        {strengths.map((s, si) => {
          const st = STRENGTH_STYLES[si] ?? STRENGTH_STYLES[2];
          return (
            <text key={si} x={lx} y={baseY + lineH * 3 + si * 9}
              textAnchor={anchor} fontSize={7.5}
              fill={st.fill} fontWeight={st.fontWeight}>
              • {s}
            </text>
          );
        })}
      </g>
    );
  });

  return <g>{labels}</g>;
}
