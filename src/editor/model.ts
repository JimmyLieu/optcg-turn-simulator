import type { MatchupCurve } from '../types/curve'

/** One line in the editor — OPTCG `card_set_id` (e.g. OP01-001). */
export type EditorCardSlot = {
  id: string
}

export type EditorSide = {
  cards: EditorCardSlot[]
  callout: string
}

export type EditorTurn = {
  first: EditorSide
  second: EditorSide
}

export type EditorMatchup = {
  title: string
  firstDeck: MatchupCurve['firstDeck']
  secondDeck: MatchupCurve['secondDeck']
  turns: EditorTurn[]
}

export function emptySide(): EditorSide {
  return { cards: [], callout: '' }
}

export function emptyTurn(): EditorTurn {
  return { first: emptySide(), second: emptySide() }
}

export function createNewMatchup(): EditorMatchup {
  return {
    title: 'New matchup',
    firstDeck: {
      name: 'Deck A',
      subtitle: 'Goes first',
      colors: { primary: 'red', secondary: 'blue' },
    },
    secondDeck: {
      name: 'Deck B',
      subtitle: 'Goes second',
      colors: { primary: 'blue', secondary: 'yellow' },
    },
    turns: [emptyTurn()],
  }
}
