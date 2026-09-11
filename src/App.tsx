import { forwardRef, useCallback, useMemo, useRef, useState } from 'react'
import { TurnCurveBoard } from './components/TurnCurveBoard'
import { MatchupEditor } from './editor/MatchupEditor'
import { createNewMatchup, type EditorMatchup } from './editor/model'
import { ImportCombatLogButton } from './editor/ImportCombatLog'
import { MyReportsModal } from './editor/MyReportsModal'
import { SignInModal } from './editor/SignInModal'
import { SupportButton } from './editor/SupportButton'
import { editorToMatchupCurve } from './editor/toCurve'
import { downloadMatchupCurvePng } from './lib/exportMatchupPng'
import { useAuth, signOut } from './hooks/useAuth'
import { insertMatchupReport, updateMatchupReport } from './lib/matchupReports'
import { isSupabaseConfigured } from './lib/supabaseClient'
import './App.css'

type Tab = 'edit' | 'preview'

const AppFooter = forwardRef<HTMLElement>(function AppFooter(_, ref) {
  return (
    <footer ref={ref} className="app-footer">
      <p className="app-footer__credit">
        Made by{' '}
        <a>
          Jmi
        </a>
      </p>
    </footer>
  )
})

function App() {
  const [tab, setTab] = useState<Tab>('edit')
  const [editor, setEditor] = useState(createNewMatchup)
  const [exporting, setExporting] = useState(false)
  const [currentReportId, setCurrentReportId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [signInOpen, setSignInOpen] = useState(false)
  const [signInReason, setSignInReason] = useState<string | null>(null)
  const [reportsOpen, setReportsOpen] = useState(false)

  const auth = useAuth()
  const curve = useMemo(() => editorToMatchupCurve(editor), [editor])
  const boardRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLElement>(null)

  const requireAuth = useCallback(
    (reason: string): boolean => {
      if (!isSupabaseConfigured) {
        window.alert(
          'Cloud save is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local.',
        )
        return false
      }
      if (!auth.user) {
        setSignInReason(reason)
        setSignInOpen(true)
        return false
      }
      return true
    },
    [auth.user],
  )

  const onDownloadPng = async () => {
    const el = boardRef.current
    if (!el) return
    setExporting(true)
    try {
      await downloadMatchupCurvePng(el, editor.title, { footerElement: footerRef.current })
    } catch (e) {
      console.error(e)
      window.alert(
        'Could not create the image. Wait for card art to finish loading, then try again.',
      )
    } finally {
      setExporting(false)
    }
  }

  const onSave = async () => {
    if (!requireAuth('Sign in to save this matchup report.')) return
    const user = auth.user
    if (!user) return

    setSaving(true)
    setSaveMessage(null)
    try {
      if (currentReportId) {
        const row = await updateMatchupReport(currentReportId, editor)
        setCurrentReportId(row.id)
        setSaveMessage('Saved')
      } else {
        const row = await insertMatchupReport(user.id, editor)
        setCurrentReportId(row.id)
        setSaveMessage('Saved as new report')
      }
      window.setTimeout(() => setSaveMessage(null), 2500)
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not save this report.')
    } finally {
      setSaving(false)
    }
  }

  const onOpenReports = () => {
    if (!requireAuth('Sign in to view your saved reports.')) return
    setReportsOpen(true)
  }

  const loadReport = (id: string, matchup: EditorMatchup) => {
    setEditor(matchup)
    setCurrentReportId(id)
    setTab('preview')
    setSaveMessage(null)
  }

  const startNewMatchup = () => {
    if (!window.confirm('Discard this matchup and start a new blank one?')) return
    setEditor(createNewMatchup())
    setCurrentReportId(null)
    setSaveMessage(null)
    setTab('edit')
  }

  const userLabel = auth.user?.email ?? auth.user?.id ?? null

  return (
    <main className={`app-shell${tab === 'preview' ? ' app-shell--preview' : ''}`}>
      <div className="app-toolbar">
        <h1 className="app-toolbar__title">Matchup curve</h1>
        <div className="app-toolbar__tabs" role="tablist" aria-label="Editor mode">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'edit'}
            className={`app-toolbar__tab ${tab === 'edit' ? 'is-active' : ''}`}
            onClick={() => setTab('edit')}
          >
            Edit
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'preview'}
            className={`app-toolbar__tab ${tab === 'preview' ? 'is-active' : ''}`}
            onClick={() => setTab('preview')}
          >
            Preview
          </button>
        </div>
        {tab === 'preview' ? (
          <button
            type="button"
            className="app-toolbar__download"
            disabled={exporting}
            onClick={() => void onDownloadPng()}
          >
            {exporting ? 'Saving…' : 'Download PNG'}
          </button>
        ) : null}
        <button type="button" className="app-toolbar__reset" onClick={startNewMatchup}>
          New matchup
        </button>
        <ImportCombatLogButton
          onImported={(next) => {
            setEditor(next)
            setCurrentReportId(null)
            setSaveMessage(null)
            setTab('preview')
          }}
        />
        <button
          type="button"
          className="app-toolbar__reset"
          disabled={saving || auth.loading}
          onClick={() => void onSave()}
        >
          {saving ? 'Saving…' : currentReportId ? 'Save' : 'Save report'}
        </button>
        <button
          type="button"
          className="app-toolbar__reset"
          disabled={auth.loading}
          onClick={onOpenReports}
        >
          My reports
        </button>
        {saveMessage ? <span className="app-toolbar__save-status">{saveMessage}</span> : null}

        <div className="app-toolbar__account">
          {auth.loading ? (
            <span className="app-toolbar__account-label">…</span>
          ) : userLabel ? (
            <>
              <span className="app-toolbar__account-label" title={userLabel}>
                {userLabel}
              </span>
              <button
                type="button"
                className="app-toolbar__reset"
                onClick={() => {
                  void signOut().then(() => {
                    setReportsOpen(false)
                    setSaveMessage(null)
                  })
                }}
              >
                Sign out
              </button>
            </>
          ) : (
            <button
              type="button"
              className="app-toolbar__reset"
              onClick={() => {
                setSignInReason(null)
                setSignInOpen(true)
              }}
            >
              Sign in
            </button>
          )}
          <SupportButton />
        </div>
      </div>

      {tab === 'edit' ? (
        <MatchupEditor value={editor} onChange={setEditor} />
      ) : (
        <div ref={boardRef} className="preview-export-wrap">
          <TurnCurveBoard data={curve} />
        </div>
      )}

      <AppFooter ref={footerRef} />

      <SignInModal
        open={signInOpen}
        reason={signInReason}
        onClose={() => {
          setSignInOpen(false)
          setSignInReason(null)
        }}
      />
      <MyReportsModal
        open={reportsOpen}
        onClose={() => setReportsOpen(false)}
        onOpenReport={loadReport}
        onDeletedReport={(id) => {
          if (id === currentReportId) setCurrentReportId(null)
        }}
        onRenamedReport={(id, title) => {
          if (id === currentReportId) {
            setEditor((prev) => ({ ...prev, title }))
          }
        }}
      />
    </main>
  )
}

export default App
