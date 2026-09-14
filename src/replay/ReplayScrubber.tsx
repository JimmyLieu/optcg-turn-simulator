import { useEffect, useRef, useState } from 'react'
import type { ReplayFrame } from './model'

type Props = {
  frames: ReplayFrame[]
  index: number
  onIndexChange: (next: number) => void
}

type Speed = 1 | 2

/** Milliseconds between frames at 1× (plus attack FX time). */
const BASE_MS = 1100
const ATTACK_MS = 900

export function ReplayScrubber({ frames, index, onIndexChange }: Props) {
  const max = Math.max(0, frames.length - 1)
  const frame = frames[index]
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>(1)
  const onIndexChangeRef = useRef(onIndexChange)
  onIndexChangeRef.current = onIndexChange

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setPlaying(false)
        onIndexChange(Math.max(0, index - 1))
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        setPlaying(false)
        onIndexChange(Math.min(max, index + 1))
      } else if (
        e.key === ' ' &&
        !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault()
        setPlaying((p) => !p)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [index, max, onIndexChange])

  useEffect(() => {
    if (!playing || frames.length === 0) return
    if (index >= max) {
      setPlaying(false)
      return
    }
    const attacks = frames[index]?.actions.filter((a) => a.kind === 'attack').length ?? 0
    const wait = (BASE_MS + attacks * ATTACK_MS + (attacks > 0 ? 200 : 0)) / speed
    const id = window.setTimeout(() => {
      onIndexChangeRef.current(index + 1)
    }, wait)
    return () => window.clearTimeout(id)
  }, [playing, speed, index, max, frames])

  if (!frame || frames.length === 0) return null

  const togglePlay = () => {
    if (!playing && index >= max) {
      onIndexChange(0)
      setPlaying(true)
      return
    }
    setPlaying((p) => !p)
  }

  return (
    <div className="replay-scrubber">
      <button
        type="button"
        className="mu-editor__btn replay-scrubber__play"
        onClick={togglePlay}
        aria-pressed={playing}
        aria-label={playing ? 'Pause replay' : 'Play replay'}
      >
        {playing ? 'Pause' : 'Play'}
      </button>
      <div className="replay-scrubber__speeds" role="group" aria-label="Playback speed">
        {([1, 2] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={`replay-scrubber__speed${speed === s ? ' is-active' : ''}`}
            aria-pressed={speed === s}
            onClick={() => setSpeed(s)}
          >
            {s}×
          </button>
        ))}
      </div>
      <button
        type="button"
        className="mu-editor__btn"
        disabled={index <= 0}
        onClick={() => {
          setPlaying(false)
          onIndexChange(index - 1)
        }}
      >
        Prev
      </button>
      <label className="replay-scrubber__slider">
        <span className="visually-hidden">Replay frame</span>
        <input
          type="range"
          min={0}
          max={max}
          value={index}
          onChange={(e) => {
            setPlaying(false)
            onIndexChange(Number(e.target.value))
          }}
        />
      </label>
      <button
        type="button"
        className="mu-editor__btn"
        disabled={index >= max}
        onClick={() => {
          setPlaying(false)
          onIndexChange(index + 1)
        }}
      >
        Next
      </button>
      <p className="replay-scrubber__meta">
        <strong>
          {index + 1} / {frames.length}
        </strong>
        <span>{frame.label}</span>
      </p>
    </div>
  )
}
