import { isSupabaseConfigured, supabase } from './supabaseClient'

export type SupportTicketInput = {
  note: string
  logText: string
  fileName: string | null
  userId?: string | null
}

export type SupportTicketRow = {
  id: string
  created_at: string
}

const MAX_LOG_CHARS = 1_500_000
const MAX_NOTE_CHARS = 8_000

export async function submitSupportTicket(
  input: SupportTicketInput,
): Promise<SupportTicketRow> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Cloud support is not configured.')
  }

  const note = input.note.trim().slice(0, MAX_NOTE_CHARS)
  const logText = input.logText.trim()
  if (!logText) {
    throw new Error('Upload a combat log file so we can reproduce the issue.')
  }
  if (logText.length > MAX_LOG_CHARS) {
    throw new Error('That combat log is too large to submit. Trim it or zip and email instead.')
  }

  const { data, error } = await supabase
    .from('support_tickets')
    .insert({
      note: note || '(no note)',
      log_text: logText,
      file_name: input.fileName,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      user_id: input.userId ?? null,
      status: 'open',
    })
    .select('id, created_at')
    .single()

  if (error) throw error
  return data as SupportTicketRow
}
