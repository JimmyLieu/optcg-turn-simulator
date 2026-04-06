/**
 * OPTCG API (https://optcgapi.com) — English card data + image URLs.
 * Browser requests go through the Vite dev proxy at /optcgapi to avoid CORS.
 */

export type OptcgCardRow = {
  card_set_id: string
  card_name: string
  card_image: string
  set_id?: string
  card_type?: string
  card_color?: string
}

const DEFAULT_BASE = '/optcgapi'

function apiBase(): string {
  const fromEnv = import.meta.env.VITE_OPTCG_API_BASE as string | undefined
  return (fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_BASE).replace(/\/$/, '')
}

/** Normalize user input to API form (e.g. op01-001 → OP01-001). */
export function normalizeCardSetId(raw: string): string {
  return raw.trim().toUpperCase()
}

function isErrorPayload(data: unknown): data is { error?: string } {
  return typeof data === 'object' && data !== null && 'error' in data && !Array.isArray(data)
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
