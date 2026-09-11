import { useEffect, useId, useRef, useState } from 'react'
import type { OptcgCardRow } from '../lib/optcgApi'
import { searchLeadersByName } from '../lib/optcgApi'
import { CardPreviewFromId, CardSearchResultButton } from '../editor/CardPreview'

const DEBOUNCE_MS = 320

type Props = {
  label: string
  leaderId: string
  leaderName: string
  onPick: (row: OptcgCardRow) => void
  onClear?: () => void
  /** Exclude these leader IDs from results (e.g. your own leader). */
  excludeIds?: string[]
  placeholder?: string
}

/** Name-search picker limited to catalog leaders. */
export function LeaderNameField({
  label,
  leaderId,
  leaderName,
  onPick,
  onClear,
  excludeIds = [],
  placeholder = 'e.g. Mihawk, Luffy, Shanks',
}: Props) {
  const fieldId = useId()
  const [nameQuery, setNameQuery] = useState(leaderName || '')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<OptcgCardRow[]>([])
  const [searching, setSearching] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const exclude = new Set(excludeIds.map((id) => id.trim().toUpperCase()).filter(Boolean))

  useEffect(() => {
    setNameQuery(leaderName || '')
  }, [leaderId, leaderName])

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(nameQuery.trim()), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [nameQuery])

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    searchLeadersByName(debouncedQuery, 32).then((rows) => {
      if (cancelled) return
      const filtered = rows.filter((r) => !exclude.has(r.card_set_id.toUpperCase()))
      setResults(filtered)
      setSearching(false)
      setListOpen(filtered.length > 0)
    })
    return () => {
      cancelled = true
    }
  }, [debouncedQuery, excludeIds.join('|')])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) setListOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const id = leaderId.trim()

  return (
    <div className="mu-guide__leader-pick">
      <div className={`mu-editor__leader-frame ${id ? 'has-id' : ''}`}>
        {id ? (
          <CardPreviewFromId cardId={id.toUpperCase()} size="lg" />
        ) : (
          <div className="mu-editor__leader-placeholder">
            <span>Search a leader by name</span>
          </div>
        )}
      </div>

      <div className="mu-editor__leader-search" ref={searchWrapRef}>
        <label className="mu-editor__label" htmlFor={fieldId}>
          {label}
        </label>
        <input
          id={fieldId}
          className="mu-editor__input mu-editor__input--wide"
          type="search"
          autoComplete="off"
          value={nameQuery}
          onChange={(e) => {
            setNameQuery(e.target.value)
            if (e.target.value.trim().length >= 2) setListOpen(true)
          }}
          onFocus={() => {
            if (results.length > 0) setListOpen(true)
          }}
          placeholder={placeholder}
          spellCheck={false}
        />
        {searching ? <p className="mu-editor__leader-search-meta">Searching…</p> : null}
        {listOpen && results.length > 0 ? (
          <ul className="mu-editor__leader-results" role="listbox">
            {results.map((row) => (
              <li key={row.card_set_id} role="presentation">
                <CardSearchResultButton
                  row={row}
                  onSelect={() => {
                    onPick(row)
                    setNameQuery(row.card_name)
                    setListOpen(false)
                  }}
                />
              </li>
            ))}
          </ul>
        ) : null}
        {listOpen && !searching && debouncedQuery.length >= 2 && results.length === 0 ? (
          <p className="mu-editor__leader-search-meta">No leaders found — try another name.</p>
        ) : null}
      </div>

      {id && onClear ? (
        <button type="button" className="mu-editor__btn" onClick={onClear}>
          Clear leader
        </button>
      ) : null}
      {leaderName ? <p className="mu-editor__leader-name">{leaderName}</p> : null}
    </div>
  )
}
