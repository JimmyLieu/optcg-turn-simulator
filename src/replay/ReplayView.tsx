import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { CombatLogParseError } from '../lib/parseCombatLog'
import { combatLogToReplaySession } from './parseReplay'
import type { ReplaySession } from './model'
import { ReplayBoard } from './ReplayBoard'
import { ReplayScrubber } from './ReplayScrubber'

type Props = {
  session: ReplaySession | null
  frameIndex: number
  onSession: (session: ReplaySession) => void
  onFrameIndex: (index: number) => void
  onClear: () => void
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'))
    reader.readAsText(file)
  })
}

async function readClipboardText(): Promise<string | null> {
  try {
    const text = await navigator.clipboard.readText()
    return text.trim() ? text : null
  } catch {
    return null
  }
}

export function ReplayView({ session, frameIndex, onSession, onFrameIndex, onClear }: Props) {
  const [draft, setDraft] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingFile, setLoadingFile] = useState(false)
  const [pasting, setPasting] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileId = useId()
  const fileRef = useRef<HTMLInputElement>(null)

  const loadFile = async (file: File | null | undefined) => {
    if (!file) return
    setLoadingFile(true)
    setError(null)
    try {
      const text = await readTextFile(file)
      if (!text.trim()) {
        setError('That file looks empty. Pick a Sim combat log (.log or .txt).')
        setLoadingFile(false)
        return
      }
      setDraft(text)
      setFileName(file.name)
    } catch {
      setError('Could not read that file. Try another .log or .txt export.')
    } finally {
      setLoadingFile(false)
    }
  }

  const applyLog = useCallback(
    (raw: string) => {
      const text = raw.trim()
      if (!text) {
        setError('Upload a combat log, or paste one from the clipboard.')
        return
      }
      try {
        const next = combatLogToReplaySession(text, fileName ?? undefined)
        onSession(next)
        onFrameIndex(0)
        setError(null)
        setDraft('')
        setFileName(null)
        if (fileRef.current) fileRef.current.value = ''
      } catch (e) {
        setError(
          e instanceof CombatLogParseError ? e.message : 'Could not parse this combat log.',
        )
      }
    },
    [fileName, onFrameIndex, onSession],
  )

  const pasteFromClipboard = async () => {
    setPasting(true)
    setError(null)
    const clip = await readClipboardText()
    setPasting(false)
    if (!clip) {
      setError('Could not read the clipboard — upload a .log / .txt file instead.')
      return
    }
    setDraft(clip)
    setFileName(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    void loadFile(e.target.files?.[0])
  }

  useEffect(() => {
    if (!session) return
    if (frameIndex < 0 || frameIndex >= session.frames.length) {
      onFrameIndex(0)
    }
  }, [session, frameIndex, onFrameIndex])

  if (session && session.frames.length > 0) {
    const frame = session.frames[Math.min(frameIndex, session.frames.length - 1)]!
    return (
      <div className="replay-view">
        <ReplayScrubber
          frames={session.frames}
          index={Math.min(frameIndex, session.frames.length - 1)}
          onIndexChange={onFrameIndex}
        />
        <div className="replay-view__stage">
          <ReplayBoard title={session.title} frame={frame} />
        </div>
        <div className="replay-view__actions">
          <button
            type="button"
            className="mu-editor__btn"
            onClick={() => {
              if (!window.confirm('Clear this replay and import another log?')) return
              onClear()
            }}
          >
            Import another log
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="app-page replay-view replay-view--empty">
      <p className="mu-editor__hint">
        Scrub <strong>end-of-turn board snapshots</strong>. The combat log lists attacks, searches,
        deploys, and draws from that turn.
      </p>

      <span className="mu-editor__label" id={`${fileId}-label`}>
        Combat log
      </span>
      <div
        className={`mu-import__drop${dragging ? ' is-dragging' : ''}${draft ? ' has-file' : ''}`}
        onDragEnter={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragging(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void loadFile(e.dataTransfer.files?.[0])
        }}
      >
        <input
          ref={fileRef}
          id={fileId}
          className="mu-import__file"
          type="file"
          accept=".log,.txt,text/plain"
          onChange={onFileChange}
          aria-labelledby={`${fileId}-label`}
        />
        {draft ? (
          <div className="mu-import__file-meta">
            <strong>{fileName ?? 'Clipboard paste'}</strong>
            <span>
              {draft.split(/\r?\n/).length.toLocaleString()} lines ·{' '}
              {(new Blob([draft]).size / 1024).toFixed(1)} KB
            </span>
            <div className="mu-import__file-actions">
              <button type="button" className="mu-editor__btn" onClick={() => fileRef.current?.click()}>
                Replace file
              </button>
              <button
                type="button"
                className="mu-editor__btn"
                onClick={() => {
                  setDraft('')
                  setFileName(null)
                  if (fileRef.current) fileRef.current.value = ''
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ) : (
          <label htmlFor={fileId} className="mu-import__drop-label">
            <strong>{loadingFile ? 'Reading file…' : 'Drop a .log / .txt here'}</strong>
            <span>or click to choose a Sim combat log</span>
          </label>
        )}
      </div>

      {error ? <p className="mu-import__error">{error}</p> : null}

      <div className="mu-import__actions">
        <button
          type="button"
          className="mu-editor__btn mu-editor__btn--primary"
          disabled={loadingFile || !draft.trim()}
          onClick={() => applyLog(draft)}
        >
          Open replay
        </button>
        <button
          type="button"
          className="mu-editor__btn"
          disabled={pasting || loadingFile}
          onClick={() => void pasteFromClipboard()}
        >
          {pasting ? 'Reading…' : 'Paste from clipboard'}
        </button>
      </div>
    </div>
  )
}
