import type { DeckColor, DeckColors } from './deckColors'

const WORD: Record<string, DeckColor> = {
  red: 'red',
  black: 'black',
  yellow: 'yellow',
  blue: 'blue',
  green: 'green',
  purple: 'purple',
}

/**
 * Maps OPTCG API `card_color` (e.g. "Red", "Red / Blue") to deck panel colors.
 */
export function apiCardColorToDeckColors(raw: string): DeckColors {
  const normalized = raw
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  const parts = normalized
    .split(/\s*[/&]\s*/)
    .map((s) => s.trim())
    .filter(Boolean)

  const mapWord = (w: string): DeckColor | null => WORD[w] ?? null

  if (parts.length >= 2) {
    const a = mapWord(parts[0])
    const b = mapWord(parts[1])
    if (a && b && a !== b) return { primary: a, secondary: b }
    if (a && b && a === b) return { primary: a }
  }
  const one = mapWord(parts[0] ?? normalized)
  if (one) return { primary: one }
  return { primary: 'red' }
}
