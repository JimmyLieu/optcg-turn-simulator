import type { MatchupCurve } from '../types/curve'
import {
  type EditorMatchup,
  type EditorSideJoin,
  type EditorTurn,
  type GoingFirst,
  emptyTurn,
} from './model'
import { CardPickField } from './CardPickField'
import { LeaderDeckField } from './LeaderDeckField'

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

  const setGoingFirst = (goingFirst: GoingFirst) => onChange({ ...value, goingFirst })

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

  const goingFirst = value.goingFirst ?? 'firstDeck'

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

      <div className="mu-editor__section mu-editor__section--turn-order">
        <label className="mu-editor__label" htmlFor="mu-going-first">
          Who goes first?
        </label>
        <select
          id="mu-going-first"
          className="mu-editor__select mu-editor__select--wide"
          value={goingFirst}
          onChange={(e) => setGoingFirst(e.target.value as GoingFirst)}
        >
          <option value="firstDeck">
            {value.firstDeck.name} (left)
          </option>
          <option value="secondDeck">
            {value.secondDeck.name} (right)
          </option>
        </select>
        <p className="mu-editor__hint">
          Preview and exported curve use game order: left column = first turn, right = second.
        </p>
      </div>

      <div className="mu-editor__decks">
        <LeaderDeckField
          label="Left deck"
          deck={value.firstDeck}
          onChange={(patch) => setDeck('firstDeck', patch)}
        />
        <LeaderDeckField
          label="Right deck"
          deck={value.secondDeck}
          onChange={(patch) => setDeck('secondDeck', patch)}
        />
      </div>

      <div className="mu-editor__section">
        <h2 className="mu-editor__h">Turns</h2>
        <p className="mu-editor__hint">
          Per <strong>left / right deck</strong>, add card IDs (e.g. <code>OP01-001</code>). With two or
          more cards, choose <strong>Sequence</strong> (arrows), <strong>Or</strong>, or{' '}
          <strong>And</strong>.
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
                  label="Left deck"
                  joinGroupId={`turn-${ti}-first`}
                  side={turn.first}
                  onChange={(first) => setTurn(ti, { ...turn, first })}
                />
                <SideEditor
                  label="Right deck"
                  joinGroupId={`turn-${ti}-second`}
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

function SideEditor({
  label,
  joinGroupId,
  side,
  onChange,
}: {
  label: string
  joinGroupId: string
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

  const setMultiJoin = (multiJoin: EditorSideJoin) => onChange({ ...side, multiJoin })

  const multiJoin = side.multiJoin ?? 'seq'

  return (
    <div className="mu-editor__side">
      <h3 className="mu-editor__side-title">{label}</h3>
      {side.cards.length >= 2 ? (
        <fieldset className="mu-editor__join">
          <legend className="mu-editor__join-legend">Multiple cards</legend>
          <div className="mu-editor__join-options" role="radiogroup" aria-label="How to combine cards">
            <label className="mu-editor__join-option">
              <input
                type="radio"
                name={joinGroupId}
                checked={multiJoin === 'seq'}
                onChange={() => setMultiJoin('seq')}
              />
              <span>Sequence</span>
              <span className="mu-editor__join-hint">arrows</span>
            </label>
            <label className="mu-editor__join-option">
              <input
                type="radio"
                name={joinGroupId}
                checked={multiJoin === 'or'}
                onChange={() => setMultiJoin('or')}
              />
              <span>Or</span>
              <span className="mu-editor__join-hint">pick one</span>
            </label>
            <label className="mu-editor__join-option">
              <input
                type="radio"
                name={joinGroupId}
                checked={multiJoin === 'and'}
                onChange={() => setMultiJoin('and')}
              />
              <span>And</span>
              <span className="mu-editor__join-hint">together</span>
            </label>
          </div>
        </fieldset>
      ) : null}
      <div className="mu-editor__cards">
        {side.cards.length === 0 ? (
          <p className="mu-editor__empty-cards">No cards — add at least one for the preview.</p>
        ) : null}
        {side.cards.map((slot, ci) => (
          <div key={ci} className="mu-editor__card-row">
            <CardPickField
              fieldId={`${joinGroupId}-card-${ci}`}
              cardId={slot.id}
              onCardIdChange={(id) => setCardId(ci, id)}
            />
            <button
              type="button"
              className="mu-editor__btn mu-editor__card-row-remove"
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
