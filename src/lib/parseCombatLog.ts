import {
  emptySide,
  emptyTurn,
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
}

type CombatPending = {
  side: 'first' | 'second'
  attacker: string
  attackerId: string
  defender: string
  defenderId: string
  atkPow?: string
  defPow?: string
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

function shortName(name: string, isLeader: boolean): string {
  const cleaned = name.replace(/\s+-\s+[A-Z0-9].*$/, '').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  let base = cleaned
  if (parts.length > 2 && !cleaned.includes('&')) base = parts[parts.length - 1]
  else if (parts.length === 2 && /^(Dracule|Roronoa|Kouzuki|Trafalgar|Jewelry|Monkey)/i.test(parts[0])) {
    base = parts[1]
  }
  return isLeader ? `${base} (leader)` : base
}

function fmtPower(n: string): string {
  const num = Number(n)
  if (!Number.isFinite(num)) return n
  return num.toLocaleString('en-US')
}

function sideFromPlays(
  plays: PlaySlot[],
  actions: EditorActionLine[],
  don: number | undefined,
): EditorSide {
  const cards = plays.map((p) => ({ id: p.id, title: p.title }))
  const joins: EditorSideJoin[] = plays.slice(1).map((p) => p.via ?? 'and')
  return { ...emptySide(), cards, joins, callout: '', actions, don }
}

function isLeaderId(id: string, leaders: Map<PlayerId, string>): boolean {
  return [...leaders.values()].includes(id)
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
): CombatPending | null {
  if (!pending) return null
  const atk = shortName(pending.attacker, false)
  const def = shortName(pending.defender, false)
  const atkP = pending.atkPow ? ` ${fmtPower(pending.atkPow)}` : ''
  const defP = pending.defPow ? ` ${fmtPower(pending.defPow)}` : ''
  pushAction(acc, pending.side, {
    kind,
    text: `${atk}${atkP} vs ${def}${defP}`,
    outcome,
  })
  return null
}

function prettyEffect(body: string, leaders: Map<PlayerId, string>): string | null {
  if (SKIP_EFFECT.test(body)) return null
  const idOf = (raw: string) => {
    const m = raw.match(CARD_ID)
    return m ? m[1] : ''
  }
  const nameOf = (raw: string) =>
    shortName(raw.replace(CARD_ID, '').replace(/[\[\]]/g, '').trim(), isLeaderId(idOf(raw), leaders))

  if (/^Rest /.test(body)) return `rests ${nameOf(body.slice(5))}`
  if (/^Draw (\d+) Card/.test(body)) return `draws ${body.match(/^Draw (\d+)/)?.[1]}`
  if (/^Trash /.test(body)) return `trashes ${nameOf(body.slice(6))}`
  if (/^Return /.test(body)) return `returns ${nameOf(body.replace(/^Return /, '').replace(/ to Hand$/, ''))} to hand`
  if (/Reveal and Draw/.test(body)) {
    const inner = body.replace(/^.*?Reveal and Draw\s*/, '')
    return `looks at 5, adds ${nameOf(inner)}`
  }
  if (/^Grant /.test(body)) return body.replace(/^Grant /, 'grants ').replace(/\s*\[[A-Z0-9]+-\d+\]/g, '')
  if (/^Destroy /.test(body)) return `destroys ${nameOf(body.slice(8))}`
  if (/^Buff /.test(body)) return null
  if (/Activate Counter/i.test(body)) return 'Counter'
  if (/will not Activate/i.test(body)) return body.replace(/\s*\[[A-Z0-9]+-\d+\]/g, '')
  if (/can't be rested/i.test(body)) return null
  return body.replace(/\s*\[[A-Z0-9]+-\d+\]/g, '').trim() || null
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

  for (const ln of lines) {
    const ply = ln.match(RZ1_PLY)
    if (ply?.[3]) {
      const who = localPlayerId(Number(ply[1]))
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

  const isLocalMatch = leaders.has(YOU_ID) || leaders.has(OPPONENT_ID)

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

  const sideOf = (who: PlayerId): 'first' | 'second' => (who === first ? 'first' : 'second')

  const playsOf = (acc: TurnAcc, side: 'first' | 'second') => (side === 'first' ? acc.first : acc.second)

  for (const ln of human) {
    const parsed = parsePlayerLine(ln)
    const body = parsed?.body ?? ln
    const who = parsed?.who ?? null

    if (!started) {
      if (who && DRAW_DON.test(body)) {
        started = true
        current = who
      } else {
        const lifeM = body.match(LIFE)
        if (who && lifeM) life[who] = Number(lifeM[1])
        continue
      }
    }

    if (body === 'End Turn') {
      pending = flushCombat(turns[turn], pending, 'fail', 'combat')
      lastEffectSource = null
      current = current === first ? second : first
      if (current === first) {
        turn += 1
        const next = emptyAcc()
        next.firstLife = life[first]
        next.secondLife = life[second]
        turns.push(next)
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
      life[who] = Number(lifeM[1])
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
      const owner = ownerOfLeader.get(hit[2])
      if (owner) life[owner] = Math.max(0, (life[owner] ?? 5) - Number(hit[3]))
      pending = flushCombat(acc, pending, `+${hit[3]} damage`, 'damage')
      continue
    }

    if (body === 'Attack Fails') {
      pending = flushCombat(acc, pending, 'fail', 'combat')
      continue
    }

    const destroyed = body.match(DESTROYED)
    if (destroyed) {
      pending = flushCombat(acc, pending, 'K.O.', 'ko')
      continue
    }

    const attack = body.match(ATTACK)
    if (attack && who) {
      pending = flushCombat(acc, pending, 'fail', 'combat')
      pending = {
        side: activeSide,
        attacker: attack[1],
        attackerId: attack[2],
        defender: attack[3],
        defenderId: attack[4],
      }
      continue
    }

    const discard = body.match(DISCARD)
    if (discard) {
      pushAction(acc, activeSide, {
        kind: 'sub',
        text: `discards ${shortName(discard[1], false)} for Counter`,
      })
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
          text: `trashes ${shortName(trash[1], false)}`,
        })
        continue
      }
    }

    const effect = body.match(EFFECT)
    if (effect) {
      const title = effect[1]
      const cardId = effect[2]
      const pretty = prettyEffect(effect[3], leaders)
      if (!pretty) continue

      if (who === current && cardId !== leaders.get(who) && !inPlay[who]?.has(cardId)) {
        const list = playsOf(acc, activeSide)
        if (!list.some((p) => p.id === cardId)) {
          list.push({ title, id: cardId, via: list.length ? 'and' : undefined })
        }
      }

      const kind: EditorActionLine['kind'] =
        lastEffectSource?.side === activeSide && lastEffectSource.id === cardId ? 'sub' : 'effect'
      const label = shortName(title, cardId === leaders.get(who))
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

  const leftTitle = [colorWord(firstLeader), shortName(firstLeaderName, false)].filter(Boolean).join(' ')
  const rightTitle = [colorWord(secondLeader), shortName(secondLeaderName, false)].filter(Boolean).join(' ')
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
            first: sideFromPlays(t.first, t.firstActions, t.firstDon),
            second: sideFromPlays(t.second, t.secondActions, t.secondDon),
            firstLife: t.firstLife,
            secondLife: t.secondLife,
          })),
  }
}
