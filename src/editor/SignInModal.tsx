import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { isSupabaseConfigured } from '../lib/supabaseClient'
import { signInWithMagicLink, verifyEmailOtp } from '../hooks/useAuth'

type Props = {
  open: boolean
  onClose: () => void
  /** Shown under the title when opened from Save / My reports. */
  reason?: string | null
  onSignedIn?: () => void
}

export function SignInModal({ open, onClose, reason, onSignedIn }: Props) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const emailId = useId()
  const codeId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setEmail('')
    setCode('')
    setError(null)
    setSent(false)
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open || !sent) return
    const t = window.setTimeout(() => codeRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open, sent])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const submitEmail = useCallback(
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
      setSending(true)
      setError(null)
      try {
        await signInWithMagicLink(value)
        setSent(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not send the magic link.')
      } finally {
        setSending(false)
      }
    },
    [email],
  )

  const submitCode = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault()
      const token = code.trim()
      if (!token) {
        setError('Enter the 6–8 digit code from the email.')
        return
      }
      setVerifying(true)
      setError(null)
      try {
        await verifyEmailOtp(email, token)
        onSignedIn?.()
        onClose()
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Invalid or expired code. Request a new email and try again.',
        )
      } finally {
        setVerifying(false)
      }
    },
    [code, email, onClose, onSignedIn],
  )

  if (!open) return null

  return (
    <div className="mu-import" role="dialog" aria-modal="true" aria-labelledby="mu-auth-title">
      <div className="mu-import__backdrop" onClick={onClose} />
      <div className="mu-import__panel mu-import__panel--auth">
        <h2 id="mu-auth-title" className="mu-import__title">
          Sign in
        </h2>
        <p className="mu-import__hint">
          {reason ?? 'Sign in with a magic link to save and open matchup reports.'}
        </p>

        {sent ? (
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
                disabled={verifying}
              >
                {verifying ? 'Verifying…' : 'Verify code'}
              </button>
              <button
                type="button"
                className="mu-editor__btn"
                disabled={sending}
                onClick={() => void submitEmail()}
              >
                {sending ? 'Sending…' : 'Resend email'}
              </button>
              <button type="button" className="mu-editor__btn" onClick={onClose}>
                Close
              </button>
            </div>
          </form>
        ) : (
          <form className="mu-auth-form" onSubmit={(e) => void submitEmail(e)}>
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
                disabled={sending}
              >
                {sending ? 'Sending…' : 'Email magic link'}
              </button>
              <button type="button" className="mu-editor__btn" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
