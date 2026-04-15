/**
 * Fetches all card data from optcgapi.com and writes it to src/data/cards.json.
 * Run with: node scripts/fetch-cards.mjs
 */
import { writeFileSync } from 'node:fs'

const BASE = 'https://optcgapi.com'
const OUT = 'src/data/cards.json'
const FIELDS = ['card_set_id', 'card_name', 'card_image', 'set_id', 'card_type', 'card_color']

async function fetchAll(path) {
  console.log(`Fetching ${BASE}${path} ...`)
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${path} returned HTTP ${res.status}`)
  return res.json()
}

function pick(row) {
  return Object.fromEntries(FIELDS.map((f) => [f, row[f] ?? null]))
}

const [setCards, stCards] = await Promise.all([
  fetchAll('/api/allSetCards/'),
  fetchAll('/api/allSTCards/'),
])

// Dedupe by card_set_id — keep first occurrence (base art before parallels)
const map = new Map()
for (const row of [...setCards, ...stCards]) {
  if (!row.card_set_id || !row.card_name || !row.card_image) continue
  if (!map.has(row.card_set_id)) map.set(row.card_set_id, pick(row))
}

const cards = Array.from(map.values())
writeFileSync(OUT, JSON.stringify(cards))
console.log(`Wrote ${cards.length} cards to ${OUT}`)
