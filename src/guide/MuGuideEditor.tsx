import { CardPickField } from '../editor/CardPickField'
import type { OptcgCardRow } from '../lib/optcgApi'
import { LeaderNameField } from './LeaderNameField'
import {
  createEmptyMatchup,
  defaultGuideTitle,
  type MuGuide,
  type MuGuideMatchup,
} from './model'

type Props = {
  value: MuGuide
  onChange: (next: MuGuide) => void
}

function patchMatchup(
  guide: MuGuide,
  matchupId: string,
  patch: Partial<MuGuideMatchup>,
): MuGuide {
  return {
    ...guide,
    matchups: guide.matchups.map((m) => (m.id === matchupId ? { ...m, ...patch } : m)),
  }
}

export function MuGuideEditor({ value, onChange }: Props) {
  const pickMyLeader = (row: OptcgCardRow) => {
    const nextName = row.card_name
    const prevAuto = defaultGuideTitle(value.myLeaderName)
    const titleStillAuto = !value.title.trim() || value.title === prevAuto || value.title === 'MU Guide'
    onChange({
      ...value,
      myLeaderId: row.card_set_id,
      myLeaderName: nextName,
      title: titleStillAuto ? defaultGuideTitle(nextName) : value.title,
      matchups: value.matchups.filter(
        (m) => m.vsLeaderId.toUpperCase() !== row.card_set_id.toUpperCase(),
      ),
    })
  }

  const addMatchup = () => {
    onChange({
      ...value,
      matchups: [...value.matchups, createEmptyMatchup()],
    })
  }

  const removeMatchup = (id: string) => {
    onChange({
      ...value,
      matchups: value.matchups.filter((m) => m.id !== id),
    })
  }

  return (
    <div className="mu-guide-editor">
      <section className="mu-editor__section">
        <h2 className="mu-editor__h">Your leader</h2>
        <p className="mu-editor__hint">
          Search by name — only leaders from the card catalog are available.
        </p>
        <LeaderNameField
          label="Search your leader"
          leaderId={value.myLeaderId}
          leaderName={value.myLeaderName}
          onPick={pickMyLeader}
          onClear={() =>
            onChange({
              ...value,
              myLeaderId: '',
              myLeaderName: '',
              title: 'MU Guide',
            })
          }
        />
        <label className="mu-editor__label" htmlFor="mu-guide-title">
          Guide title
        </label>
        <input
          id="mu-guide-title"
          className="mu-editor__input mu-editor__input--wide"
          value={value.title}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder="e.g. Mihawk MU Guide"
        />
      </section>

      <section className="mu-editor__section">
        <div className="mu-guide-editor__section-head">
          <h2 className="mu-editor__h">Matchups</h2>
          <button
            type="button"
            className="mu-editor__btn mu-editor__btn--primary"
            disabled={!value.myLeaderId}
            onClick={addMatchup}
          >
            Add matchup
          </button>
        </div>
        {!value.myLeaderId ? (
          <p className="mu-editor__hint">Pick your leader first, then add VS matchups.</p>
        ) : value.matchups.length === 0 ? (
          <p className="mu-editor__hint">No matchups yet. Add one for each opponent you care about.</p>
        ) : null}

        <div className="mu-guide-editor__list">
          {value.matchups.map((m, index) => (
            <article key={m.id} className="mu-guide-editor__card">
              <div className="mu-guide-editor__card-head">
                <h3 className="mu-guide-editor__vs">
                  VS {m.vsLeaderName.trim() || `Opponent ${index + 1}`}
                </h3>
                <button
                  type="button"
                  className="mu-editor__btn"
                  onClick={() => removeMatchup(m.id)}
                >
                  Remove
                </button>
              </div>

              <LeaderNameField
                label="Opponent leader"
                leaderId={m.vsLeaderId}
                leaderName={m.vsLeaderName}
                excludeIds={[value.myLeaderId]}
                onPick={(row) =>
                  onChange(
                    patchMatchup(value, m.id, {
                      vsLeaderId: row.card_set_id,
                      vsLeaderName: row.card_name,
                    }),
                  )
                }
                onClear={() =>
                  onChange(
                    patchMatchup(value, m.id, {
                      vsLeaderId: '',
                      vsLeaderName: '',
                    }),
                  )
                }
              />

              <div className="mu-guide-editor__fields">
                <div className="mu-guide-editor__keys">
                  <span className="mu-editor__label">Key cards</span>
                  {m.keyCardIds.map((cardId, cardIndex) => (
                    <div key={`${m.id}-key-${cardIndex}`} className="mu-guide-editor__key-row">
                      <CardPickField
                        fieldId={`${m.id}-key-${cardIndex}`}
                        cardId={cardId}
                        onCardIdChange={(id) => {
                          const next = [...m.keyCardIds]
                          next[cardIndex] = id
                          onChange(patchMatchup(value, m.id, { keyCardIds: next }))
                        }}
                      />
                      <button
                        type="button"
                        className="mu-editor__btn"
                        onClick={() => {
                          const next = m.keyCardIds.filter((_, i) => i !== cardIndex)
                          onChange(patchMatchup(value, m.id, { keyCardIds: next }))
                        }}
                      >
                        Remove card
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="mu-editor__btn"
                    onClick={() =>
                      onChange(
                        patchMatchup(value, m.id, {
                          keyCardIds: [...m.keyCardIds, ''],
                        }),
                      )
                    }
                  >
                    Add key card
                  </button>
                </div>

                <label className="mu-editor__label" htmlFor={`${m.id}-gameplan`}>
                  Gameplan / notes
                </label>
                <textarea
                  id={`${m.id}-gameplan`}
                  className="mu-import__textarea mu-guide-editor__notes"
                  value={m.gameplan}
                  onChange={(e) =>
                    onChange(patchMatchup(value, m.id, { gameplan: e.target.value }))
                  }
                  placeholder="How you approach this matchup…"
                  spellCheck
                />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
