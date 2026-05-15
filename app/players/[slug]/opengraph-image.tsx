import { ImageResponse } from 'next/og'
import { fetchPlayers, VALID_DRAFT_YEARS, type Player } from '@/lib/sheets'
import { buildSlugMap } from '@/lib/slugs'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const ROUND_COLORS: Record<number, string> = {
  1: '#34d399',
  2: '#a3e635',
  3: '#facc15',
  4: '#fb923c',
  5: '#f87171',
  6: '#c084fc',
  7: '#94a3b8',
}

const COLOR_LIST = Object.values(ROUND_COLORS)

function getRoundColor(rd: number | null): string {
  if (!rd) return '#94a3b8'
  return ROUND_COLORS[rd] ?? '#94a3b8'
}

// Loose "D" shape, right-side cluster
const DOTS = [
  { x: 985, y: 120, r: 12, ci: 0 },
  { x: 1015, y: 165, r: 9,  ci: 2 },
  { x: 1040, y: 215, r: 11, ci: 4 },
  { x: 1050, y: 270, r: 8,  ci: 1 },
  { x: 1045, y: 325, r: 13, ci: 3 },
  { x: 1025, y: 378, r: 9,  ci: 5 },
  { x: 998,  y: 422, r: 10, ci: 6 },
  { x: 962,  y: 458, r: 8,  ci: 0 },
  { x: 920,  y: 476, r: 11, ci: 2 },
  { x: 875,  y: 480, r: 9,  ci: 4 },
  { x: 838,  y: 462, r: 12, ci: 1 },
  { x: 858,  y: 148, r: 10, ci: 3 },
  { x: 898,  y: 115, r: 8,  ci: 5 },
  { x: 942,  y: 103, r: 11, ci: 6 },
]

async function lookupPlayer(slug: string): Promise<Player | null> {
  const all = await Promise.all(VALID_DRAFT_YEARS.map(y => fetchPlayers(y)))
  const allPlayers = all.flat()
  const slugMap = buildSlugMap(allPlayers)
  const byId = new Map(allPlayers.map(p => [p.player_id, p]))
  let found: Player | null = null
  slugMap.forEach((s, pid) => {
    if (s === slug && found === null) {
      found = byId.get(pid) ?? null
    }
  })
  return found
}

export default async function Image({ params }: { params: { slug: string } }) {
  const player = await lookupPlayer(params.slug)

  if (!player) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '1200px',
            height: '630px',
            background: '#0d1526',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ color: '#D4A017', fontSize: '72px', fontWeight: 'bold', fontFamily: 'sans-serif' }}>
            DraftMap
          </span>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  const displayRd = player.rd_drafted ?? player.rd
  const roundColor = getRoundColor(displayRd)
  const roundLabel = displayRd ? `ROUND ${displayRd}` : 'UNDRAFTED'
  const nameFontSize = player.name.length > 20 ? 64 : 80

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: '#0d1526',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          fontFamily: 'sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* Dot cluster — brand reference, not exact logo */}
        {DOTS.map((d, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${d.x - d.r}px`,
              top: `${d.y - d.r}px`,
              width: `${d.r * 2}px`,
              height: `${d.r * 2}px`,
              borderRadius: '50%',
              background: COLOR_LIST[d.ci],
              opacity: 0.6,
            }}
          />
        ))}

        {/* Content area — left side */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 80px',
            paddingRight: '340px',
          }}
        >
          {/* Round pill */}
          <div style={{ display: 'flex', marginBottom: '32px' }}>
            <div
              style={{
                background: roundColor,
                borderRadius: '20px',
                padding: '8px 20px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span style={{ color: '#0d1526', fontWeight: 'bold', fontSize: '24px' }}>
                {roundLabel}
              </span>
            </div>
          </div>

          {/* Player name */}
          <div
            style={{
              color: 'white',
              fontWeight: 'bold',
              fontSize: `${nameFontSize}px`,
              lineHeight: 1.1,
              marginBottom: '20px',
            }}
          >
            {player.name}
          </div>

          {/* Pos · School · Year */}
          <div style={{ color: '#94a3b8', fontSize: '32px', marginBottom: '16px' }}>
            {`${player.pos} · ${player.school ?? '—'} · ${player.draft_year} Draft`}
          </div>

          {/* Draft result or projected rank */}
          <div style={{ color: 'white', fontSize: '28px' }}>
            {player.drafted
              ? `${player.team_drafted} · Pick #${player.pick_drafted}`
              : `Projected Rank #${player.rank}`}
          </div>
        </div>

        {/* Separator line */}
        <div
          style={{
            position: 'absolute',
            bottom: '80px',
            left: 0,
            width: '1200px',
            height: '2px',
            background: '#1a2540',
          }}
        />

        {/* Bottom bar */}
        <div
          style={{
            height: '80px',
            background: '#111d33',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 80px',
            gap: '16px',
          }}
        >
          <span style={{ color: '#D4A017', fontWeight: 'bold', fontSize: '36px' }}>DraftMap</span>
          <span style={{ color: '#94a3b8', fontSize: '22px' }}>draftmap.app</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
