import type { CSSProperties } from 'react'
import type { DeckColor, DeckColors } from './deckColors'

const BAR: Record<DeckColor, string> = {
  red: '#7a1c22',
  black: '#2a2a2a',
  yellow: '#8a7314',
  blue: '#1d3d66',
  green: '#1f5c3a',
  purple: '#4a2d63',
}

export function leaderBarStyle(colors: DeckColors): CSSProperties {
  const a = BAR[colors.primary]
  const b = colors.secondary && colors.secondary !== colors.primary ? BAR[colors.secondary] : a
  return {
    background: a === b ? a : `linear-gradient(90deg, ${a} 0%, ${b} 100%)`,
    color: '#fff',
  }
}
