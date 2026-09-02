import {
  emptySide,
  emptyTurn,
  type CounterEntry,
  type EditorActionLine,
  type EditorMatchup,
  type EditorSide,
  type EditorSideJoin,
} from '../editor/model'
import { apiCardColorToDeckColors } from './apiCardColor'
import { getCardBySetId } from './optcgApi'

const ZWSP = /\u200b/g
const MARKUP = /<mark><link="([^"]+)">[^<]*<\/link><\/mark>/g
const BOLD = /<\/?b>/g
const CARD_REF = /\["?([A-Z0-9]+-\d+)"?>(?:[A-Z0-9]+-\d+)?\]?/g
const PLAYER_ONLINE = /^\[([^#\]]+)#(\d+)\] (.*)$/
const PLAYER_LOCAL = /^\[(You|Opponent)\] (.*)$/
const CONNECT = /^(.+#\d+) Has Connected$/
const DEPLOY = /^Deploy (.+) \[([A-Z0-9]+-\d+)\]$/
const EFFECT_DEPLOY =
  /^.+ \[([A-Z0-9]+-\d+)\]: Deploy(?:ed)? (.+) \[([A-Z0-9]+-\d+)\](?: from Trash)?$/
const EFFECT = /^(.+) \[([A-Z0-9]+-\d+)\]: (.*)$/
const TRASH = /^Trash (.+) \[([A-Z0-9]+-\d+)\]$/
const CARD_ID = /\[([A-Z0-9]+-\d+)\]/
const ATTACK = /^(.+) \[([A-Z0-9]+-\d+)\] attacking (.+) \[([A-Z0-9]+-\d+)\]$/
const VS = /^(.+) \[([A-Z0-9]+-\d+)\]\[(\d+)\] vs (.+) \[([A-Z0-9]+-\d+)\]\[(\d+)\]$/
const DESTROYED = /^(.+) \[([A-Z0-9]+-\d+)\] Destroyed$/
const HIT = /^(.+) \[([A-Z0-9]+-\d+)\] hit for (\d+) damage$/
const DISCARD = /^Discard (.+) \[([A-Z0-9]+-\d+)\] for Counter(?: (\d+))?$/
const DRAW_DON = /^Draw (\d+) Don$/
const LIFE = /^Life: (\d+)$/
const HAND = /^Hand(?: after Mulligan)?: \[(.*)\]$/i
const ANON_HAND = /^\[\] Hand(?: after Mulligan)?: \[(.*)\]$/i
const ANON_LIFE = /^\[\] Life: (\d+)$/
const VERSION = /^Version is (.+)$/
const RZ1_PLY = /^RZ1\|PLY\|(\d+)\|([^|]*)\|([A-Z0-9]+-\d+)$/

const YOU_ID = 'You#1'
const OPPONENT_ID = 'Opponent#2'

type PlayerId = string

type PlaySlot = { id: string; title: string; via?: EditorSideJoin }

type TurnAcc = {
  first: PlaySlot[]
  second: PlaySlot[]
  firstActions: EditorActionLine[]
  secondActions: EditorActionLine[]
  firstDon?: number
  secondDon?: number
  firstLife?: number
  secondLife?: number
  firstHand?: string[]
  secondHand?: string[]
}

type CombatPending = {
  side: 'first' | 'second'
  attacker: string
  attackerId: string
  defender: string
  defenderId: string
  atkPow?: string
  defPow?: string
  counters: CounterEntry[]
}

const SKIP_EFFECT = /^(Activate \d+ Don|Can't play Cost|Can't Activate Don|Set .+ to Active)/i

function stripLog(raw: string): string {
  return raw
    .replace(ZWSP, '')
    .replace(MARKUP, '$1')
    .replace(BOLD, '')
    .replace(CARD_REF, '[$1]')
}

function parsePlayerLine(ln: string): { who: PlayerId; body: string } | null {
  const online = ln.match(PLAYER_ONLINE)
  if (online) return { who: playerId(online[1], online[2]), body: online[3] }
  const local = ln.match(PLAYER_LOCAL)
  if (local) {
    return {
      who: local[1] === 'You' ? YOU_ID : OPPONENT_ID,
      body: local[2],
    }
  }
  return null
}

function localPlayerId(slot: number): PlayerId {
  return slot === 1 ? YOU_ID : OPPONENT_ID
}

export function looksLikeCombatLog(raw: string): boolean {
  const t = stripLog(raw)
  return /Leader is /.test(t) && (/Has Connected/.test(t) || /\bEnd Turn\b/.test(t) || /\bDeploy /.test(t))
}

export class CombatLogParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CombatLogParseError'
  }
}

function playerId(name: string, num: string): PlayerId {
  return `${name}#${num}`
}

function displayName(id: PlayerId): string {
  return id.replace(/#\d+$/, '')
}

function leaderLabel(cardId: string, fallback: string): string {
  const row = getCardBySetId(cardId)
  if (!row) return fallback
  return row.card_name.replace(/\s+-\s+[A-Z0-9]+-\d+\s*$/, '')
}

function colorWord(cardId: string): string {
  const row = getCardBySetId(cardId)
  if (!row?.card_color) return ''
  return row.card_color.replace(/\s*\/\s*/g, ' ')
}

function cleanCardName(raw: string): string {
  return raw
    .replace(/\s+-\s+[A-Z0-9]+-\d+\s*$/, '')
    .replace(/\s*\(\d+\)\s*(\(Alternate Art\))?$/i, '')
    .trim()
}

function shortCharacterName(name: string): string {
  const cleaned = cleanCardName(name)
  const parts = cleaned.split(/\s+/).filter(Boolean)

  if (/\d$/.test(cleaned)) return cleaned
  if (/^(Pirate|Gum-Gum|Instead|When|You|Off|On|If|I[''])/i.test(cleaned)) return cleaned
  if (cleaned.includes('&')) return cleaned

  if (
    parts.length >= 2 &&
    /^(Dracule|Roronoa|Kouzuki|Trafalgar|Jewelry|Monkey|Portgas|Tony|Nico|Jaguar|Miss|Mr\.)/i.test(
      parts[0],
    )
  ) {
    return parts[parts.length - 1]
  }

  return cleaned
}

function normalizeName(name: string): string {
  return cleanCardName(name).replace(/\./g, ' ')
}

function cardLabel(cardId: string, rawName: string, leaderIds: Set<string>): string {
  const row = cardId ? getCardBySetId(cardId) : null
  const name = normalizeName(row ? row.card_name : rawName)
  const isLeader = cardId ? leaderIds.has(cardId) : false
  const type = row?.card_type?.toLowerCase()

  if (isLeader) return `${shortCharacterName(name)} (leader)`
  if (type === 'event' || type === 'stage') return cleanCardName(row?.card_name ?? rawName)

  return shortCharacterName(name)
}

function cardLabelFromRaw(raw: string, leaderIds: Set<string>): string {
  const idMatch = raw.match(CARD_ID)
  const rawName = raw.replace(CARD_ID, '').replace(/[\[\]]/g, '').trim()
  return cardLabel(idMatch?.[1] ?? '', rawName, leaderIds)
}

function combatLabels(
  atkId: string,
  atkName: string,
  defId: string,
  defName: string,
  leaderIds: Set<string>,
): [string, string] {
  let atk = cardLabel(atkId, atkName, leaderIds)
  let def = cardLabel(defId, defName, leaderIds)
  if (atk === def) {
    const aNum = atkId.match(/-(\d+)$/)?.[1]
    const dNum = defId.match(/-(\d+)$/)?.[1]
    if (aNum) atk = `${atk} (${aNum})`
    if (dNum) def = `${def} (${dNum})`
  }
  return [atk, def]
}

function fmtPower(n: string): string {
  const num = Number(n)
  if (!Number.isFinite(num)) return n
  return num.toLocaleString('en-US')
}

function parseHandList(raw: string): string[] {
  if (!raw.trim()) return []
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

function sideFromPlays(
  plays: PlaySlot[],
  actions: EditorActionLine[],
  don: number | undefined,
  hand: string[] | undefined,
): EditorSide {
  const cards = plays.map((p) => ({ id: p.id, title: p.title }))
  const joins: EditorSideJoin[] = plays.slice(1).map((p) => p.via ?? 'and')
  return { ...emptySide(), cards, joins, callout: '', actions, don, hand }
}

function prettyEffect(body: string, leaderIds: Set<string>): string | null {
  if (SKIP_EFFECT.test(body)) return null

  if (/^Trash \d+ Remaining Cards$/i.test(body)) return 'trashes remaining cards'
  if (/^Rest (\d+ )?Don/i.test(body)) {
    const n = body.match(/^Rest (\d+) Don/)?.[1]
    return n ? `rests ${n} DON!!` : 'rests DON!!'
  }
  if (/^Draw (\d+) Card/.test(body)) return `draws ${body.match(/^Draw (\d+)/)?.[1]}`
  if (/^Trash /.test(body)) {
    const rest = body.slice(6)
    if (!CARD_ID.test(rest)) return 'trashes cards'
    return `trashes ${cardLabelFromRaw(rest, leaderIds)}`
  }
  if (/^Return /.test(body)) {
    return `returns ${cardLabelFromRaw(body.replace(/^Return /, '').replace(/ to Hand$/, ''), leaderIds)} to hand`
  }
  if (/Reveal and Draw/.test(body)) {
    const inner = body.replace(/^.*?Reveal and Draw\s*/, '')
    return `looks at 5, adds ${cardLabelFromRaw(inner, leaderIds)}`
  }
  if (/^Grant /.test(body)) return body.replace(/^Grant /, 'grants ').replace(/\s*\[[A-Z0-9]+-\d+\]/g, '')
  if (/^Destroy /.test(body)) return `destroys ${cardLabelFromRaw(body.slice(8), leaderIds)}`
  if (/^Buff /.test(body)) return null
  if (/Activate Counter/i.test(body)) return 'counters'
  if (/will not Activate/i.test(body)) return body.replace(/\s*\[[A-Z0-9]+-\d+\]/g, '')
  if (/can't be rested/i.test(body)) return null
  return body.replace(/\s*\[[A-Z0-9]+-\d+\]/g, '').trim() || null
}

function pushAction(
  acc: TurnAcc,
  side: 'first' | 'second',
  line: EditorActionLine,
): void {
  const list = side === 'first' ? acc.firstActions : acc.secondActions
  list.push(line)
}

function flushCombat(
  acc: TurnAcc,
  pending: CombatPending | null,
  outcome: string,
  kind: EditorActionLine['kind'],
  leaderIds: Set<string>,
): CombatPending | null {
  if (!pending) return null
  const [atk, def] = combatLabels(
    pending.attackerId,
    pending.attacker,
    pending.defenderId,
    pending.defender,
    leaderIds,
  )
  const atkP = pending.atkPow ? ` ${fmtPower(pending.atkPow)}` : ''
  const defP = pending.defPow ? ` ${fmtPower(pending.defPow)}` : ''
  pushAction(acc, pending.side, {
    kind,
    text: `${atk}${atkP} vs ${def}${defP}`,
    outcome,
    counters: pending.counters.length > 0 ? pending.counters : undefined,
  })
  return null
}

/**
 * Convert an OPTCG Sim `.log` replay into editor state.
 */
export function combatLogToEditorMatchup(raw: string, sourceLabel?: string): EditorMatchup {
  if (!looksLikeCombatLog(raw)) {
    throw new CombatLogParseError('This does not look like an OPTCG Sim combat log.')
  }
  const lines = stripLog(raw).split(/\r?\n/)
  const human = lines.filter((ln) => !ln.startsWith('RZ1|'))

  const connects: PlayerId[] = []
  const leaders = new Map<PlayerId, string>()
  const leaderNames = new Map<PlayerId, string>()
  let choseSecond: PlayerId | null = null
  let choseFirst: PlayerId | null = null
  let firstDonPlayer: PlayerId | null = null
  let version = ''
  let roomId = ''

  let sawLocalPlayers = false

  for (const ln of lines) {
    const ply = ln.match(RZ1_PLY)
    if (ply?.[3]) {
      const slotName = ply[2].replace(ZWSP, '').trim()
      const who = slotName ? slotName : localPlayerId(Number(ply[1]))
      if (!leaders.has(who)) {
        leaders.set(who, ply[3])
        leaderNames.set(who, leaderLabel(ply[3], ply[3]))
      }
    }
  }

  for (const ln of human) {
    const room = ln.match(/Room ID:([A-Z0-9]+)/i)
    if (room) roomId = room[1]
    const ver = ln.match(VERSION)
    if (ver) version = ver[1].trim()

    const connected = ln.match(CONNECT)
    if (connected) {
      connects.push(connected[1])
      continue
    }

    const parsed = parsePlayerLine(ln)
    if (!parsed) continue
    const { who, body } = parsed

    if (who === YOU_ID || who === OPPONENT_ID) sawLocalPlayers = true

    if (!firstDonPlayer && DRAW_DON.test(body)) firstDonPlayer = who

    if (body.startsWith('Leader is ')) {
      const idMatch = body.match(CARD_ID)
      if (idMatch) {
        leaders.set(who, idMatch[1])
        const name = body.replace(/^Leader is /, '').replace(/ \[[A-Z0-9]+-\d+\]$/, '')
        leaderNames.set(who, name)
      }
    }
    if (body.includes('Chose to go Second')) choseSecond = who
    if (body.includes('Chose to go First')) choseFirst = who
  }

  if (leaders.size === 0) {
    throw new CombatLogParseError('No leaders found in this combat log.')
  }

  const isLocalMatch = sawLocalPlayers

  let first: PlayerId
  let second: PlayerId

  if (isLocalMatch) {
    if (firstDonPlayer === OPPONENT_ID) {
      first = OPPONENT_ID
      second = YOU_ID
    } else {
      first = YOU_ID
      second = OPPONENT_ID
    }
  } else {
    first =
      choseFirst ??
      connects.find((id) => id !== choseSecond) ??
      connects[0] ??
      'Player 1#0'
    second =
      choseSecond ??
      connects.find((id) => id !== first) ??
      connects[1] ??
      'Player 2#0'
  }

  const inPlay: Record<string, Set<string>> = {
    [first]: new Set(leaders.get(first) ? [leaders.get(first)!] : []),
    [second]: new Set(leaders.get(second) ? [leaders.get(second)!] : []),
  }
  const donPool: Record<string, number> = { [first]: 0, [second]: 0 }
  const life: Record<string, number> = { [first]: 5, [second]: 5 }
  const ownerOfLeader = new Map<string, PlayerId>()
  for (const [pid, lid] of leaders) ownerOfLeader.set(lid, pid)
  const leaderIds = new Set(leaders.values())

  const emptyAcc = (): TurnAcc => ({
    first: [],
    second: [],
    firstActions: [],
    secondActions: [],
  })

  const turns: TurnAcc[] = [emptyAcc()]
  turns[0].firstLife = 5
  turns[0].secondLife = 5

  let started = false
  let turn = 0
  let current: PlayerId = first
  let pending: CombatPending | null = null
  let lastEffectSource: { side: 'first' | 'second'; id: string } | null = null
  let concededBy: PlayerId | null = null
  /** Who leads the next `[] Hand` / `[] Life` pair (set on End Turn). */
  let snapshotPairLead: 'first' | 'second' | null = null
  /** 0 = first block in pair, 1 = second block. */
  let snapshotBlockIndex = 0
  /** Player for the in-progress `[] Hand` … `[] Life` block. */
  let activeSnapshotPlayer: 'first' | 'second' | null = null

  const sideOf = (who: PlayerId): 'first' | 'second' => (who === first ? 'first' : 'second')

  const otherSide = (side: 'first' | 'second'): 'first' | 'second' =>
    side === 'first' ? 'second' : 'first'

  const snapshotLead = (): 'first' | 'second' => snapshotPairLead ?? sideOf(current)

  const snapshotBlockSide = (): 'first' | 'second' => {
    const lead = snapshotLead()
    return snapshotBlockIndex === 0 ? lead : otherSide(lead)
  }

  const finishSnapshotBlock = () => {
    snapshotBlockIndex += 1
    if (snapshotBlockIndex >= 2) {
      snapshotBlockIndex = 0
      snapshotPairLead = null
    }
    activeSnapshotPlayer = null
  }

  const syncTurnLife = () => {
    const acc = turns[turn]
    if (!acc) return
    acc.firstLife = life[first]
    acc.secondLife = life[second]
  }

  const applyLife = (side: 'first' | 'second', value: number) => {
    const who = side === 'first' ? first : second
    life[who] = value
    syncTurnLife()
  }

  const setHand = (side: 'first' | 'second', ids: string[]) => {
    const acc = turns[turn]
    if (side === 'first') acc.firstHand = ids
    else acc.secondHand = ids
  }

  const playsOf = (acc: TurnAcc, side: 'first' | 'second') => (side === 'first' ? acc.first : acc.second)

  for (const ln of human) {
    const parsed = parsePlayerLine(ln)
    const body = parsed?.body ?? ln
    const who = parsed?.who ?? null

    const anonHand = ln.match(ANON_HAND)
    if (anonHand) {
      activeSnapshotPlayer = snapshotBlockSide()
      setHand(activeSnapshotPlayer, parseHandList(anonHand[1]))
      continue
    }

    const anonLife = ln.match(ANON_LIFE)
    if (anonLife) {
      const side = activeSnapshotPlayer ?? snapshotBlockSide()
      applyLife(side, Number(anonLife[1]))
      finishSnapshotBlock()
      continue
    }

    if (!started) {
      if (who && DRAW_DON.test(body)) {
        started = true
        current = who
      } else {
        const lifeM = body.match(LIFE)
        if (who && lifeM) applyLife(sideOf(who), Number(lifeM[1]))
        continue
      }
    }

    if (body === 'End Turn') {
      pending = flushCombat(turns[turn], pending, 'fail', 'combat', leaderIds)
      lastEffectSource = null
      if (who) {
        snapshotPairLead = sideOf(who)
        snapshotBlockIndex = 0
      }
      current = current === first ? second : first
      if (current === first) {
        turn += 1
        turns.push(emptyAcc())
        syncTurnLife()
      }
      continue
    }

    if (body.includes('Concedes!')) {
      concededBy = who
      if (who) {
        pushAction(turns[turn], sideOf(who), {
          kind: 'concede',
          text: `${displayName(who)} concedes`,
        })
      }
      break
    }

    const lifeM = body.match(LIFE)
    if (who && lifeM) {
      applyLife(sideOf(who), Number(lifeM[1]))
      continue
    }

    const handM = body.match(HAND)
    if (handM && who) {
      setHand(sideOf(who), parseHandList(handM[1]))
      continue
    }

    const acc = turns[turn]
    const activeSide = sideOf(current)

    const donM = body.match(DRAW_DON)
    if (who && donM) {
      donPool[who] = (donPool[who] ?? 0) + Number(donM[1])
      if (sideOf(who) === 'first') acc.firstDon = donPool[who]
      else acc.secondDon = donPool[who]
      continue
    }

    const vs = body.match(VS)
    if (vs && pending) {
      pending.attacker = vs[1]
      pending.attackerId = vs[2]
      pending.atkPow = vs[3]
      pending.defender = vs[4]
      pending.defenderId = vs[5]
      pending.defPow = vs[6]
      continue
    }

    const hit = body.match(HIT)
    if (hit) {
      pending = flushCombat(acc, pending, `+${hit[3]} damage`, 'damage', leaderIds)
      continue
    }

    if (body === 'Attack Fails') {
      pending = flushCombat(acc, pending, 'fail', 'combat', leaderIds)
      continue
    }

    const destroyed = body.match(DESTROYED)
    if (destroyed) {
      pending = flushCombat(acc, pending, 'K.O.', 'ko', leaderIds)
      continue
    }

    const attack = body.match(ATTACK)
    if (attack && who) {
      pending = flushCombat(acc, pending, 'fail', 'combat', leaderIds)
      pending = {
        side: activeSide,
        attacker: attack[1],
        attackerId: attack[2],
        defender: attack[3],
        defenderId: attack[4],
        counters: [],
      }
      continue
    }

    const discard = body.match(DISCARD)
    if (discard && who) {
      const counterValue = discard[3] ? Number(discard[3]) : undefined
      const entry: CounterEntry = {
        cardId: discard[2],
        cardTitle: discard[1],
        counterValue: Number.isFinite(counterValue) ? counterValue : undefined,
      }
      if (pending) {
        pending.counters.push(entry)
      } else {
        pushAction(acc, sideOf(who), {
          kind: 'counter',
          text: counterValue
            ? `Counter +${counterValue.toLocaleString('en-US')}`
            : 'Counter',
          ...entry,
        })
      }
      continue
    }

    if (!who) continue

    if (who === current) {
      const deploy = body.match(DEPLOY)
      if (deploy) {
        const list = playsOf(acc, activeSide)
        list.push({
          title: deploy[1],
          id: deploy[2],
          via: list.length ? 'and' : undefined,
        })
        inPlay[who]?.add(deploy[2])
        lastEffectSource = null
        continue
      }

      const effectDeploy = body.match(EFFECT_DEPLOY)
      if (effectDeploy) {
        const list = playsOf(acc, activeSide)
        list.push({
          title: effectDeploy[2],
          id: effectDeploy[3],
          via: 'effect',
        })
        inPlay[who]?.add(effectDeploy[3])
        continue
      }

      const trash = body.match(TRASH)
      if (trash) {
        pushAction(acc, activeSide, {
          kind: 'note',
          text: `trashes ${cardLabel(trash[2], trash[1], leaderIds)}`,
        })
        continue
      }
    }

    const effect = body.match(EFFECT)
    if (effect) {
      const title = effect[1]
      const cardId = effect[2]
      const pretty = prettyEffect(effect[3], leaderIds)
      if (!pretty) continue

      if (who === current && cardId !== leaders.get(who) && !inPlay[who]?.has(cardId)) {
        const list = playsOf(acc, activeSide)
        if (!list.some((p) => p.id === cardId)) {
          list.push({ title, id: cardId, via: list.length ? 'and' : undefined })
        }
      }

      const kind: EditorActionLine['kind'] =
        lastEffectSource?.side === activeSide && lastEffectSource.id === cardId ? 'sub' : 'effect'
      const label = cardLabel(cardId, title, leaderIds)
      pushAction(acc, activeSide, {
        kind,
        text: kind === 'sub' ? pretty : `${label} ${pretty}`,
      })
      lastEffectSource = { side: activeSide, id: cardId }
    }
  }

  if (!started) {
    throw new CombatLogParseError('Could not find any turns in this combat log.')
  }

  while (
    turns.length > 1 &&
    turns[turns.length - 1].first.length === 0 &&
    turns[turns.length - 1].second.length === 0 &&
    turns[turns.length - 1].firstActions.length === 0 &&
    turns[turns.length - 1].secondActions.length === 0
  ) {
    turns.pop()
  }

  const firstLeader = leaders.get(first) ?? ''
  const secondLeader = leaders.get(second) ?? ''
  const firstLeaderName = leaderNames.get(first) ?? 'Leader'
  const secondLeaderName = leaderNames.get(second) ?? 'Leader'
  const firstRow = getCardBySetId(firstLeader)
  const secondRow = getCardBySetId(secondLeader)

  const leftTitle = [colorWord(firstLeader), shortCharacterName(normalizeName(firstLeaderName))].filter(Boolean).join(' ')
  const rightTitle = [colorWord(secondLeader), shortCharacterName(normalizeName(secondLeaderName))].filter(Boolean).join(' ')
  const matchupTitle = `${leftTitle} versus ${rightTitle}`

  const summaryParts = [
    version ? `v${version}` : '',
    roomId ? `Room ${roomId}` : '',
    concededBy ? `${displayName(concededBy)} concedes` : '',
    sourceLabel ?? '',
  ].filter(Boolean)

  return {
    title: matchupTitle,
    summary: summaryParts.join(' · ') || undefined,
    firstDeck: {
      leaderCardId: firstLeader,
      name: `${leaderLabel(firstLeader, firstLeaderName)}`,
      subtitle: firstLeader,
      colors: apiCardColorToDeckColors(firstRow?.card_color ?? 'Green'),
    },
    secondDeck: {
      leaderCardId: secondLeader,
      name: `${leaderLabel(secondLeader, secondLeaderName)}`,
      subtitle: secondLeader,
      colors: apiCardColorToDeckColors(secondRow?.card_color ?? 'Green'),
    },
    goingFirst: 'firstDeck',
    turns:
      turns.length === 0
        ? [emptyTurn()]
        : turns.map((t) => ({
            first: sideFromPlays(t.first, t.firstActions, t.firstDon, t.firstHand),
            second: sideFromPlays(t.second, t.secondActions, t.secondDon, t.secondHand),
            firstLife: t.firstLife,
            secondLife: t.secondLife,
          })),
  }
}
