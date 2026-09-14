import { CombatLogParseError, looksLikeCombatLog } from '../lib/parseCombatLog'
import { getCardBySetId } from '../lib/optcgApi'
import type {
  ReplayAction,
  ReplayActionKind,
  ReplayFrame,
  ReplayPlayerState,
  ReplaySession,
} from './model'

const ZWSP = /\u200b/g
const MARKUP = /<mark><link="([^"]+)">[^<]*<\/link><\/mark>/g
const BOLD = /<\/?b>/g
const CARD_REF = /\["?([A-Z0-9]+-\d+)"?>(?:[A-Z0-9]+-\d+)?\]?/g
const PLAYER_ONLINE = /^\[([^#\]]+)#(\d+)\] (.*)$/
const PLAYER_LOCAL = /^\[(You|Opponent)\] (.*)$/
const CONNECT = /^(.+#\d+) Has Connected$/
const CARD_ID = /\[([A-Z0-9]+-\d+)\]/
const DRAW_DON = /^Draw (\d+) Don$/
const DRAW_N = /^Draw (\d+) Card/
const DREW = /^Drew card from deck: (.+) \[([A-Z0-9]+-\d+)\]$/
const DEPLOY = /^Deploy (.+) \[([A-Z0-9]+-\d+)\]$/
const EFFECT_DEPLOY =
  /^.+ \[([A-Z0-9]+-\d+)\]: Deploy(?:ed)? (.+) \[([A-Z0-9]+-\d+)\](?: from Trash)?$/
const EFFECT = /^(.+) \[([A-Z0-9]+-\d+)\]: (.*)$/
const ATTACK = /^(.+) \[([A-Z0-9]+-\d+)\] attacking (.+) \[([A-Z0-9]+-\d+)\]$/
const VS = /^(.+) \[([A-Z0-9]+-\d+)\]\[(\d+)\] vs (.+) \[([A-Z0-9]+-\d+)\]\[(\d+)\]$/
const DESTROYED = /^(.+) \[([A-Z0-9]+-\d+)\] Destroyed$/
const HIT = /^(.+) \[([A-Z0-9]+-\d+)\] hit for (\d+) damage$/
const DISCARD = /^Discard (.+) \[([A-Z0-9]+-\d+)\] for Counter(?: (\d+))?$/
const ATTACH = /^Attach (\d+) Don to (.+) \[([A-Z0-9]+-\d+)\]/
const LIFE = /^Life: (\d+)$/
const HAND = /^Hand(?: after Mulligan)?: \[(.*)\]$/i
const BOARD = /^Board: \[(.*)\]$/i
const TRASH_LINE = /^Trash: \[(.*)\]$/i
const RZ1_PLY = /^RZ1\|PLY\|(\d+)\|([^|]*)\|([A-Z0-9]+-\d+)$/

const YOU_ID = 'You#1'
const OPPONENT_ID = 'Opponent#2'

const SKIP_EFFECT =
  /^(Activate \d+ Don|Can't play Cost|Can't Activate Don|Set .+ to Active|Buff )/i

type PlayerId = string

type LiveState = {
  hand: string[]
  board: string[]
  trash: string[]
  life: number
  don: number
}

function stripLog(raw: string): string {
  return raw
    .replace(ZWSP, '')
    .replace(MARKUP, '$1')
    .replace(BOLD, '')
    .replace(CARD_REF, '[$1]')
}

function playerId(name: string, num: string): PlayerId {
  return `${name}#${num}`
}

function displayName(id: PlayerId): string {
  return id.replace(/#\d+$/, '')
}

function localPlayerId(slot: number): PlayerId {
  return slot === 1 ? YOU_ID : OPPONENT_ID
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

function parseIdList(raw: string): string[] {
  if (!raw.trim()) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[A-Z0-9]+-\d+$/i.test(s))
    .map((s) => s.toUpperCase())
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

function shortName(name: string): string {
  const cleaned = name
    .replace(/\s+-\s+[A-Z0-9]+-\d+\s*$/, '')
    .replace(/\s*\(\d+\)\s*(\(Alternate Art\))?$/i, '')
    .trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (
    parts.length >= 2 &&
    /^(Dracule|Roronoa|Kouzuki|Trafalgar|Jewelry|Monkey|Portgas|Tony|Nico|Jaguar)/i.test(parts[0])
  ) {
    return parts[parts.length - 1]
  }
  if (parts.length >= 3) return parts.slice(-2).join(' ')
  return cleaned
}

function cardLabel(id: string, title: string): string {
  const row = getCardBySetId(id)
  const name = row?.card_name ?? title
  return shortName(name)
}

function fmtPower(raw: string): string {
  const n = Number(raw)
  return Number.isFinite(n) ? n.toLocaleString('en-US') : raw
}

function emptyLive(): LiveState {
  return { hand: [], board: [], trash: [], life: 5, don: 0 }
}

function clonePlayer(id: PlayerId, leaderId: string, live: LiveState): ReplayPlayerState {
  return {
    playerId: id,
    displayName: displayName(id),
    leaderId,
    life: live.life,
    don: live.don,
    hand: [...live.hand],
    board: [...live.board],
    trash: [...live.trash],
  }
}

function ensureLive(map: Map<PlayerId, LiveState>, id: PlayerId): LiveState {
  let live = map.get(id)
  if (!live) {
    live = emptyLive()
    map.set(id, live)
  }
  return live
}

function actionKindFromEffect(body: string): ReplayActionKind {
  if (/Reveal and Draw|Look at|Search/i.test(body)) return 'search'
  if (/^Draw \d+ Card/i.test(body)) return 'draw'
  if (/Activate Counter/i.test(body)) return 'counter'
  return 'effect'
}

function prettyEffectBody(body: string): string | null {
  if (SKIP_EFFECT.test(body)) return null
  if (/Reveal and Draw/i.test(body)) {
    const inner = body.replace(/^.*?Reveal and Draw\s*/i, '')
    const id = inner.match(CARD_ID)?.[1]
    const title = inner.replace(/\s*\[[A-Z0-9]+-\d+\].*$/, '').trim()
    return id ? `searches · adds ${cardLabel(id, title || id)}` : 'searches / reveals'
  }
  if (/^Draw (\d+) Card/.test(body)) return `draws ${body.match(/^Draw (\d+)/)?.[1]}`
  if (/^Trash /.test(body)) return `trashes ${body.replace(/^Trash /, '').replace(/\s*\[[A-Z0-9]+-\d+\]/g, '')}`.trim()
  if (/^Rest (\d+ )?Don/i.test(body)) {
    const n = body.match(/^Rest (\d+) Don/)?.[1]
    return n ? `rests ${n} DON!!` : 'rests DON!!'
  }
  if (/Activate Counter/i.test(body)) return 'counters'
  if (/^Destroy /.test(body)) return `destroys ${body.slice(8).replace(/\s*\[[A-Z0-9]+-\d+\]/g, '')}`.trim()
  if (/^Return /.test(body)) return body.replace(/^Return /, 'returns ').replace(/\s*\[[A-Z0-9]+-\d+\]/g, '')
  if (/^Grant /.test(body)) return body.replace(/^Grant /, 'grants ').replace(/\s*\[[A-Z0-9]+-\d+\]/g, '')
  const cleaned = body.replace(/\s*\[[A-Z0-9]+-\d+\]/g, '').trim()
  return cleaned || null
}

let actionSeq = 0
function makeAction(
  kind: ReplayActionKind,
  text: string,
  who: PlayerId | null,
  cardId?: string,
  targetCardId?: string,
): ReplayAction {
  actionSeq += 1
  return {
    id: `a-${actionSeq}`,
    kind,
    playerId: who,
    displayName: who ? displayName(who) : null,
    text,
    cardId,
    targetCardId,
  }
}

/**
 * End-of-turn board snapshots + action log for each frame.
 * Board state is static per frame (does not scrub with individual actions).
 */
export function combatLogToReplaySession(raw: string, sourceLabel?: string): ReplaySession {
  actionSeq = 0
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
  let sawLocalPlayers = false
  const plyNameBySlot = new Map<number, PlayerId>()

  for (const ln of lines) {
    const ply = ln.match(RZ1_PLY)
    if (ply?.[3]) {
      const slot = Number(ply[1])
      const slotName = ply[2].replace(ZWSP, '').trim()
      const who = slotName ? slotName : localPlayerId(slot)
      if (slotName) plyNameBySlot.set(slot, slotName)
      if (!leaders.has(who)) {
        leaders.set(who, ply[3])
        leaderNames.set(who, leaderLabel(ply[3], ply[3]))
      }
    }
  }

  for (const ln of human) {
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

  const playerAlias = new Map<PlayerId, PlayerId>()
  const resolvePlayer = (id: PlayerId): PlayerId => playerAlias.get(id) ?? id

  if (isLocalMatch) {
    for (const [slot, name] of plyNameBySlot) {
      playerAlias.set(name, localPlayerId(slot))
    }
    for (const [pid, lid] of leaders) {
      if (pid === YOU_ID || pid === OPPONENT_ID) continue
      if (lid && lid === leaders.get(YOU_ID)) playerAlias.set(pid, YOU_ID)
      if (lid && lid === leaders.get(OPPONENT_ID)) playerAlias.set(pid, OPPONENT_ID)
    }
  }

  const live = new Map<PlayerId, LiveState>()
  ensureLive(live, first)
  ensureLive(live, second)

  const frames: ReplayFrame[] = []
  let turnNumber = 1
  let endedTurnsByFirst = 0
  let lastFrameFingerprint = ''
  let pendingActions: ReplayAction[] = []
  let pendingAttackWho: PlayerId | null = null

  const fingerprint = (a: LiveState, b: LiveState) =>
    JSON.stringify({
      a: { h: a.hand, b: a.board, t: a.trash, l: a.life, d: a.don },
      b: { h: b.hand, b: b.board, t: b.trash, l: b.life, d: b.don },
    })

  const pushFrame = (endedBy: PlayerId, kind: 'end' | 'concede') => {
    const firstLive = ensureLive(live, first)
    const secondLive = ensureLive(live, second)
    const fp = fingerprint(firstLive, secondLive)
    if (kind === 'concede' && fp === lastFrameFingerprint && frames.length > 0) {
      // still attach concede action to last frame if needed
      const last = frames[frames.length - 1]
      if (last && !last.actions.some((a) => a.kind === 'concede')) {
        last.actions = [
          ...last.actions,
          makeAction('concede', `${displayName(endedBy)} concedes`, endedBy),
        ]
        last.label = `Turn ${last.turnNumber} · ${displayName(endedBy)} concedes`
      }
      return
    }

    const whoLabel = displayName(endedBy)
    const label =
      kind === 'concede'
        ? `Turn ${turnNumber} · ${whoLabel} concedes`
        : `Turn ${turnNumber} · ${whoLabel} End Turn`

    const actions = [...pendingActions]
    if (kind === 'end') {
      actions.push(makeAction('end', 'End Turn', endedBy))
    } else {
      actions.push(makeAction('concede', `${whoLabel} concedes`, endedBy))
    }
    pendingActions = []
    pendingAttackWho = null

    frames.push({
      index: frames.length,
      turnNumber,
      endedBy,
      label,
      first: clonePlayer(first, leaders.get(first) ?? '', firstLive),
      second: clonePlayer(second, leaders.get(second) ?? '', secondLive),
      actions,
    })
    lastFrameFingerprint = fp

    if (kind === 'end' && resolvePlayer(endedBy) === first) {
      endedTurnsByFirst += 1
      turnNumber = endedTurnsByFirst + 1
    }
  }

  for (const ln of human) {
    const parsed = parsePlayerLine(ln)
    const body = parsed?.body ?? ln
    const who = parsed?.who ? resolvePlayer(parsed.who) : null

    // Anonymous combat resolution lines
    const vs = body.match(VS)
    if (vs && !parsed) {
      pendingActions.push(
        makeAction(
          'combat',
          `${cardLabel(vs[2], vs[1])} ${fmtPower(vs[3])} vs ${cardLabel(vs[5], vs[4])} ${fmtPower(vs[6])}`,
          pendingAttackWho,
          vs[2],
        ),
      )
      continue
    }
    if (body === 'Attack Fails' && !parsed) {
      pendingActions.push(makeAction('combat', 'Attack fails', pendingAttackWho))
      continue
    }
    const hit = body.match(HIT)
    if (hit && !parsed) {
      pendingActions.push(
        makeAction('combat', `${cardLabel(hit[2], hit[1])} hit for ${hit[3]} damage`, pendingAttackWho, hit[2]),
      )
      continue
    }
    const ko = body.match(DESTROYED)
    if (ko && !parsed) {
      pendingActions.push(
        makeAction('ko', `${cardLabel(ko[2], ko[1])} destroyed`, pendingAttackWho, ko[2]),
      )
      continue
    }

    if (!who) continue
    const state = ensureLive(live, who)

    // Snapshots update live state only (board remains static per frame at End Turn)
    const handM = body.match(HAND)
    if (handM) {
      state.hand = parseIdList(handM[1])
      continue
    }
    const boardM = body.match(BOARD)
    if (boardM) {
      state.board = parseIdList(boardM[1])
      continue
    }
    const trashM = body.match(TRASH_LINE)
    if (trashM) {
      state.trash = parseIdList(trashM[1])
      continue
    }
    const lifeM = body.match(LIFE)
    if (lifeM) {
      state.life = Number(lifeM[1])
      continue
    }

    const donM = body.match(DRAW_DON)
    if (donM) {
      const gained = Number(donM[1])
      const before = state.don
      state.don = Math.min(10, state.don + gained)
      const applied = state.don - before
      if (applied > 0) {
        pendingActions.push(makeAction('don', `Draw ${applied} DON!!`, who))
      }
      continue
    }

    const drew = body.match(DREW)
    if (drew) {
      const last = pendingActions[pendingActions.length - 1]
      if (
        last &&
        last.kind === 'draw' &&
        last.playerId === who &&
        !last.cardId &&
        /^Draw \d+ cards?$/.test(last.text)
      ) {
        pendingActions.pop()
      }
      pendingActions.push(
        makeAction('draw', `Draw ${cardLabel(drew[2], drew[1])}`, who, drew[2]),
      )
      continue
    }

    const drawN = body.match(DRAW_N)
    if (drawN && !body.includes('Don')) {
      pendingActions.push(makeAction('draw', `Draw ${drawN[1]} card${drawN[1] === '1' ? '' : 's'}`, who))
      continue
    }

    const deploy = body.match(DEPLOY)
    if (deploy) {
      pendingActions.push(
        makeAction('deploy', `Deploy ${cardLabel(deploy[2], deploy[1])}`, who, deploy[2]),
      )
      continue
    }

    const effectDeploy = body.match(EFFECT_DEPLOY)
    if (effectDeploy) {
      pendingActions.push(
        makeAction(
          'deploy',
          `${cardLabel(effectDeploy[1], '')} deploys ${cardLabel(effectDeploy[3], effectDeploy[2])}`,
          who,
          effectDeploy[3],
        ),
      )
      continue
    }

    const attack = body.match(ATTACK)
    if (attack) {
      pendingAttackWho = who
      pendingActions.push(
        makeAction(
          'attack',
          `${cardLabel(attack[2], attack[1])} attacks ${cardLabel(attack[4], attack[3])}`,
          who,
          attack[2],
          attack[4],
        ),
      )
      continue
    }

    const attach = body.match(ATTACH)
    if (attach) {
      pendingActions.push(
        makeAction(
          'attach',
          `Attach ${attach[1]} DON!! to ${cardLabel(attach[3], attach[2])}`,
          who,
          attach[3],
        ),
      )
      continue
    }

    const discard = body.match(DISCARD)
    if (discard) {
      const c = discard[3] ? ` (+${discard[3]})` : ''
      pendingActions.push(
        makeAction('counter', `Counter ${cardLabel(discard[2], discard[1])}${c}`, who, discard[2]),
      )
      continue
    }

    if (body === 'End Turn') {
      pushFrame(who, 'end')
      continue
    }

    if (body.includes('Concedes!')) {
      pushFrame(who, 'concede')
      break
    }

    const effect = body.match(EFFECT)
    if (effect) {
      const pretty = prettyEffectBody(effect[3])
      if (!pretty) continue
      const kind = actionKindFromEffect(effect[3])
      const source = cardLabel(effect[2], effect[1])
      pendingActions.push(
        makeAction(kind, `${source}: ${pretty}`, who, effect[2]),
      )
    }
  }

  if (frames.length === 0) {
    throw new CombatLogParseError('Could not find any End Turn snapshots in this combat log.')
  }

  const firstLeader = leaders.get(first) ?? ''
  const secondLeader = leaders.get(second) ?? ''
  const firstLeaderName = leaderNames.get(first) ?? 'Leader'
  const secondLeaderName = leaderNames.get(second) ?? 'Leader'
  const leftTitle = [colorWord(firstLeader), shortName(firstLeaderName)].filter(Boolean).join(' ')
  const rightTitle = [colorWord(secondLeader), shortName(secondLeaderName)].filter(Boolean).join(' ')
  const matchupTitle = `${leftTitle} versus ${rightTitle}`

  return {
    title: sourceLabel ? matchupTitle : matchupTitle,
    firstPlayerId: first,
    secondPlayerId: second,
    frames,
  }
}
