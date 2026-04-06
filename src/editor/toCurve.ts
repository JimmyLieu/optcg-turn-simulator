import type { CardRef, MatchupCurve, PlayExpr } from '../types/curve'
import type { EditorMatchup, EditorSideJoin } from './model'

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

export function editorToMatchupCurve(editor: EditorMatchup): MatchupCurve {
  const title = editor.title.trim() || 'Untitled matchup'

  return {
    title,
    firstDeck: editor.firstDeck,
    secondDeck: editor.secondDeck,
    turns: editor.turns.map((row, i) => ({
      turn: i + 1,
      firstPlayer: {
        play: slotsToPlayExpr(row.first.cards, row.first.multiJoin),
        callout: row.first.callout.trim() || undefined,
      },
      secondPlayer: {
        play: slotsToPlayExpr(row.second.cards, row.second.multiJoin),
        callout: row.second.callout.trim() || undefined,
      },
    })),
  }
}
