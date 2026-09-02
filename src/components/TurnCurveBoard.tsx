import type { ActionLine, CardRef, MatchupCurve, PlayLineItem, TurnRow as TurnRowType, TurnSide } from '../types/curve'
import { leaderBarStyle } from '../lib/deckTheme'
import { useOptcgCard } from '../hooks/useOptcgCard'

function formatPower(raw: string | undefined): string | undefined {
  if (!raw) return undefined
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return undefined
  return n.toLocaleString('en-US')
}

function LogCard({ card }: { card: CardRef }) {
  const { status, displayTitle, displayImageUrl, displayCost, displayPower } = useOptcgCard(card.id, {
    imageUrl: card.imageUrl,
    title: card.title,
  })
  const short = displayTitle.replace(/\s+-\s+[A-Z0-9].*$/, '')
  const power = formatPower(displayPower)

  return (
    <figure className="log-card" title={displayTitle}>
      {displayCost ? <span className="log-card__cost">{displayCost}</span> : null}
      {status === 'loading' ? (
        <div className="log-card__art log-card__art--skeleton" aria-hidden="true" />
      ) : status === 'error' || !displayImageUrl ? (
        <div className="log-card__art log-card__art--missing">
          <span>{card.id}</span>
        </div>
      ) : (
        <img className="log-card__art" src={displayImageUrl} alt="" width={72} height={100} loading="lazy" />
      )}
      <figcaption className="log-card__cap">
        <span className="log-card__name">{short}</span>
        <span className="log-card__meta">
          {card.id}
          {power ? ` — ${power}` : ''}
        </span>
      </figcaption>
    </figure>
  )
}

function JoinGlyph({ via }: { via?: PlayLineItem['via'] }) {
  if (via === 'and') return <span className="log-join log-join--and">+</span>
  if (via === 'or') return <span className="log-join log-join--or">or</span>
  return <span className="log-join log-join--effect">→</span>
}

function PlayStrip({ side }: { side: TurnSide }) {
  const items = side.playLine
  if (!items || items.length === 0) {
    return <p className="log-panel__empty">no plays</p>
  }
  return (
    <div className="log-strip">
      {items.map((item, i) => (
        <div key={`${item.card.id}-${i}`} className="log-strip__item">
          {i > 0 ? <JoinGlyph via={item.via} /> : null}
          <LogCard card={item.card} />
        </div>
      ))}
    </div>
  )
}

function ActionList({ actions }: { actions: ActionLine[] }) {
  if (actions.length === 0) return null
  return (
    <ul className="log-actions">
      {actions.map((line, i) => {
        if (line.kind === 'combat' || line.kind === 'ko' || line.kind === 'damage') {
          const outcomeClass =
            line.kind === 'ko' ? 'is-ko' : line.kind === 'damage' ? 'is-damage' : 'is-fail'
          return (
            <li key={i} className="log-actions__combat">
              <strong>{line.text}</strong>
              {line.outcome && line.outcome !== 'fail' ? (
                <>
                  {' → '}
                  <span className={`log-outcome ${outcomeClass}`}>{line.outcome}</span>
                </>
              ) : line.outcome === 'fail' ? (
                <>
                  {' → '}
                  <span className="log-outcome is-fail">fail</span>
                </>
              ) : null}
            </li>
          )
        }
        if (line.kind === 'concede') {
          return (
            <li key={i} className="log-actions__combat">
              <span className="log-outcome is-damage">{line.text}</span>
            </li>
          )
        }
        return (
          <li key={i} className={line.kind === 'sub' ? 'log-actions__sub' : 'log-actions__effect'}>
            {line.text}
          </li>
        )
      })}
    </ul>
  )
}

function TurnPanel({ side }: { side: TurnSide }) {
  return (
    <div className="log-panel">
      {side.don != null ? <span className="log-panel__don">{side.don} DON!!</span> : null}
      <PlayStrip side={side} />
      <ActionList actions={side.actions ?? []} />
    </div>
  )
}

function TurnRow({ row }: { row: TurnRowType }) {
  return (
    <div className="log-turn">
      <TurnPanel side={row.firstPlayer} />
      <div className="log-axis">
        <span className="log-axis__line" aria-hidden="true" />
        <div className="log-axis__pill">
          <span className="log-axis__turn">Turn {row.turn}</span>
          {row.firstLife != null && row.secondLife != null ? (
            <span className="log-axis__life">
              {row.firstLife} Life {row.secondLife}
            </span>
          ) : null}
        </div>
      </div>
      <TurnPanel side={row.secondPlayer} />
    </div>
  )
}

export function TurnCurveBoard({ data }: { data: MatchupCurve }) {
  return (
    <div className="log-board">
      <header className="log-board__title-block">
        <h2 className="log-board__title">{data.title}</h2>
        {data.summary ? <p className="log-board__summary">{data.summary}</p> : null}
      </header>

      <div className="log-board__headers">
        <div className="log-board__player" style={leaderBarStyle(data.firstDeck.colors)}>
          <span className="log-board__player-name">{data.firstDeck.name}</span>
          <span className="log-board__player-id">{data.firstDeck.subtitle}</span>
        </div>
        <div className="log-board__headers-gap" />
        <div className="log-board__player" style={leaderBarStyle(data.secondDeck.colors)}>
          <span className="log-board__player-name">{data.secondDeck.name}</span>
          <span className="log-board__player-id">{data.secondDeck.subtitle}</span>
        </div>
      </div>

      <div className="log-board__turns">
        {data.turns.map((row) => (
          <TurnRow key={row.turn} row={row} />
        ))}
      </div>

      <p className="log-legend">
        <span>
          <em>--</em> effect that triggers or modifies
        </span>
        <span>
          <strong>+</strong> plays from the same turn
        </span>
        <span>
          <strong>→</strong> one card puts another onto the field
        </span>
        <span>the number in the circle is the cost</span>
      </p>
    </div>
  )
}
