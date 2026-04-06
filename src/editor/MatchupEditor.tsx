import type { MatchupCurve } from '../types/curve'
import {
  DECK_COLORS,
  DECK_DUAL_PAIRS,
  encodeDeckColorSelect,
  parseDeckColorSelect,
} from '../lib/deckColors'
import { type EditorMatchup, type EditorTurn, emptyTurn } from './model'

type Props = {
  value: EditorMatchup
  onChange: (next: EditorMatchup) => void
}

export function MatchupEditor({ value, onChange }: Props) {
  const setTitle = (title: string) => onChange({ ...value, title })

  const setDeck = (
    which: 'firstDeck' | 'secondDeck',
    patch: Partial<MatchupCurve['firstDeck']>,
  ) => onChange({ ...value, [which]: { ...value[which], ...patch } })

  const setTurn = (index: number, turn: EditorTurn) => {
    const turns = value.turns.slice()
    turns[index] = turn
    onChange({ ...value, turns })
  }

  const addTurn = () => onChange({ ...value, turns: [...value.turns, emptyTurn()] })

  const removeTurn = (index: number) => {
    if (value.turns.length <= 1) return
    const turns = value.turns.filter((_, i) => i !== index)
    onChange({ ...value, turns })
  }

  return (
    <div className="mu-editor">
      <div className="mu-editor__section">
        <label className="mu-editor__label" htmlFor="mu-title">
          Matchup title
        </label>
        <input
          id="mu-title"
          className="mu-editor__input mu-editor__input--wide"
          type="text"
          value={value.title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Regionals finals"
        />
      </div>

      <div className="mu-editor__decks">
        <DeckForm
          label="First player"
          deck={value.firstDeck}
          onChange={(patch) => setDeck('firstDeck', patch)}
        />
        <DeckForm
          label="Second player"
          deck={value.secondDeck}
          onChange={(patch) => setDeck('secondDeck', patch)}
        />
      </div>

      <div className="mu-editor__section">
        <h2 className="mu-editor__h">Turns</h2>
        <p className="mu-editor__hint">
          Add card IDs in order (e.g. <code>OP01-001</code>, <code>ST07-002</code>). Multiple cards in
          a row become a sequence with arrows in the preview.
        </p>

        <ol className="mu-editor__turns">
          {value.turns.map((turn, ti) => (
            <li key={ti} className="mu-editor__turn">
              <div className="mu-editor__turn-head">
                <span className="mu-editor__turn-badge">Turn {ti + 1}</span>
                <button
                  type="button"
                  className="mu-editor__btn mu-editor__btn--danger"
                  disabled={value.turns.length <= 1}
                  onClick={() => removeTurn(ti)}
                >
                  Remove turn
                </button>
              </div>

              <div className="mu-editor__turn-grid">
                <SideEditor
                  label="First player"
                  side={turn.first}
                  onChange={(first) => setTurn(ti, { ...turn, first })}
                />
                <SideEditor
                  label="Second player"
                  side={turn.second}
                  onChange={(second) => setTurn(ti, { ...turn, second })}
                />
              </div>
            </li>
          ))}
        </ol>

        <button type="button" className="mu-editor__btn mu-editor__btn--primary" onClick={addTurn}>
          Add turn
        </button>
      </div>
    </div>
  )
}

function DeckForm({
  label,
  deck,
  onChange,
}: {
  label: string
  deck: MatchupCurve['firstDeck']
  onChange: (patch: Partial<MatchupCurve['firstDeck']>) => void
}) {
  return (
    <fieldset className="mu-editor__deck">
      <legend>{label}</legend>
      <label className="mu-editor__label">
        Deck name
        <input
          className="mu-editor__input"
          type="text"
          value={deck.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </label>
      <label className="mu-editor__label">
        Subtitle
        <input
          className="mu-editor__input"
          type="text"
          value={deck.subtitle}
          onChange={(e) => onChange({ subtitle: e.target.value })}
          placeholder="e.g. Goes first"
        />
      </label>
      <label className="mu-editor__label">
        Colors
        <select
          className="mu-editor__select"
          value={encodeDeckColorSelect(deck.colors)}
          onChange={(e) => onChange({ colors: parseDeckColorSelect(e.target.value) })}
        >
          <optgroup label="Single color">
            {DECK_COLORS.map((c) => (
              <option key={`mono:${c}`} value={`mono:${c}`}>
                {capitalize(c)}
              </option>
            ))}
          </optgroup>
          <optgroup label="Two-color">
            {DECK_DUAL_PAIRS.map(([a, b]) => {
              const value = `dual:${a}-${b}`
              return (
                <option key={value} value={value}>
                  {capitalize(a)} / {capitalize(b)}
                </option>
              )
            })}
          </optgroup>
        </select>
      </label>
    </fieldset>
  )
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function SideEditor({
  label,
  side,
  onChange,
}: {
  label: string
  side: EditorTurn['first']
  onChange: (next: EditorTurn['first']) => void
}) {
  const addCard = () =>
    onChange({ ...side, cards: [...side.cards, { id: '' }] })

  const setCardId = (index: number, id: string) => {
    const cards = side.cards.slice()
    cards[index] = { id }
    onChange({ ...side, cards })
  }

  const removeCard = (index: number) => {
    const cards = side.cards.filter((_, i) => i !== index)
    onChange({ ...side, cards })
  }

  return (
    <div className="mu-editor__side">
      <h3 className="mu-editor__side-title">{label}</h3>
      <div className="mu-editor__cards">
        {side.cards.length === 0 ? (
          <p className="mu-editor__empty-cards">No cards — add at least one for the preview.</p>
        ) : null}
        {side.cards.map((slot, ci) => (
          <div key={ci} className="mu-editor__card-row">
            <input
              className="mu-editor__input"
              type="text"
              value={slot.id}
              onChange={(e) => setCardId(ci, e.target.value)}
              placeholder="OP01-001"
              autoCapitalize="characters"
              spellCheck={false}
            />
            <button
              type="button"
              className="mu-editor__btn"
              onClick={() => removeCard(ci)}
              aria-label="Remove card"
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" className="mu-editor__btn" onClick={addCard}>
          + Card
        </button>
      </div>
      <label className="mu-editor__label">
        Callout (optional)
        <input
          className="mu-editor__input"
          type="text"
          value={side.callout}
          onChange={(e) => onChange({ ...side, callout: e.target.value })}
          placeholder="e.g. All Don!! Attack"
        />
      </label>
    </div>
  )
}
