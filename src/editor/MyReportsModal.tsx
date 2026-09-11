import { useCallback, useEffect, useState } from 'react'
import type { EditorMatchup } from './model'
import {
  deleteMatchupReport,
  getMatchupReport,
  listMatchupReports,
  renameMatchupReport,
  type MatchupReportListItem,
} from '../lib/matchupReports'

type Props = {
  open: boolean
  onClose: () => void
  onOpenReport: (id: string, matchup: EditorMatchup) => void
  onDeletedReport: (id: string) => void
  onRenamedReport: (id: string, title: string) => void
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function MyReportsModal({
  open,
  onClose,
  onOpenReport,
  onDeletedReport,
  onRenamedReport,
}: Props) {
  const [rows, setRows] = useState<MatchupReportListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await listMatchupReports())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load reports.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void refresh()
  }, [open, refresh])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const openRow = async (id: string) => {
    setBusyId(id)
    setError(null)
    try {
      const row = await getMatchupReport(id)
      onOpenReport(row.id, row.payload)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that report.')
    } finally {
      setBusyId(null)
    }
  }

  const renameRow = async (row: MatchupReportListItem) => {
    const next = window.prompt('Rename report', row.title)
    if (next == null) return
    const title = next.trim()
    if (!title || title === row.title) return
    setBusyId(row.id)
    setError(null)
    try {
      await renameMatchupReport(row.id, title)
      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, title, updated_at: new Date().toISOString() } : r)),
      )
      onRenamedReport(row.id, title)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename that report.')
    } finally {
      setBusyId(null)
    }
  }

  const deleteRow = async (row: MatchupReportListItem) => {
    if (!window.confirm(`Delete “${row.title}”? This cannot be undone.`)) return
    setBusyId(row.id)
    setError(null)
    try {
      await deleteMatchupReport(row.id)
      setRows((prev) => prev.filter((r) => r.id !== row.id))
      onDeletedReport(row.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that report.')
    } finally {
      setBusyId(null)
    }
  }

  if (!open) return null

  return (
    <div className="mu-import" role="dialog" aria-modal="true" aria-labelledby="mu-reports-title">
      <div className="mu-import__backdrop" onClick={onClose} />
      <div className="mu-import__panel mu-import__panel--reports">
        <h2 id="mu-reports-title" className="mu-import__title">
          My reports
        </h2>
        <p className="mu-import__hint">Saved matchup curves in your account.</p>

        {loading ? <p className="mu-import__hint">Loading…</p> : null}
        {error ? <p className="mu-import__error">{error}</p> : null}

        {!loading && rows.length === 0 && !error ? (
          <p className="mu-reports__empty">No saved reports yet. Build a matchup and hit Save.</p>
        ) : null}

        {rows.length > 0 ? (
          <ul className="mu-reports">
            {rows.map((row) => (
              <li key={row.id} className="mu-reports__item">
                <div className="mu-reports__meta">
                  <strong className="mu-reports__name">{row.title}</strong>
                  <span className="mu-reports__when">Updated {formatWhen(row.updated_at)}</span>
                  {row.summary ? <span className="mu-reports__summary">{row.summary}</span> : null}
                </div>
                <div className="mu-reports__actions">
                  <button
                    type="button"
                    className="mu-editor__btn mu-editor__btn--primary"
                    disabled={busyId === row.id}
                    onClick={() => void openRow(row.id)}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="mu-editor__btn"
                    disabled={busyId === row.id}
                    onClick={() => void renameRow(row)}
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    className="mu-editor__btn mu-editor__btn--danger"
                    disabled={busyId === row.id}
                    onClick={() => void deleteRow(row)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mu-import__actions">
          <button type="button" className="mu-editor__btn" onClick={() => void refresh()} disabled={loading}>
            Refresh
          </button>
          <button type="button" className="mu-editor__btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
