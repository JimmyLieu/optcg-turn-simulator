export type ReplayPlayerState = {
  playerId: string
  displayName: string
  leaderId: string
  life: number
  /** Best-effort cost-area DON!! count (capped at 10). */
  don: number
  hand: string[]
  /** Character card ids on the field (leader is separate). */
  board: string[]
  trash: string[]
}

export type ReplayActionKind =
  | 'deploy'
  | 'attack'
  | 'combat'
  | 'search'
  | 'draw'
  | 'don'
  | 'attach'
  | 'effect'
  | 'counter'
  | 'ko'
  | 'concede'
  | 'end'
  | 'note'

export type ReplayAction = {
  id: string
  kind: ReplayActionKind
  playerId: string | null
  displayName: string | null
  text: string
  cardId?: string
  /** Defender / target card id when known (attacks). */
  targetCardId?: string
}

export type ReplayFrame = {
  /** 0-based scrubber index. */
  index: number
  /** Game turn label (increments when the first player ends their turn). */
  turnNumber: number
  endedBy: string
  label: string
  /** End-of-turn board snapshot (static for this frame). */
  first: ReplayPlayerState
  second: ReplayPlayerState
  /** Actions that led up to this End Turn / concede (board does not scrub with these). */
  actions: ReplayAction[]
}

export type ReplaySession = {
  title: string
  firstPlayerId: string
  secondPlayerId: string
  frames: ReplayFrame[]
}
