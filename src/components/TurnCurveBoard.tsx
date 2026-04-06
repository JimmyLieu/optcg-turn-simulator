import { forwardRef } from 'react'
import type { MatchupCurve, TurnRow as TurnRowType } from '../types/curve'
import { deckPanelStyle } from '../lib/deckTheme'
import { PreviewLeaderArt } from './PreviewLeaderArt'
import { PlayExprView } from './PlayExprView'

function TurnRow({
  row,
  firstColors,
  secondColors,
}: {
  row: TurnRowType
  firstColors: MatchupCurve['firstDeck']['colors']
  secondColors: MatchupCurve['secondDeck']['colors']
}) {
  return (
    <div className="turn-row">
      <div
        className="turn-row__side turn-row__side--first deck-panel"
        style={deckPanelStyle(firstColors)}
      >
        <div className="turn-row__plays">
          <PlayExprView expr={row.firstPlayer.play} />
        </div>
        {row.firstPlayer.callout ? (
          <p className="turn-callout">{row.firstPlayer.callout}</p>
        ) : null}
      </div>

      <div className="turn-spine" aria-hidden="true">
        <span className="turn-spine__label">Turn {row.turn}</span>
      </div>

      <div
        className="turn-row__side turn-row__side--second deck-panel"
        style={deckPanelStyle(secondColors)}
      >
        <div className="turn-row__plays">
          <PlayExprView expr={row.secondPlayer.play} />
        </div>
        {row.secondPlayer.callout ? (
          <p className="turn-callout turn-callout--emphasis">{row.secondPlayer.callout}</p>
        ) : null}
      </div>
    </div>
  )
}

function CurveBanner({
  deck,
  variant,
}: {
  deck: MatchupCurve['firstDeck']
  variant: 'first' | 'second'
}) {
  const art = <PreviewLeaderArt cardId={deck.leaderCardId} />
  const text = (
    <div className="curve-banner__text">
      <span className="curve-banner__name">{deck.name}</span>
      <span className="curve-banner__role">{deck.subtitle}</span>
    </div>
  )

  return (
    <div
      className={`curve-banner curve-banner--${variant} deck-panel`}
      style={deckPanelStyle(deck.colors)}
    >
      <div className="curve-banner__inner">
        {variant === 'first' ? (
          <>
            {art}
            {text}
          </>
        ) : (
          <>
            {text}
            {art}
          </>
        )}
      </div>
    </div>
  )
}

export const TurnCurveBoard = forwardRef<HTMLDivElement, { data: MatchupCurve }>(
  function TurnCurveBoard({ data }, ref) {
    return (
      <div ref={ref} className="curve-board">
        <header className="curve-header">
          <CurveBanner deck={data.firstDeck} variant="first" />
          <CurveBanner deck={data.secondDeck} variant="second" />
        </header>

        <div className="curve-body">
          {data.turns.map((row) => (
            <TurnRow
              key={row.turn}
              row={row}
              firstColors={data.firstDeck.colors}
              secondColors={data.secondDeck.colors}
            />
          ))}
        </div>
      </div>
    )
  },
)
