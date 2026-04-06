import type { CardRef, MatchupCurve, PlayExpr } from '../types/curve'
import type { EditorMatchup, EditorSide, EditorSideJoin } from './model'

function slotsToPlayExpr(
  cards: { id: string }[],
  multiJoin: EditorSideJoin | undefined,
): PlayExpr {
  const refs: CardRef[] = cards
    .map((c) => c.id.trim())
    .filter(Boolean)
    .map((id) => ({ id }))

  if (refs.length === 0) return { t: 'empty' }
  if (refs.length === 1) return { t: 'card', card: refs[0] }

  const join = multiJoin ?? 'seq'
  const cardExprs = refs.map((card) => ({ t: 'card' as const, card }))

  if (join === 'or') {
    return { t: 'or', branches: cardExprs }
  }
  if (join === 'and') {
    return { t: 'and', parts: cardExprs }
  }
  return { t: 'seq', steps: cardExprs }
}

function sideToTurn(side: EditorSide) {
  return {
    play: slotsToPlayExpr(side.cards, side.multiJoin),
    callout: side.callout.trim() || undefined,
  }
}

/**
 * Output curve is always in game order: firstDeck = goes first, secondDeck = goes second.
 */
export function editorToMatchupCurve(editor: EditorMatchup): MatchupCurve {
  const title = editor.title.trim() || 'Untitled matchup'

  const swap = editor.goingFirst === 'secondDeck'

  const slotFirst = editor.firstDeck
  const slotSecond = editor.secondDeck

  const firstDeck = swap ? slotSecond : slotFirst
  const secondDeck = swap ? slotFirst : slotSecond

  return {
    title,
    firstDeck: {
      ...firstDeck,
      subtitle: 'Goes first',
    },
    secondDeck: {
      ...secondDeck,
      subtitle: 'Goes second',
    },
    turns: editor.turns.map((row, i) => ({
      turn: i + 1,
      firstPlayer: sideToTurn(swap ? row.second : row.first),
      secondPlayer: sideToTurn(swap ? row.first : row.second),
    })),
  }
}
