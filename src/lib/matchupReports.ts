import type { EditorMatchup } from '../editor/model'
import { isSupabaseConfigured, supabase } from './supabaseClient'

export type MatchupReportRow = {
  id: string
  user_id: string
  title: string
  summary: string | null
  payload: EditorMatchup
  created_at: string
  updated_at: string
}

export type MatchupReportListItem = Pick<
  MatchupReportRow,
  'id' | 'title' | 'summary' | 'created_at' | 'updated_at'
>

function requireClient() {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Cloud save is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  return supabase
}

export async function listMatchupReports(): Promise<MatchupReportListItem[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('matchup_reports')
    .select('id, title, summary, created_at, updated_at')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as MatchupReportListItem[]
}

export async function getMatchupReport(id: string): Promise<MatchupReportRow> {
  const client = requireClient()
  const { data, error } = await client.from('matchup_reports').select('*').eq('id', id).single()
  if (error) throw error
  return data as MatchupReportRow
}

export async function insertMatchupReport(
  userId: string,
  matchup: EditorMatchup,
): Promise<MatchupReportRow> {
  const client = requireClient()
  const { data, error } = await client
    .from('matchup_reports')
    .insert({
      user_id: userId,
      title: matchup.title.trim() || 'Untitled matchup',
      summary: matchup.summary?.trim() || null,
      payload: matchup,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()
  if (error) throw error
  return data as MatchupReportRow
}

export async function updateMatchupReport(
  id: string,
  matchup: EditorMatchup,
): Promise<MatchupReportRow> {
  const client = requireClient()
  const { data, error } = await client
    .from('matchup_reports')
    .update({
      title: matchup.title.trim() || 'Untitled matchup',
      summary: matchup.summary?.trim() || null,
      payload: matchup,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as MatchupReportRow
}

export async function renameMatchupReport(id: string, title: string): Promise<void> {
  const client = requireClient()
  const nextTitle = title.trim() || 'Untitled matchup'
  const row = await getMatchupReport(id)
  const payload: EditorMatchup = { ...row.payload, title: nextTitle }
  const { error } = await client
    .from('matchup_reports')
    .update({
      title: nextTitle,
      payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) throw error
}

export async function deleteMatchupReport(id: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.from('matchup_reports').delete().eq('id', id)
  if (error) throw error
}
