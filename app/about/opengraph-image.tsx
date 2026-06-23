import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Brand hexes inlined (keep the edge runtime dependency-free — do not import
// from lib/act3Constants.ts). Tier thread colors, navy field, gold accent.
const NAVY = '#0B2239'
const GOLD = '#D4A017'
const PARCHMENT = '#F5F0E8'
const TIER_COLORS = ['#C8920A', '#1D3E63', '#6FA8D8', '#7A828D', '#99A1AA'] // Premium→None

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: NAVY,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          fontFamily: 'sans-serif',
          overflow: 'hidden',
        }}
      >
        {/* round → tier flow motif (top-right, subtle) */}
        <div
          style={{
            position: 'absolute',
            top: '54px',
            right: '70px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {TIER_COLORS.map((c, i) => (
            <div
              key={i}
              style={{
                height: '14px',
                width: `${260 - i * 38}px`,
                background: c,
                borderRadius: '7px',
                opacity: 0.92,
              }}
            />
          ))}
        </div>

        {/* hero stat */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 80px',
            paddingTop: '40px',
          }}
        >
          <div
            style={{
              color: GOLD,
              fontSize: '26px',
              fontWeight: 700,
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: '26px',
            }}
          >
            The league&rsquo;s own signal
          </div>
          <div
            style={{
              color: PARCHMENT,
              fontWeight: 'bold',
              fontSize: '68px',
              lineHeight: 1.12,
              maxWidth: '1000px',
            }}
          >
            Outside the first round, only about a third of drafted players ever get
            a real second contract.
          </div>
        </div>

        {/* footer bar */}
        <div
          style={{
            height: '84px',
            background: '#091a2c',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            padding: '0 80px',
            gap: '16px',
          }}
        >
          <span style={{ color: GOLD, fontWeight: 'bold', fontSize: '34px' }}>DraftMap</span>
          <span style={{ color: '#7e93a6', fontSize: '22px' }}>draftmap.app</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
