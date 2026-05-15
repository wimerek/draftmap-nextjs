import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const ROUND_COLORS = ['#34d399', '#a3e635', '#facc15', '#fb923c', '#f87171', '#c084fc', '#94a3b8']

// Larger, more spread "D" shape — centered right
const DOTS = [
  { x: 860,  y: 80,  r: 15, ci: 0 },
  { x: 920,  y: 110, r: 12, ci: 2 },
  { x: 970,  y: 145, r: 14, ci: 4 },
  { x: 1010, y: 190, r: 11, ci: 1 },
  { x: 1040, y: 245, r: 16, ci: 3 },
  { x: 1055, y: 305, r: 10, ci: 5 },
  { x: 1055, y: 365, r: 14, ci: 6 },
  { x: 1040, y: 420, r: 12, ci: 0 },
  { x: 1010, y: 468, r: 11, ci: 2 },
  { x: 968,  y: 505, r: 14, ci: 4 },
  { x: 915,  y: 528, r: 10, ci: 1 },
  { x: 858,  y: 536, r: 12, ci: 3 },
  { x: 798,  y: 520, r: 15, ci: 5 },
  { x: 760,  y: 488, r: 11, ci: 6 },
]

export default async function Image({ params }: { params: { year: string } }) {
  const { year } = params

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
        {/* Dot cluster */}
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
              background: ROUND_COLORS[d.ci],
              opacity: 0.6,
            }}
          />
        ))}

        {/* Content — left side */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 80px',
            paddingRight: '440px',
          }}
        >
          <div
            style={{
              color: 'white',
              fontWeight: 'bold',
              fontSize: '96px',
              lineHeight: 1.1,
              marginBottom: '24px',
            }}
          >
            {`${year} NFL Draft`}
          </div>
          <div style={{ color: '#94a3b8', fontSize: '36px' }}>
            Ranked. Visualized. Mapped.
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
