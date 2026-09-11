import { useCallback, useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { submitSupportTicket } from '../lib/supportTickets'

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'))
    reader.readAsText(file)
  })
}

export function SupportButton() {
  const auth = useAuth()
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [log, setLog] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loadingFile, setLoadingFile] = useState(false)
  const [sending, setSending] = useState(false)
  const [dragging, setDragging] = useState(false)
  const noteId = useId()
  const fileId = useId()
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setError(null)
    setStatus(null)
  }, [])

  const openModal = useCallback(() => {
    setNote('')
    setLog('')
    setFileName(null)
    setError(null)
    setStatus(null)
    setDragging(false)
    setOpen(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => noteRef.current?.focus(), 0)
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

  const clearLog = () => {
    setLog('')
    setFileName(null)
    setError(null)
    setStatus(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const loadFile = async (file: File | null | undefined) => {
    if (!file) return
    setLoadingFile(true)
    setError(null)
    setStatus(null)
    try {
      const text = await readTextFile(file)
      if (!text.trim()) {
        setError('That file looks empty. Pick a Sim combat log (.log or .txt).')
        setLoadingFile(false)
        return
      }
      setLog(text)
      setFileName(file.name)
    } catch {
      setError('Could not read that file. Try another .log or .txt export.')
    } finally {
      setLoadingFile(false)
    }
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    void loadFile(file)
  }

  const submitTicket = async () => {
    if (!log.trim() && !note.trim()) {
      setError('Add a short note and upload a combat log first.')
      setStatus(null)
      return
    }
    if (!log.trim()) {
      setError('Upload a combat log file so we can reproduce the issue.')
      setStatus(null)
      return
    }
    if (!isSupabaseConfigured) {
      setError('Support tickets need Supabase configured (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY).')
      return
    }

    setSending(true)
    setError(null)
    setStatus(null)
    try {
      const row = await submitSupportTicket({
        note,
        logText: log,
        fileName,
        userId: auth.user?.id ?? null,
      })
      setStatus(`Ticket sent (${row.id.slice(0, 8)}…). Thanks — we’ll take a look.`)
      setNote('')
      setLog('')
      setFileName(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the support ticket.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button type="button" className="app-toolbar__support" onClick={openModal}>
        Support
      </button>

      {open ? (
        <div
          className="mu-import"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mu-support-title"
        >
          <div className="mu-import__backdrop" onClick={close} />
          <div className="mu-import__panel mu-import__panel--support">
            <h2 id="mu-support-title" className="mu-import__title">
              Support
            </h2>
            <p className="mu-import__hint">
              Upload the combat log that broke and add a short note. We’ll get a ticket with
              everything needed to reproduce it.
            </p>

            <label className="mu-editor__label" htmlFor={noteId}>
              What went wrong
            </label>
            <textarea
              ref={noteRef}
              id={noteId}
              className="mu-import__textarea mu-import__textarea--note"
              value={note}
              onChange={(e) => {
                setNote(e.target.value)
                if (error) setError(null)
                if (status) setStatus(null)
              }}
              placeholder="e.g. Left player hand missing after import, life counts wrong on turn 4…"
              spellCheck
            />

            <span className="mu-editor__label" id={`${fileId}-label`}>
              Combat log file
            </span>
            <div
              className={`mu-import__drop${dragging ? ' is-dragging' : ''}${log ? ' has-file' : ''}`}
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
              {log ? (
                <div className="mu-import__file-meta">
                  <strong>{fileName ?? 'Combat log'}</strong>
                  <span>
                    {log.split(/\r?\n/).length.toLocaleString()} lines ·{' '}
                    {(new Blob([log]).size / 1024).toFixed(1)} KB
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
            {status ? <p className="mu-import__status">{status}</p> : null}

            <div className="mu-import__actions">
              <button
                type="button"
                className="mu-editor__btn mu-editor__btn--primary"
                disabled={sending || loadingFile}
                onClick={() => void submitTicket()}
              >
                {sending ? 'Sending…' : 'Send ticket'}
              </button>
              <button type="button" className="mu-editor__btn" onClick={close}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
