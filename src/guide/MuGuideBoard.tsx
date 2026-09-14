import { CardPreviewFromId } from '../editor/CardPreview'
import { PreviewLeaderArt } from '../components/PreviewLeaderArt'
import type { MuGuide } from './model'

type Props = {
  data: MuGuide
}

export function MuGuideBoard({ data }: Props) {
  const title = data.title.trim() || 'MU Guide'

  return (
    <div className="mu-guide-board">
      <header className="mu-guide-board__masthead">
        {data.myLeaderId ? (
          <div className="mu-guide-board__hero-art">
            <PreviewLeaderArt cardId={data.myLeaderId} />
          </div>
        ) : null}
        <div className="mu-guide-board__hero-text">
          <p className="mu-guide-board__eyebrow">Matchup guide</p>
          <h2 className="mu-guide-board__title">{title}</h2>
          {data.myLeaderName ? (
            <p className="mu-guide-board__subtitle">{data.myLeaderName}</p>
          ) : null}
        </div>
      </header>

      {data.matchups.length === 0 ? (
        <p className="mu-guide-board__empty">No matchups added yet.</p>
      ) : (
        <div className="mu-guide-board__list">
          {data.matchups.map((m) => {
            const vsName = m.vsLeaderName.trim() || 'Unknown leader'
            const keys = m.keyCardIds.map((id) => id.trim()).filter(Boolean)
            return (
              <article key={m.id} className="mu-guide-board__row">
                <div className="mu-guide-board__vs">
                  {m.vsLeaderId ? (
                    <div className="mu-guide-board__vs-art">
                      <PreviewLeaderArt cardId={m.vsLeaderId} />
                    </div>
                  ) : (
                    <div className="mu-guide-board__vs-art mu-guide-board__vs-art--empty" />
                  )}
                  <h3 className="mu-guide-board__vs-name">VS {vsName}</h3>
                </div>

                <div className="mu-guide-board__body">
                  <div className="mu-guide-board__block">
                    <h4 className="mu-guide-board__label">Key cards</h4>
                    {keys.length === 0 ? (
                      <p className="mu-guide-board__muted">—</p>
                    ) : (
                      <ul className="mu-guide-board__keys">
                        {keys.map((id) => (
                          <li key={id} className="mu-guide-board__key">
                            <CardPreviewFromId cardId={id} size="sm" />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="mu-guide-board__block">
                    <h4 className="mu-guide-board__label">Gameplan</h4>
                    <p className="mu-guide-board__notes">
                      {m.gameplan.trim() || '—'}
                    </p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
