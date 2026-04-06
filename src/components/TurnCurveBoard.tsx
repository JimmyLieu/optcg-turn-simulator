import type { MatchupCurve, TurnRow as TurnRowType } from '../types/curve'
import { deckPanelClassName } from '../lib/deckColors'
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
        className={`turn-row__side turn-row__side--first ${deckPanelClassName(firstColors)}`}
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
        className={`turn-row__side turn-row__side--second ${deckPanelClassName(secondColors)}`}
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

export function TurnCurveBoard({ data }: { data: MatchupCurve }) {
  return (
    <div className="curve-board">
      <header className="curve-header">
        <div
          className={`curve-banner curve-banner--first ${deckPanelClassName(data.firstDeck.colors)}`}
        >
          <span className="curve-banner__name">{data.firstDeck.name}</span>
          <span className="curve-banner__role">{data.firstDeck.subtitle}</span>
        </div>
        <div
          className={`curve-banner curve-banner--second ${deckPanelClassName(data.secondDeck.colors)}`}
        >
          <span className="curve-banner__name">{data.secondDeck.name}</span>
          <span className="curve-banner__role">{data.secondDeck.subtitle}</span>
        </div>
      </header>

      <p className="curve-title">{data.title}</p>

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
}
