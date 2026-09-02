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

export type PlayLineItem = {
  card: CardRef
  /** How this card follows the previous one in a horizontal log. */
  via?: 'and' | 'effect' | 'or' | 'seq'
}

export type ActionLine = {
  text: string
  kind?: 'effect' | 'sub' | 'combat' | 'ko' | 'damage' | 'concede' | 'note'
  /** Combat result label, e.g. "+1 damage" or "K.O." */
  outcome?: string
}

export type TurnSide = {
  /** Recommended line for this turn */
  play: PlayExpr
  /** Flat play order for the combat-log layout */
  playLine?: PlayLineItem[]
  /** Optional banner (e.g. mechanic reminder) */
  callout?: string
  don?: number
  actions?: ActionLine[]
}

export type TurnRow = {
  turn: number
  firstLife?: number
  secondLife?: number
  firstPlayer: TurnSide
  secondPlayer: TurnSide
}

export type MatchupCurve = {
  title: string
  summary?: string
  firstDeck: {
    name: string
    subtitle: string
    colors: DeckColors
    /** English card_set_id for the leader, when set from the editor */
    leaderCardId?: string
  }
  secondDeck: {
    name: string
    subtitle: string
    colors: DeckColors
    leaderCardId?: string
  }
  turns: TurnRow[]
}
