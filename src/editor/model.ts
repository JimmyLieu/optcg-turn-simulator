import type { MatchupCurve } from '../types/curve'

/** One line in the editor — OPTCG `card_set_id` (e.g. OP01-001). */
export type EditorCardSlot = {
  id: string
}

/** How 2+ cards combine in the preview (single-card ignores this). */
export type EditorSideJoin = 'seq' | 'or' | 'and'

export type EditorSide = {
  cards: EditorCardSlot[]
  callout: string
  /** One join per gap between consecutive cards. Length = cards.length - 1. */
  joins: EditorSideJoin[]
}

export type EditorTurn = {
  first: EditorSide
  second: EditorSide
}

/** Which deck (left or right in the form) takes the first turn in the game. */
export type GoingFirst = 'firstDeck' | 'secondDeck'

export type EditorMatchup = {
  title: string
  firstDeck: MatchupCurve['firstDeck']
  secondDeck: MatchupCurve['secondDeck']
  goingFirst: GoingFirst
  turns: EditorTurn[]
}

export function emptySide(): EditorSide {
  return { cards: [], callout: '', joins: [] }
}

export function sideWithCardAdded(side: EditorSide): EditorSide {
  const cards = [...side.cards, { id: '' }]
  const joins = [...side.joins]
  if (cards.length >= 2) joins.push('seq')
  return { ...side, cards, joins }
}

export function sideWithCardRemoved(side: EditorSide, index: number): EditorSide {
  const cards = side.cards.filter((_, i) => i !== index)
  const joins = side.joins.slice()
  if (joins.length > 0) {
    joins.splice(index === 0 ? 0 : index - 1, 1)
  }
  return { ...side, cards, joins: joins.slice(0, Math.max(0, cards.length - 1)) }
}

export function emptyTurn(): EditorTurn {
  return { first: emptySide(), second: emptySide() }
}

export function createNewMatchup(): EditorMatchup {
  return {
    title: 'New matchup',
    firstDeck: {
      leaderCardId: '',
      name: 'Left deck',
      subtitle: '',
      colors: { primary: 'red' },
    },
    secondDeck: {
      leaderCardId: '',
      name: 'Right deck',
      subtitle: '',
      colors: { primary: 'blue' },
    },
    goingFirst: 'firstDeck',
    turns: [emptyTurn()],
  }
}
