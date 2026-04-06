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
  /** Used when there are 2+ cards. Default `seq` (vertical arrows). */
  multiJoin: EditorSideJoin
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
  return { cards: [], callout: '', multiJoin: 'seq' }
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
