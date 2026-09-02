import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { EditorMatchup } from './model'
import { combatLogToEditorMatchup, CombatLogParseError } from '../lib/parseCombatLog'

type Props = {
  onImported: (next: EditorMatchup) => void
}

async function readClipboardText(): Promise<string | null> {
  try {
    const text = await navigator.clipboard.readText()
    return text.trim() ? text : null
  } catch {
    return null
  }
}

export function ImportCombatLogButton({ onImported }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pasting, setPasting] = useState(false)
  const textareaId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setError(null)
  }, [])

  const openModal = useCallback(() => {
    setDraft('')
    setError(null)
    setOpen(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => textareaRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  const applyLog = (raw: string) => {
    const text = raw.trim()
    if (!text) {
      setError('Paste a combat log above, or use Paste from clipboard.')
      return false
    }
    try {
      onImported(combatLogToEditorMatchup(text))
      close()
      setDraft('')
      return true
    } catch (e) {
      const message =
        e instanceof CombatLogParseError
          ? e.message
          : 'Could not parse this combat log.'
      setError(message)
      return false
    }
  }

  const pasteFromClipboard = async () => {
    setPasting(true)
    setError(null)
    const clip = await readClipboardText()
    setPasting(false)
    if (!clip) {
      setError('Could not read the clipboard — paste the log manually below.')
      return
    }
    setDraft(clip)
  }

  return (
    <>
      <button
        type="button"
        className="app-toolbar__reset"
        onClick={openModal}
      >
        Import combat log
      </button>

      {open ? (
        <div
          className="mu-import"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mu-import-title"
        >
          <div className="mu-import__backdrop" onClick={close} />
          <div className="mu-import__panel">
            <h2 id="mu-import-title" className="mu-import__title">
              Import combat log
            </h2>
            <p className="mu-import__hint">
              Paste a Sim replay log below, then build the matchup.
            </p>
            <label className="mu-editor__label" htmlFor={textareaId}>
              Combat log
            </label>
            <textarea
              ref={textareaRef}
              id={textareaId}
              className="mu-import__textarea"
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                if (error) setError(null)
              }}
              placeholder="Paste the full combat log…"
              spellCheck={false}
            />
            {error ? <p className="mu-import__error">{error}</p> : null}
            <div className="mu-import__actions">
              <button
                type="button"
                className="mu-editor__btn mu-editor__btn--primary"
                onClick={() => applyLog(draft)}
              >
                Build matchup
              </button>
              <button
                type="button"
                className="mu-editor__btn"
                disabled={pasting}
                onClick={() => void pasteFromClipboard()}
              >
                {pasting ? 'Reading…' : 'Paste from clipboard'}
              </button>
              <button type="button" className="mu-editor__btn" onClick={close}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
