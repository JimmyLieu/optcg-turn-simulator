import { useEffect, useRef } from 'react'
import { CardPreviewFromId } from '../editor/CardPreview'
import type { ReplayAction } from './model'

type Props = {
  actions: ReplayAction[]
  frameLabel: string
  activeActionId?: string | null
}

function kindClass(kind: ReplayAction['kind']): string {
  switch (kind) {
    case 'attack':
    case 'combat':
    case 'ko':
      return 'is-combat'
    case 'search':
      return 'is-search'
    case 'deploy':
      return 'is-deploy'
    case 'counter':
      return 'is-counter'
    case 'concede':
      return 'is-concede'
    default:
      return ''
  }
}

export function ReplayActionList({ actions, frameLabel, activeActionId = null }: Props) {
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    if (!activeActionId || !listRef.current) return
    const el = listRef.current.querySelector<HTMLElement>(`[data-action-id="${activeActionId}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeActionId])

  return (
    <div className="replay-log" aria-label="Turn actions">
      <header className="replay-log__head">
        <h3 className="replay-log__title">Combat log</h3>
        <p className="replay-log__sub">{frameLabel}</p>
      </header>
      {actions.length === 0 ? (
        <p className="replay-log__empty">No actions recorded for this frame.</p>
      ) : (
        <ol className="replay-log__list" ref={listRef}>
          {actions.map((a) => (
            <li
              key={a.id}
              data-action-id={a.id}
              className={`replay-log__item ${kindClass(a.kind)}${activeActionId === a.id ? ' is-active' : ''}`}
            >
              {a.cardId ? (
                <div className="replay-log__thumb">
                  <CardPreviewFromId cardId={a.cardId} size="xs" />
                </div>
              ) : (
                <div className="replay-log__thumb replay-log__thumb--empty" aria-hidden="true" />
              )}
              <div className="replay-log__body">
                {a.displayName ? (
                  <span className="replay-log__who">{a.displayName}</span>
                ) : null}
                <span className="replay-log__text">{a.text}</span>
                <span className="replay-log__kind">{a.kind}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
