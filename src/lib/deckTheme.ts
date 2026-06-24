import type { CSSProperties } from 'react'
import type { DeckColors } from './deckColors'

function rgba(r: number, g: number, b: number, a: number): string {
  return `rgba(${r},${g},${b},${a})`
}

/**
 * Monochrome panel — white/gray with a subtle red accent when the deck is red.
 */
export function deckPanelStyle(colors: DeckColors): CSSProperties {
  const hasRed = colors.primary === 'red' || colors.secondary === 'red'
  const redGlow = hasRed ? 0.1 : 0.05

  const bg = [
    `radial-gradient(120% 90% at 10% 12%, ${rgba(212, 0, 0, redGlow)} 0%, transparent 55%)`,
    `radial-gradient(100% 85% at 92% 88%, ${rgba(0, 0, 0, 0.04)} 0%, transparent 52%)`,
    `linear-gradient(168deg, #fafafa 0%, #f4f4f4 42%, #ebebeb 100%)`,
  ].join(', ')

  return { background: bg }
}
