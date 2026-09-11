import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'

export type AuthState = {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
}

async function consumeAuthCallback(): Promise<Session | null> {
  if (!supabase || typeof window === 'undefined') return null

  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const errorDescription = url.searchParams.get('error_description')

  if (errorDescription) {
    // Clear error params so refresh doesn't keep showing them.
    url.searchParams.delete('error')
    url.searchParams.delete('error_code')
    url.searchParams.delete('error_description')
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`)
    throw new Error(decodeURIComponent(errorDescription.replace(/\+/g, ' ')))
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    url.searchParams.delete('code')
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`)
    if (error) throw error
    return data.session
  }

  const { data } = await supabase.auth.getSession()
  return data.session
}

export function useAuth(): AuthState {
  const [loading, setLoading] = useState(isSupabaseConfigured)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let cancelled = false

    consumeAuthCallback()
      .then((next) => {
        if (cancelled) return
        setSession(next)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Auth callback failed:', err)
        if (cancelled) return
        setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  return {
    configured: isSupabaseConfigured,
    loading,
    session,
    user: session?.user ?? null,
  }
}

function mapAuthError(error: { message: string; code?: string }): Error {
  if (/signup/i.test(error.message) || error.code === 'signup_disabled') {
    return new Error('Accounts are invite-only. Ask the admin to create your login.')
  }
  return new Error(error.message)
}

export async function signInWithPassword(email: string, password: string): Promise<void> {
  if (!supabase) {
    throw new Error('Cloud save is not configured.')
  }
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  if (error) throw mapAuthError(error)
}

export async function signInWithMagicLink(email: string): Promise<void> {
  if (!supabase) {
    throw new Error('Cloud save is not configured.')
  }
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: `${window.location.origin}/`,
      shouldCreateUser: false,
    },
  })
  if (error) throw mapAuthError(error)
}

export async function verifyEmailOtp(email: string, token: string): Promise<void> {
  if (!supabase) {
    throw new Error('Cloud save is not configured.')
  }
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'email',
  })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
