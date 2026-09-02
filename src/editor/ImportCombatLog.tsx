import { useEffect, useId, useRef, useState } from 'react'
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
  const [busy, setBusy] = useState(false)
  const textareaId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => textareaRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  const applyLog = (raw: string) => {
    const text = raw.trim()
    if (!text) {
      setError('Clipboard is empty — copy a combat log first, or paste it below.')
      setOpen(true)
      return false
    }
    try {
      onImported(combatLogToEditorMatchup(text))
      setOpen(false)
      setDraft('')
      setError(null)
      return true
    } catch (e) {
      const message =
        e instanceof CombatLogParseError
          ? e.message
          : 'Could not parse this combat log.'
      setError(message)
      setOpen(true)
      return false
    }
  }

  const onClickImport = async () => {
    setBusy(true)
    setError(null)
    const clip = await readClipboardText()
    setBusy(false)
    if (clip) {
      applyLog(clip)
      return
    }
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        className="app-toolbar__reset"
        disabled={busy}
        onClick={() => void onClickImport()}
      >
        {busy ? 'Reading…' : 'Import combat log'}
      </button>

      {open ? (
        <div
          className="mu-import"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mu-import-title"
        >
          <div className="mu-import__backdrop" onClick={() => setOpen(false)} />
          <div className="mu-import__panel">
            <h2 id="mu-import-title" className="mu-import__title">
              Import combat log
            </h2>
            <p className="mu-import__hint">
              Copy a Sim replay, then click Import — or paste the log here.
            </p>
            <label className="mu-editor__label" htmlFor={textareaId}>
              Combat log
            </label>
            <textarea
              ref={textareaRef}
              id={textareaId}
              className="mu-import__textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
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
              <button type="button" className="mu-editor__btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
