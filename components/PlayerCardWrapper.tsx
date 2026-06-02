'use client'

import PlayerCard from '@/components/PlayerCard'
import type { Player } from '@/lib/sheets'

interface Props {
  player: Player
  players: Player[]
}

export default function PlayerCardWrapper({ player, players }: Props) {
  return (
    <div
      className="pcm-standalone-page"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: '100vh',
        padding: '32px 16px 64px',
        background: '#0B2239',
      }}
    >
      <PlayerCard
        player={player}
        players={players}
        onClose={() => {}}
        isMobile={false}
        currentStepId="career"
        standalone
      />
    </div>
  )
}
