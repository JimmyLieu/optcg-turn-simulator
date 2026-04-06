/**
 * OPTCG API (https://optcgapi.com) — English card data + image URLs.
 * Browser uses same-origin /api/opcg (Vite proxy in dev, Vercel Edge function in prod).
 */

export type OptcgCardRow = {
  card_set_id: string
  card_name: string
  card_image: string
  set_id?: string
  card_type?: string
  card_color?: string
}

const DEFAULT_BASE = '/api/opcg'

function apiBase(): string {
  const fromEnv = import.meta.env.VITE_OPTCG_API_BASE as string | undefined
  const raw = fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_BASE
  const trimmed = raw.replace(/\/$/, '')
  // In the browser, a full https://optcgapi.com URL hits CORS; use same-origin proxy.
  if (typeof window !== 'undefined' && /^https?:\/\//i.test(trimmed)) {
    return DEFAULT_BASE.replace(/\/$/, '')
  }
  return trimmed
}

/** Normalize user input to API form (e.g. op01-001 → OP01-001). */
export function normalizeCardSetId(raw: string): string {
  return raw.trim().toUpperCase()
}

function isErrorPayload(data: unknown): data is { error?: string } {
  return typeof data === 'object' && data !== null && 'error' in data && !Array.isArray(data)
}

async function fetchJsonArray(path: string): Promise<OptcgCardRow[]> {
  const url = `${apiBase()}${path}`
  try {
    const res = await fetch(url)
    if (!res.ok) return []
    const data: unknown = await res.json()
    if (isErrorPayload(data)) return []
    if (!Array.isArray(data)) return []
    return data as OptcgCardRow[]
  } catch {
    return []
  }
}

/**
 * Name search across booster and starter cards; merged and deduped by `card_set_id`.
 */
export async function searchCardsByName(query: string, limit = 60): Promise<OptcgCardRow[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const [fromSets, fromDecks] = await Promise.all([
    fetchJsonArray(`/api/sets/filtered/?card_name=${encodeURIComponent(q)}`),
    fetchJsonArray(`/api/decks/filtered/?card_name=${encodeURIComponent(q)}`),
  ])
  const map = new Map<string, OptcgCardRow>()
  for (const row of [...fromSets, ...fromDecks]) {
    if (!row.card_set_id || !row.card_name) continue
    if (!map.has(row.card_set_id)) map.set(row.card_set_id, row)
  }
  return Array.from(map.values()).slice(0, limit)
}

/** Leaders only — for deck leader picker. */
export async function searchLeadersByName(query: string, limit = 24): Promise<OptcgCardRow[]> {
  const rows = await searchCardsByName(query, 120)
  const leaders = rows.filter((r) => r.card_type === 'Leader')
  return leaders.slice(0, limit)
}

async function fetchCardList(path: string): Promise<OptcgCardRow[] | null> {
  const url = `${apiBase()}${path}`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data: unknown = await res.json()
    if (isErrorPayload(data)) return null
    if (!Array.isArray(data) || data.length === 0) return null
    const first = data[0] as Partial<OptcgCardRow>
    if (!first.card_image || !first.card_name) return null
    return data as OptcgCardRow[]
  } catch {
    return null
  }
}

/**
 * Returns the primary printing (index 0 — base art before parallels when both exist).
 */
export async function fetchCardBySetId(cardSetId: string): Promise<OptcgCardRow | null> {
  const id = normalizeCardSetId(cardSetId)
  const fromSet = await fetchCardList(`/api/sets/card/${encodeURIComponent(id)}/`)
  if (fromSet?.length) return fromSet[0]
  const fromDeck = await fetchCardList(`/api/decks/card/${encodeURIComponent(id)}/`)
  if (fromDeck?.length) return fromDeck[0]
  return null
}

const inflight = new Map<string, Promise<OptcgCardRow | null>>()

export function fetchCardBySetIdDeduped(cardSetId: string): Promise<OptcgCardRow | null> {
  const id = normalizeCardSetId(cardSetId)
  const existing = inflight.get(id)
  if (existing) return existing
  const p = fetchCardBySetId(id).finally(() => {
    inflight.delete(id)
  })
  inflight.set(id, p)
  return p
}
