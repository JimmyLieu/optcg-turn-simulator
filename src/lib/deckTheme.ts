import type { CSSProperties } from 'react'
import type { DeckColor, DeckColors } from './deckColors'

/** Display RGB tuned to match OPTCG identity colors on dark panels. */
const RGB: Record<DeckColor, [number, number, number]> = {
  red: [198, 46, 62],
  black: [44, 40, 52],
  yellow: [220, 172, 48],
  blue: [44, 112, 198],
  green: [52, 158, 98],
  purple: [132, 64, 178],
}

function rgba(rgb: [number, number, number], a: number): string {
  const [r, g, b] = rgb
  return `rgba(${r},${g},${b},${a})`
}

function mixTowardBlack(rgb: [number, number, number], amount: number): [number, number, number] {
  return [
    Math.round(rgb[0] * (1 - amount)),
    Math.round(rgb[1] * (1 - amount)),
    Math.round(rgb[2] * (1 - amount)),
  ]
}

/**
 * Panel background derived from leader / deck colors (matches API-mapped `DeckColors`).
 */
export function deckPanelStyle(colors: DeckColors): CSSProperties {
  const primary = RGB[colors.primary]
  const secondaryRaw =
    colors.secondary && colors.secondary !== colors.primary
      ? RGB[colors.secondary]
      : mixTowardBlack(primary, 0.42)

  const deep = [8, 10, 14] as [number, number, number]

  const bg = [
    `radial-gradient(125% 92% at 14% 20%, ${rgba(primary, 0.75)} 0%, transparent 58%)`,
    `radial-gradient(115% 88% at 86% 76%, ${rgba(secondaryRaw, 0.62)} 0%, transparent 54%)`,
    `linear-gradient(168deg, ${rgba(primary, 0.28)} 0%, ${rgba(deep, 1)} 38%, #030508 100%)`,
  ].join(', ')

  return { background: bg }
}
