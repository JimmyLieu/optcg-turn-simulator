export type MuGuideMatchup = {
  id: string
  vsLeaderId: string
  vsLeaderName: string
  keyCardIds: string[]
  gameplan: string
}

export type MuGuide = {
  /** Display title, e.g. "Mihawk MU Guide". */
  title: string
  myLeaderId: string
  myLeaderName: string
  matchups: MuGuideMatchup[]
}

export function createMatchupId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `mu-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function createEmptyMatchup(): MuGuideMatchup {
  return {
    id: createMatchupId(),
    vsLeaderId: '',
    vsLeaderName: '',
    keyCardIds: [],
    gameplan: '',
  }
}

export function createNewGuide(): MuGuide {
  return {
    title: 'MU Guide',
    myLeaderId: '',
    myLeaderName: '',
    matchups: [],
  }
}

export function defaultGuideTitle(leaderName: string): string {
  const name = leaderName.trim()
  return name ? `${name} MU Guide` : 'MU Guide'
}
