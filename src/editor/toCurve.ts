import type { CardRef, MatchupCurve, PlayExpr } from '../types/curve'
import type { EditorMatchup } from './model'

function slotsToPlayExpr(cards: { id: string }[]): PlayExpr {
  const refs: CardRef[] = cards
    .map((c) => c.id.trim())
    .filter(Boolean)
    .map((id) => ({ id }))

  if (refs.length === 0) return { t: 'empty' }
  if (refs.length === 1) return { t: 'card', card: refs[0] }
  return {
    t: 'seq',
    steps: refs.map((card) => ({ t: 'card' as const, card })),
  }
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
        play: slotsToPlayExpr(row.first.cards),
        callout: row.first.callout.trim() || undefined,
      },
      secondPlayer: {
        play: slotsToPlayExpr(row.second.cards),
        callout: row.second.callout.trim() || undefined,
      },
    })),
  }
}
