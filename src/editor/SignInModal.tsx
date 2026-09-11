import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { signInWithMagicLink, signInWithPassword, verifyEmailOtp } from '../hooks/useAuth'

type Props = {
  open: boolean
  onClose: () => void
  /** Shown under the title when opened from Save / My reports. */
  reason?: string | null
  onSignedIn?: () => void
}

type Mode = 'password' | 'magic' | 'code'

export function SignInModal({ open, onClose, reason, onSignedIn }: Props) {
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const emailId = useId()
  const passwordId = useId()
  const codeId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setMode('password')
    setEmail('')
    setPassword('')
    setCode('')
    setError(null)
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open || mode !== 'code') return
    const t = window.setTimeout(() => codeRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open, mode])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const finishSignedIn = useCallback(() => {
    onSignedIn?.()
    onClose()
  }, [onClose, onSignedIn])

  const submitPassword = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      if (!isSupabaseConfigured) {
        setError('Cloud save is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
        return
      }
      const value = email.trim()
      if (!value || !value.includes('@')) {
        setError('Enter a valid email address.')
        return
      }
      if (!password) {
        setError('Enter a password.')
        return
      }
      setBusy(true)
      setError(null)
      try {
        await signInWithPassword(value, password)
        finishSignedIn()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not sign in.')
      } finally {
        setBusy(false)
      }
    },
    [email, finishSignedIn, password],
  )

  const submitMagic = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault()
      if (!isSupabaseConfigured) {
        setError('Cloud save is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
        return
      }
      const value = email.trim()
      if (!value || !value.includes('@')) {
        setError('Enter a valid email address.')
        return
      }
      setBusy(true)
      setError(null)
      try {
        await signInWithMagicLink(value)
        setMode('code')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not send the magic link.')
      } finally {
        setBusy(false)
      }
    },
    [email],
  )

  const submitCode = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      const token = code.trim()
      if (!token) {
        setError('Enter the 6–8 digit code from the email.')
        return
      }
      setBusy(true)
      setError(null)
      try {
        await verifyEmailOtp(email, token)
        finishSignedIn()
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Invalid or expired code. Request a new email and try again.',
        )
      } finally {
        setBusy(false)
      }
    },
    [code, email, finishSignedIn],
  )

  if (!open) return null

  const title = mode === 'magic' || mode === 'code' ? 'Magic link' : 'Sign in'

  return (
    <div className="mu-import" role="dialog" aria-modal="true" aria-labelledby="mu-auth-title">
      <div className="mu-import__backdrop" onClick={onClose} />
      <div className="mu-import__panel mu-import__panel--auth">
        <h2 id="mu-auth-title" className="mu-import__title">
          {title}
        </h2>
        <p className="mu-import__hint">
          {reason ?? 'Sign in to save and open matchup reports.'}
        </p>

        {mode === 'code' ? (
          <form className="mu-auth-form" onSubmit={(e) => void submitCode(e)}>
            <p className="mu-import__status">
              Email sent to <strong>{email.trim()}</strong>. Click the link, or paste the code
              from the email below.
            </p>
            <label className="mu-editor__label" htmlFor={codeId}>
              Email code
            </label>
            <input
              ref={codeRef}
              id={codeId}
              className="mu-editor__input mu-editor__input--wide"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                if (error) setError(null)
              }}
              placeholder="123456"
            />
            {error ? <p className="mu-import__error">{error}</p> : null}
            <div className="mu-import__actions">
              <button
                type="submit"
                className="mu-editor__btn mu-editor__btn--primary"
                disabled={busy}
              >
                {busy ? 'Verifying…' : 'Verify code'}
              </button>
              <button
                type="button"
                className="mu-editor__btn"
                disabled={busy}
                onClick={() => void submitMagic()}
              >
                {busy ? 'Sending…' : 'Resend email'}
              </button>
              <button
                type="button"
                className="mu-editor__btn"
                onClick={() => {
                  setMode('password')
                  setError(null)
                }}
              >
                Use password
              </button>
            </div>
          </form>
        ) : mode === 'magic' ? (
          <form className="mu-auth-form" onSubmit={(e) => void submitMagic(e)}>
            <label className="mu-editor__label" htmlFor={emailId}>
              Email
            </label>
            <input
              ref={inputRef}
              id={emailId}
              className="mu-editor__input mu-editor__input--wide"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError(null)
              }}
              placeholder="you@example.com"
            />
            {error ? <p className="mu-import__error">{error}</p> : null}
            <div className="mu-import__actions">
              <button
                type="submit"
                className="mu-editor__btn mu-editor__btn--primary"
                disabled={busy}
              >
                {busy ? 'Sending…' : 'Email magic link'}
              </button>
              <button
                type="button"
                className="mu-editor__btn"
                onClick={() => {
                  setMode('password')
                  setError(null)
                }}
              >
                Use password
              </button>
              <button type="button" className="mu-editor__btn" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <form className="mu-auth-form" onSubmit={(e) => void submitPassword(e)}>
            <label className="mu-editor__label" htmlFor={emailId}>
              Email
            </label>
            <input
              ref={inputRef}
              id={emailId}
              className="mu-editor__input mu-editor__input--wide"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError(null)
              }}
              placeholder="you@example.com"
            />
            <label className="mu-editor__label" htmlFor={passwordId}>
              Password
            </label>
            <input
              id={passwordId}
              className="mu-editor__input mu-editor__input--wide"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError(null)
              }}
              placeholder="••••••••"
            />
            {error ? <p className="mu-import__error">{error}</p> : null}
            <div className="mu-import__actions">
              <button
                type="submit"
                className="mu-editor__btn mu-editor__btn--primary"
                disabled={busy}
              >
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
              <button type="button" className="mu-editor__btn" onClick={onClose}>
                Cancel
              </button>
            </div>
            <p className="mu-auth-switch">
              <button
                type="button"
                className="mu-auth-switch__btn"
                onClick={() => {
                  setMode('magic')
                  setError(null)
                }}
              >
                Use magic link instead
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
