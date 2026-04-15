/**
 * OPTCG card data — served from the bundled static JSON (src/data/cards.json).
 * Refresh the data with: node scripts/fetch-cards.mjs
 */
import cardsRaw from '../data/cards.json'

export type OptcgCardRow = {
  card_set_id: string
  card_name: string
  card_image: string
  set_id?: string | null
  card_type?: string | null
  card_color?: string | null
}

/** Normalize user input to the key form used in the card map (e.g. op01-001 → OP01-001). */
export function normalizeCardSetId(raw: string): string {
  return raw.trim().toUpperCase()
}

const cardMap = new Map<string, OptcgCardRow>(
  (cardsRaw as OptcgCardRow[]).map((c) => [c.card_set_id, c]),
)

export async function searchCardsByName(query: string, limit = 60): Promise<OptcgCardRow[]> {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const results: OptcgCardRow[] = []
  for (const card of cardMap.values()) {
    if (card.card_name.toLowerCase().includes(q)) {
      results.push(card)
      if (results.length >= limit) break
    }
  }
  return results
}

/** Leaders only — for deck leader picker. */
export async function searchLeadersByName(query: string, limit = 24): Promise<OptcgCardRow[]> {
  const rows = await searchCardsByName(query, 120)
  return rows.filter((r) => r.card_type === 'Leader').slice(0, limit)
}

export async function fetchCardBySetId(cardSetId: string): Promise<OptcgCardRow | null> {
  return cardMap.get(normalizeCardSetId(cardSetId)) ?? null
}
