import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
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

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'))
    reader.readAsText(file)
  })
}

export function ImportCombatLogButton({ onImported }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pasting, setPasting] = useState(false)
  const [loadingFile, setLoadingFile] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileId = useId()
  const fileRef = useRef<HTMLInputElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setError(null)
    setDragging(false)
  }, [])

  const openModal = useCallback(() => {
    setDraft('')
    setFileName(null)
    setError(null)
    setDragging(false)
    setOpen(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, close])

  const clearLog = () => {
    setDraft('')
    setFileName(null)
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

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

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    void loadFile(e.target.files?.[0])
  }

  const applyLog = (raw: string) => {
    const text = raw.trim()
    if (!text) {
      setError('Upload a combat log, or paste one from the clipboard.')
      return false
    }
    try {
      onImported(combatLogToEditorMatchup(text, fileName ?? undefined))
      close()
      setDraft('')
      setFileName(null)
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
      setError('Could not read the clipboard — upload a .log / .txt file instead.')
      return
    }
    setDraft(clip)
    setFileName(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <>
      <button type="button" className="app-toolbar__reset" onClick={openModal}>
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
              Upload a Sim replay log (.log or .txt), then build the matchup.
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
                    <button
                      type="button"
                      className="mu-editor__btn"
                      onClick={() => fileRef.current?.click()}
                    >
                      Replace file
                    </button>
                    <button type="button" className="mu-editor__btn" onClick={clearLog}>
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
                Build matchup
              </button>
              <button
                type="button"
                className="mu-editor__btn"
                disabled={pasting || loadingFile}
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
