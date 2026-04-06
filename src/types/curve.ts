import type { DeckColors } from '../lib/deckColors'

export type { DeckColor, DeckColors } from '../lib/deckColors'

/**
 * Card slot in the curve. `id` is the English `card_set_id` (e.g. OP01-001, ST01-012)
 * as used by https://optcgapi.com — images and names load from there unless overridden.
 */
export type CardRef = {
  id: string
  /** Caption under art; defaults to API card name */
  title?: string
  /** If set, skips the API and uses this image URL */
  imageUrl?: string
}

/**
 * Recursive play structure: sequences (arrows), forks, OR branches, AND bundles.
 */
export type PlayExpr =
  | { t: 'empty' }
  | { t: 'card'; card: CardRef }
  | { t: 'seq'; steps: PlayExpr[] }
  | { t: 'or'; branches: PlayExpr[] }
  | { t: 'and'; parts: PlayExpr[] }
  | { t: 'fork'; head: PlayExpr; tails: PlayExpr[] }

export type TurnSide = {
  /** Recommended line for this turn */
  play: PlayExpr
  /** Optional banner (e.g. mechanic reminder) */
  callout?: string
}

export type TurnRow = {
  turn: number
  firstPlayer: TurnSide
  secondPlayer: TurnSide
}

export type MatchupCurve = {
  title: string
  firstDeck: {
    name: string
    subtitle: string
    /** Red / Black / Yellow / Blue / Green — mono or two-color */
    colors: DeckColors
  }
  secondDeck: {
    name: string
    subtitle: string
    colors: DeckColors
  }
  turns: TurnRow[]
}
