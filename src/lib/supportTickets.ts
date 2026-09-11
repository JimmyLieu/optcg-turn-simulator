import { isSupabaseConfigured, supabase } from './supabaseClient'

export type SupportTicketInput = {
  note: string
  logText: string
  fileName: string | null
  userId?: string | null
}

export type SupportTicketRow = {
  id: string | null
}

const MAX_LOG_CHARS = 1_500_000
const MAX_NOTE_CHARS = 8_000

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = String((error as { message?: unknown }).message ?? '')
    if (/row-level security|42501/i.test(msg)) {
      return 'Ticket blocked by database permissions. Re-run supabase/support_tickets.sql in the Supabase SQL Editor (includes GRANT + RLS).'
    }
    if (/Could not find the table|PGRST205/i.test(msg)) {
      return 'support_tickets table is missing. Run supabase/support_tickets.sql in the Supabase SQL Editor.'
    }
    if (msg) return msg
  }
  if (error instanceof Error && error.message) return error.message
  return 'Could not submit the support ticket.'
}

export async function submitSupportTicket(
  input: SupportTicketInput,
): Promise<SupportTicketRow> {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Cloud support is not configured.')
  }

  const note = input.note.trim().slice(0, MAX_NOTE_CHARS)
  const logText = input.logText.trim()
  if (!note) {
    throw new Error('Add a short note describing the issue.')
  }
  if (logText.length > MAX_LOG_CHARS) {
    throw new Error('That combat log is too large to submit. Trim it or attach a smaller file.')
  }

  // No .select() after insert — there is intentionally no SELECT RLS policy for the public.
  const { error } = await supabase.from('support_tickets').insert({
    note,
    log_text: logText,
    file_name: input.fileName,
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
    user_id: input.userId ?? null,
    status: 'open',
  })

  if (error) throw new Error(errorMessage(error))
  return { id: null }
}
