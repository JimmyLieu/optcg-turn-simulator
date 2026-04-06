/** One Piece TCG mana colors (English). */
export type DeckColor = 'red' | 'black' | 'yellow' | 'blue' | 'green' | 'purple'

export const DECK_COLORS: DeckColor[] = ['red', 'black', 'yellow', 'blue', 'green', 'purple']

/** Single color, or two different colors (order-free for display). */
export type DeckColors = {
  primary: DeckColor
  /** If set and different from `primary`, deck is treated as two-color. */
  secondary?: DeckColor
}

/** Sorted order for stable pair keys and CSS class names. */
const ORDER: DeckColor[] = ['black', 'blue', 'green', 'purple', 'red', 'yellow']

function sortedPair(a: DeckColor, b: DeckColor): [DeckColor, DeckColor] {
  const [x, y] = [a, b].sort(
    (p, q) => ORDER.indexOf(p) - ORDER.indexOf(q),
  ) as [DeckColor, DeckColor]
  return [x, y]
}

/** All unordered two-color pairs (for editor lists). */
export const DECK_DUAL_PAIRS: [DeckColor, DeckColor][] = (() => {
  const out: [DeckColor, DeckColor][] = []
  for (let i = 0; i < ORDER.length; i++) {
    for (let j = i + 1; j < ORDER.length; j++) {
      out.push([ORDER[i], ORDER[j]])
    }
  }
  return out
})()

function labelColor(c: DeckColor): string {
  return c.charAt(0).toUpperCase() + c.slice(1)
}

/** Single select value: `mono:red` or `dual:black-blue` (sorted). */
export function encodeDeckColorSelect(colors: DeckColors): string {
  if (!colors.secondary || colors.secondary === colors.primary) {
    return `mono:${colors.primary}`
  }
  const [a, b] = sortedPair(colors.primary, colors.secondary)
  return `dual:${a}-${b}`
}

export function parseDeckColorSelect(value: string): DeckColors {
  if (value.startsWith('mono:')) {
    const color = value.slice(5) as DeckColor
    return { primary: color }
  }
  if (value.startsWith('dual:')) {
    const pair = parseDualPairKey(value.slice(5))
    if (pair) return { primary: pair[0], secondary: pair[1] }
  }
  return { primary: 'red' }
}

/** Decode `black-blue`, `purple-red`, etc. (keys use ORDER + hyphen). */
function parseDualPairKey(key: string): [DeckColor, DeckColor] | null {
  for (let i = 0; i < ORDER.length; i++) {
    for (let j = i + 1; j < ORDER.length; j++) {
      const a = ORDER[i]
      const b = ORDER[j]
      if (`${a}-${b}` === key) return [a, b]
    }
  }
  return null
}

export function formatDeckColorLabel(colors: DeckColors): string {
  if (!colors.secondary || colors.secondary === colors.primary) {
    return labelColor(colors.primary)
  }
  const [a, b] = sortedPair(colors.primary, colors.secondary)
  return `${labelColor(a)} / ${labelColor(b)}`
}
