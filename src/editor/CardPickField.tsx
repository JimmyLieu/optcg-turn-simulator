import { useCallback, useEffect, useRef, useState } from 'react'
import type { OptcgCardRow } from '../lib/optcgApi'
import { fetchCardBySetId, searchCardsByName } from '../lib/optcgApi'

const DEBOUNCE_MS = 320

type Props = {
  cardId: string
  onCardIdChange: (id: string) => void
  /** Unique id for labels / a11y (e.g. `turn-0-first-card-1`) */
  fieldId: string
}

export function CardPickField({ cardId, onCardIdChange, fieldId }: Props) {
  const [nameQuery, setNameQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<OptcgCardRow[]>([])
  const [searching, setSearching] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [lookupError, setLookupError] = useState<string | null>(null)

  const searchWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(nameQuery.trim()), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [nameQuery])

  /** Resolve display name from id when id is pasted or updated (debounced — avoids fetch per keystroke). */
  useEffect(() => {
    const raw = cardId.trim()
    if (!raw) {
      setNameQuery('')
      return
    }
    let cancelled = false
    const t = window.setTimeout(() => {
      fetchCardBySetId(raw.toUpperCase()).then((row) => {
        if (cancelled || !row) return
        setNameQuery(row.card_name)
      })
    }, 450)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [cardId])

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    searchCardsByName(debouncedQuery, 28).then((rows) => {
      if (cancelled) return
      setResults(rows)
      setSearching(false)
      setListOpen(rows.length > 0)
    })
    return () => {
      cancelled = true
    }
  }, [debouncedQuery])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) setListOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const applyRow = useCallback(
    (row: OptcgCardRow) => {
      setLookupError(null)
      onCardIdChange(row.card_set_id)
      setNameQuery(row.card_name)
      setListOpen(false)
    },
    [onCardIdChange],
  )

  const onIdBlur = () => {
    const raw = cardId.trim()
    setLookupError(null)
    if (!raw) {
      onCardIdChange('')
      setNameQuery('')
      return
    }
    const normalized = raw.toUpperCase()
    fetchCardBySetId(normalized).then((row) => {
      if (row) applyRow(row)
      else {
        setLookupError('Card not found')
        onCardIdChange(normalized)
      }
    })
  }

  const searchInputId = `${fieldId}-search`
  const idInputId = `${fieldId}-id`

  return (
    <div className="mu-editor__card-pick">
      <div className="mu-editor__card-pick-search" ref={searchWrapRef}>
        <label className="mu-editor__label mu-editor__label--compact" htmlFor={searchInputId}>
          Search by name
        </label>
        <input
          id={searchInputId}
          className="mu-editor__input"
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
          placeholder="Card name…"
          spellCheck={false}
        />
        {searching ? (
          <p className="mu-editor__card-pick-meta">Searching…</p>
        ) : null}
        {listOpen && results.length > 0 ? (
          <ul className="mu-editor__leader-results mu-editor__leader-results--compact" role="listbox">
            {results.map((row) => (
              <li key={row.card_set_id} role="presentation">
                <button
                  type="button"
                  className="mu-editor__leader-result"
                  role="option"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyRow(row)}
                >
                  <span className="mu-editor__leader-result-name">{row.card_name}</span>
                  <span className="mu-editor__leader-result-id">
                    {row.card_set_id}
                    {row.card_type ? ` · ${row.card_type}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {listOpen && !searching && debouncedQuery.length >= 2 && results.length === 0 ? (
          <p className="mu-editor__card-pick-meta">No matches — try card ID below.</p>
        ) : null}
      </div>

      <label className="mu-editor__label mu-editor__label--compact" htmlFor={idInputId}>
        Or card ID
      </label>
      <input
        id={idInputId}
        className="mu-editor__input mu-editor__input--mono"
        type="text"
        value={cardId}
        onChange={(e) => onCardIdChange(e.target.value)}
        onBlur={onIdBlur}
        placeholder="OP01-001"
        spellCheck={false}
      />

      {lookupError ? <p className="mu-editor__card-pick-error">{lookupError}</p> : null}
    </div>
  )
}
