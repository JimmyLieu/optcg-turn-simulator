import type { CSSProperties } from 'react'
import type { DeckColor, DeckColors } from './deckColors'

/** Soft graphite deck bars — readable on cool gray glass. */
const BAR: Record<DeckColor, string> = {
  red: '#6f3034',
  black: '#2c2c2b',
  yellow: '#6f6430',
  blue: '#334860',
  green: '#355545',
  purple: '#4a4254',
}

export function leaderBarStyle(colors: DeckColors): CSSProperties {
  const a = BAR[colors.primary]
  const b = colors.secondary && colors.secondary !== colors.primary ? BAR[colors.secondary] : a
  return {
    background:
      a === b
        ? `linear-gradient(135deg, ${a}f0 0%, ${a} 100%)`
        : `linear-gradient(135deg, ${a}f0 0%, ${b} 100%)`,
    color: '#fff',
  }
}
