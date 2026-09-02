import type { CardRef, MatchupCurve, PlayExpr, PlayLineItem } from '../types/curve'
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

function toRef(c: { id: string; title?: string }): CardRef | null {
  const id = c.id.trim()
  if (!id) return null
  const title = c.title?.trim()
  return title ? { id, title } : { id }
}

function slotsToPlayExpr(
  cards: { id: string; title?: string }[],
  joins: EditorSideJoin[] | undefined,
): PlayExpr {
  const refs = cards.map(toRef).filter((c): c is CardRef => c !== null)

  if (refs.length === 0) return { t: 'empty' }
  if (refs.length === 1) return cardExpr(refs[0])

  let expr = cardExpr(refs[0])
  for (let i = 1; i < refs.length; i++) {
    const join = joins?.[i - 1] ?? 'seq'
    expr = combinePlay(expr, join, cardExpr(refs[i]))
  }
  return expr
}

function slotsToPlayLine(
  cards: { id: string; title?: string }[],
  joins: EditorSideJoin[] | undefined,
): PlayLineItem[] | undefined {
  const items: PlayLineItem[] = []
  cards.forEach((c, i) => {
    const ref = toRef(c)
    if (!ref) return
    items.push({
      card: ref,
      via: i === 0 ? undefined : (joins?.[i - 1] ?? 'seq'),
    })
  })
  return items.length ? items : undefined
}

function sideToTurn(side: EditorSide) {
  return {
    play: slotsToPlayExpr(side.cards, side.joins),
    playLine: slotsToPlayLine(side.cards, side.joins),
    callout: side.callout.trim() || undefined,
    don: side.don,
    hand: side.hand,
    actions: side.actions,
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
    summary: editor.summary,
    firstDeck: {
      ...firstDeck,
      subtitle: firstDeck.subtitle || 'Goes first',
    },
    secondDeck: {
      ...secondDeck,
      subtitle: secondDeck.subtitle || 'Goes second',
    },
    turns: editor.turns.map((row, i) => {
      const first = swap ? row.second : row.first
      const second = swap ? row.first : row.second
      return {
        turn: i + 1,
        firstLife: swap ? row.secondLife : row.firstLife,
        secondLife: swap ? row.firstLife : row.secondLife,
        firstPlayer: sideToTurn(first),
        secondPlayer: sideToTurn(second),
      }
    }),
  }
}
