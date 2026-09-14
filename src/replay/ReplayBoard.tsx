import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { CardPreviewFromId } from '../editor/CardPreview'
import { PreviewLeaderArt } from '../components/PreviewLeaderArt'
import type { ReplayFrame, ReplayPlayerState } from './model'
import { ReplayActionList } from './ReplayActionList'

type Props = {
  title: string
  frame: ReplayFrame
}

type AttackFx = {
  actionId: string
  attackerId: string
  targetId: string | null
  from: 'you' | 'opponent'
}

const ATTACK_MS = 900

function HandStrip({ player }: { player: ReplayPlayerState }) {
  return (
    <div className="replay-hand">
      <span className="replay-hand__label">
        {player.displayName} · Hand · {player.hand.length}
      </span>
      <ul className="replay-hand__cards">
        {player.hand.length === 0 ? (
          <li className="replay-hand__empty">Empty</li>
        ) : (
          player.hand.map((id, i) => (
            <li key={`${id}-${i}`}>
              <CardPreviewFromId cardId={id} size="md" />
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

function DonStrip({ count }: { count: number }) {
  const don = Math.min(10, Math.max(0, count))
  return (
    <div className="replay-zone replay-zone--cost">
      <span className="replay-zone__label">Cost · {don} DON!!</span>
      <div className="replay-don-row" aria-label={`${don} DON`}>
        {don === 0 ? (
          <span className="replay-zone__empty">—</span>
        ) : (
          Array.from({ length: don }, (_, i) => (
            <img key={i} className="replay-don-token" src="/don-card.png" alt="" aria-hidden="true" />
          ))
        )}
      </div>
    </div>
  )
}

function LifeStack({ life, hit }: { life: number; hit?: boolean }) {
  const shown = Math.min(Math.max(life, 0), 5)
  return (
    <div className={`replay-zone replay-zone--life${hit ? ' is-hit' : ''}`}>
      <span className="replay-zone__label">Life</span>
      <div className="replay-life-stack" aria-label={`${life} life`}>
        {Array.from({ length: shown }, (_, i) => (
          <img
            key={i}
            className="replay-life-card"
            src="/card-back.png"
            alt=""
            style={{ '--i': i } as CSSProperties}
            aria-hidden="true"
          />
        ))}
        {life === 0 ? (
          <img className="replay-life-card replay-life-card--empty" src="/card-back.png" alt="" aria-hidden="true" />
        ) : null}
        <em className="replay-life-count">{life}</em>
      </div>
    </div>
  )
}

function cardFxClass(id: string, fx: AttackFx | null, role: 'attacker' | 'target', side: 'you' | 'opponent') {
  if (!fx) return ''
  if (role === 'attacker' && fx.attackerId === id && fx.from === side) {
    return ` is-attacking is-attacking--${side}`
  }
  if (role === 'target' && fx.targetId === id && fx.from !== side) {
    return ' is-defending'
  }
  return ''
}

function FieldHalf({
  player,
  side,
  fx,
}: {
  player: ReplayPlayerState
  side: 'opponent' | 'you'
  fx: AttackFx | null
}) {
  const lifeHit = !!fx && fx.from !== side && fx.targetId === player.leaderId

  const characters = (
    <div className="replay-zone replay-zone--chars">
      <span className="replay-zone__label">Character · {player.board.length}</span>
      <ul className="replay-chars">
        {player.board.length === 0 ? (
          <li className="replay-zone__empty">No characters</li>
        ) : (
          player.board.map((id, i) => (
            <li
              key={`${id}-${i}`}
              className={`replay-card-slot${cardFxClass(id, fx, 'attacker', side)}${cardFxClass(id, fx, 'target', side)}`}
            >
              <CardPreviewFromId cardId={id} size="md" />
            </li>
          ))
        )}
      </ul>
    </div>
  )

  const leader = (
    <div
      className={`replay-zone replay-zone--leader replay-card-slot${cardFxClass(player.leaderId, fx, 'attacker', side)}${cardFxClass(player.leaderId, fx, 'target', side)}`}
    >
      <span className="replay-zone__label">Leader</span>
      <div className="replay-field__leader-art">
        {player.leaderId ? <PreviewLeaderArt cardId={player.leaderId} /> : null}
      </div>
    </div>
  )

  const sideZones = (
    <div className="replay-field__side">
      <LifeStack life={player.life} hit={lifeHit} />
      <div
        className="replay-zone replay-zone--trash"
        title={player.trash.length ? player.trash.join(', ') : 'Empty trash'}
      >
        <span className="replay-zone__label">Trash</span>
        <em className="replay-trash-count">{player.trash.length}</em>
      </div>
    </div>
  )

  const cost = <DonStrip count={player.don} />

  return (
    <section className={`replay-field replay-field--${side}`}>
      <header className="replay-field__head">
        <p className="replay-field__name">{player.displayName}</p>
      </header>
      {side === 'opponent' ? cost : null}
      <div className="replay-field__body">
        <div className="replay-field__main">
          {characters}
          {leader}
        </div>
        {sideZones}
      </div>
      {side === 'you' ? cost : null}
    </section>
  )
}

export function ReplayBoard({ title, frame }: Props) {
  const [fx, setFx] = useState<AttackFx | null>(null)
  const [burstKey, setBurstKey] = useState(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }

    const attacks = frame.actions.filter((a) => a.kind === 'attack' && a.cardId)
    if (attacks.length === 0) {
      setFx(null)
      return
    }

    let cancelled = false
    let i = 0

    const step = () => {
      if (cancelled) return
      if (i >= attacks.length) {
        setFx(null)
        return
      }
      const a = attacks[i]!
      const from: 'you' | 'opponent' =
        a.playerId && a.playerId === frame.first.playerId ? 'you' : 'opponent'
      setFx({
        actionId: a.id,
        attackerId: a.cardId!,
        targetId: a.targetCardId ?? null,
        from,
      })
      setBurstKey((k) => k + 1)
      i += 1
      timerRef.current = window.setTimeout(step, ATTACK_MS)
    }

    // Brief beat so the board paints before the first lunge
    timerRef.current = window.setTimeout(step, 120)

    return () => {
      cancelled = true
      if (timerRef.current != null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [frame.index, frame.actions, frame.first.playerId])

  return (
    <div className="replay-sim">
      <aside className="replay-rail" aria-label="Hands and combat log">
        <HandStrip player={frame.second} />
        <ReplayActionList
          actions={frame.actions}
          frameLabel={frame.label}
          activeActionId={fx?.actionId ?? null}
        />
        <HandStrip player={frame.first} />
      </aside>

      <div className={`replay-mat${fx ? ' is-combat' : ''}`}>
        <header className="replay-mat__masthead">
          <p className="replay-mat__kicker">Board replay</p>
          <h2 className="replay-mat__title">{title}</h2>
          <p className="replay-mat__frame">{frame.label}</p>
        </header>
        <FieldHalf player={frame.second} side="opponent" fx={fx} />
        <div className="replay-mat__divider" aria-hidden="true">
          <span>vs</span>
          {fx ? (
            <span key={burstKey} className={`replay-attack-burst replay-attack-burst--${fx.from}`} />
          ) : null}
        </div>
        <FieldHalf player={frame.first} side="you" fx={fx} />
      </div>
    </div>
  )
}
