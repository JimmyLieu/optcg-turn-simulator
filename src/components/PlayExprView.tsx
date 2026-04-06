import type { CardRef, PlayExpr } from '../types/curve'
import { useOptcgCard } from '../hooks/useOptcgCard'

function CardThumb({ card }: { card: CardRef }) {
  const { status, displayTitle, displayImageUrl } = useOptcgCard(card.id, {
    imageUrl: card.imageUrl,
    title: card.title,
  })

  return (
    <figure className="card-thumb" title={displayTitle}>
      {status === 'loading' ? (
        <div className="card-thumb__skeleton" aria-hidden="true" />
      ) : status === 'error' ? (
        <div className="card-thumb__error">
          <span className="card-thumb__error-id">{card.id}</span>
          <span className="card-thumb__error-msg">No image</span>
        </div>
      ) : (
        <img
          src={displayImageUrl}
          alt=""
          width={112}
          height={156}
          loading="lazy"
          decoding="async"
        />
      )}
      <figcaption>{displayTitle}</figcaption>
    </figure>
  )
}

function ArrowDown() {
  return (
    <div className="flow-arrow" aria-hidden="true">
      <span className="flow-arrow__line" />
    </div>
  )
}

export function PlayExprView({ expr }: { expr: PlayExpr }) {
  switch (expr.t) {
    case 'empty':
      return (
        <div className="play-empty" role="status">
          <span>No cards</span>
        </div>
      )
    case 'card':
      return <CardThumb card={expr.card} />
    case 'seq': {
      return (
        <div className="expr-seq">
          {expr.steps.map((step, i) => (
            <div key={i} className="expr-seq__step">
              {i > 0 ? <ArrowDown /> : null}
              <PlayExprView expr={step} />
            </div>
          ))}
        </div>
      )
    }
    case 'or': {
      return (
        <div className="expr-or">
          {expr.branches.map((b, i) => (
            <div key={i} className="expr-or__branch">
              {i > 0 ? <span className="op-chip">or</span> : null}
              <PlayExprView expr={b} />
            </div>
          ))}
        </div>
      )
    }
    case 'and': {
      return (
        <div className="expr-and">
          {expr.parts.map((p, i) => (
            <div key={i} className="expr-and__part">
              {i > 0 ? <span className="op-chip">+</span> : null}
              <PlayExprView expr={p} />
            </div>
          ))}
        </div>
      )
    }
    case 'fork': {
      return (
        <div className="expr-fork">
          <div className="expr-fork__head">
            <PlayExprView expr={expr.head} />
          </div>
          <div className="expr-fork__fan" aria-hidden="true">
            <span className="expr-fork__stem" />
          </div>
          <div className="expr-fork__tails">
            {expr.tails.map((t, i) => (
              <div key={i} className="expr-fork__tail">
                <span className="expr-fork__tail-cap" aria-hidden="true" />
                <PlayExprView expr={t} />
              </div>
            ))}
          </div>
        </div>
      )
    }
    default:
      return null
  }
}
