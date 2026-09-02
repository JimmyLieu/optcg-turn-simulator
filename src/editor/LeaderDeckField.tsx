import { useCallback, useEffect, useRef, useState } from 'react'
import type { MatchupCurve } from '../types/curve'
import { apiCardColorToDeckColors } from '../lib/apiCardColor'
import type { OptcgCardRow } from '../lib/optcgApi'
import { fetchCardBySetId, searchLeadersByName } from '../lib/optcgApi'
import { CardPreviewFromId, CardSearchResultButton } from './CardPreview'

type Deck = MatchupCurve['firstDeck']

type Props = {
  label: string
  deck: Deck
  onChange: (patch: Partial<Deck>) => void
}

const DEBOUNCE_MS = 320

export function LeaderDeckField({ label, deck, onChange }: Props) {
  const id = deck.leaderCardId?.trim() ?? ''
  const [lookupError, setLookupError] = useState<string | null>(null)

  /** Search box — name lookup */
  const [nameQuery, setNameQuery] = useState(() => deck.name || '')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [results, setResults] = useState<OptcgCardRow[]>([])
  const [searching, setSearching] = useState(false)
  const [listOpen, setListOpen] = useState(false)

  const searchWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(nameQuery.trim()), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [nameQuery])

  useEffect(() => {
    setNameQuery(deck.name || '')
  }, [deck.leaderCardId, deck.name])

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    let cancelled = false
    setSearching(true)
    searchLeadersByName(debouncedQuery).then((rows) => {
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

  const applyLeaderRow = useCallback(
    (cardId: string, row: OptcgCardRow) => {
      if (row.card_type && row.card_type !== 'Leader') {
        setLookupError('Not a Leader — colors still applied')
      } else {
        setLookupError(null)
      }
      onChange({
        leaderCardId: cardId,
        name: row.card_name,
        colors: apiCardColorToDeckColors(row.card_color ?? 'Red'),
      })
      setNameQuery(row.card_name)
      setListOpen(false)
    },
    [onChange],
  )

  const pickRow = (row: OptcgCardRow) => {
    applyLeaderRow(row.card_set_id, row)
  }

  const onIdBlur = () => {
    const raw = deck.leaderCardId?.trim() ?? ''
    setLookupError(null)
    if (!raw) {
      onChange({
        leaderCardId: '',
        name: label,
      })
      setNameQuery('')
      return
    }
    const normalized = raw.toUpperCase()
    fetchCardBySetId(normalized).then((row) => {
      if (row) applyLeaderRow(normalized, row)
      else {
        setLookupError('Card not found')
        onChange({ leaderCardId: normalized })
      }
    })
  }

  return (
    <fieldset className="mu-editor__deck mu-editor__deck--leader">
      <legend>{label}</legend>

      <div className={`mu-editor__leader-frame ${id ? 'has-id' : ''}`}>
        {id ? (
          <CardPreviewFromId cardId={normalizedId(id)} size="lg" />
        ) : (
          <div className="mu-editor__leader-placeholder">
            <span>Search by name or enter ID</span>
          </div>
        )}
      </div>

      <div className="mu-editor__leader-search" ref={searchWrapRef}>
        <label className="mu-editor__label" htmlFor={`leader-search-${label}`}>
          Search leader by name
        </label>
        <input
          id={`leader-search-${label}`}
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
          placeholder="e.g. Zoro, Luffy, Nami"
          spellCheck={false}
        />
        {searching ? (
          <p className="mu-editor__leader-search-meta">Searching…</p>
        ) : null}
        {listOpen && results.length > 0 ? (
          <ul className="mu-editor__leader-results" role="listbox">
            {results.map((row) => (
              <li key={row.card_set_id} role="presentation">
                <CardSearchResultButton row={row} onSelect={() => pickRow(row)} />
              </li>
            ))}
          </ul>
        ) : null}
        {listOpen && !searching && debouncedQuery.length >= 2 && results.length === 0 ? (
          <p className="mu-editor__leader-search-meta">No leaders found — try card ID below.</p>
        ) : null}
      </div>

      <label className="mu-editor__label">
        Or enter card ID
        <input
          className="mu-editor__input mu-editor__input--mono"
          type="text"
          value={deck.leaderCardId ?? ''}
          onChange={(e) => onChange({ leaderCardId: e.target.value })}
          onBlur={onIdBlur}
          placeholder="e.g. OP01-001"
          spellCheck={false}
        />
      </label>

      <p className="mu-editor__leader-name">{deck.name || '—'}</p>

      {lookupError ? <p className="mu-editor__leader-warn">{lookupError}</p> : null}
    </fieldset>
  )
}

function normalizedId(id: string): string {
  return id.trim().toUpperCase()
}
