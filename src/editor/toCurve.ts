import type { CardRef, MatchupCurve, PlayExpr } from '../types/curve'
import type { EditorMatchup, EditorSide, EditorSideJoin } from './model'

function cardExpr(card: CardRef): PlayExpr {
  return { t: 'card', card }
}

function combinePlay(left: PlayExpr, join: EditorSideJoin, right: PlayExpr): PlayExpr {
  if (join === 'or') {
    if (left.t === 'or') return { t: 'or', branches: [...left.branches, right] }
    return { t: 'or', branches: [left, right] }
  }
  if (join === 'and') {
    if (left.t === 'and') return { t: 'and', parts: [...left.parts, right] }
    return { t: 'and', parts: [left, right] }
  }
  if (left.t === 'seq') return { t: 'seq', steps: [...left.steps, right] }
  return { t: 'seq', steps: [left, right] }
}

function slotsToPlayExpr(cards: { id: string }[], joins: EditorSideJoin[] | undefined): PlayExpr {
  const refs: CardRef[] = cards
    .map((c) => c.id.trim())
    .filter(Boolean)
    .map((id) => ({ id }))

  if (refs.length === 0) return { t: 'empty' }
  if (refs.length === 1) return cardExpr(refs[0])

  let expr = cardExpr(refs[0])
  for (let i = 1; i < refs.length; i++) {
    const join = joins?.[i - 1] ?? 'seq'
    expr = combinePlay(expr, join, cardExpr(refs[i]))
  }
  return expr
}

function sideToTurn(side: EditorSide) {
  return {
    play: slotsToPlayExpr(side.cards, side.joins),
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
