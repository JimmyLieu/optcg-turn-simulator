import { forwardRef, useCallback, useMemo, useRef, useState } from 'react'
import { TurnCurveBoard } from './components/TurnCurveBoard'
import { MatchupEditor } from './editor/MatchupEditor'
import { createNewMatchup, flipTurnOrder, type EditorMatchup } from './editor/model'
import { ImportCombatLogButton } from './editor/ImportCombatLog'
import { MyReportsModal } from './editor/MyReportsModal'
import { SignInModal } from './editor/SignInModal'
import { SupportButton } from './editor/SupportButton'
import { editorToMatchupCurve } from './editor/toCurve'
import { MuGuideBoard } from './guide/MuGuideBoard'
import { MuGuideEditor } from './guide/MuGuideEditor'
import { createNewGuide } from './guide/model'
import { ReplayView } from './replay/ReplayView'
import type { ReplaySession } from './replay/model'
import { downloadMatchupCurvePng } from './lib/exportMatchupPng'
import { useAuth, signOut } from './hooks/useAuth'
import { insertMatchupReport, updateMatchupReport } from './lib/matchupReports'
import { isSupabaseConfigured } from './lib/supabaseClient'
import './App.css'

type Feature = 'curve' | 'guide' | 'replay'
type Tab = 'edit' | 'preview'

const AppFooter = forwardRef<HTMLElement>(function AppFooter(_, ref) {
  return (
    <footer ref={ref} className="app-footer">
      <p className="app-footer__credit">
        Made by <a>Jmi</a>
      </p>
    </footer>
  )
})

function App() {
  const [feature, setFeature] = useState<Feature>('curve')
  const [tab, setTab] = useState<Tab>('edit')
  const [editor, setEditor] = useState(createNewMatchup)
  const [guide, setGuide] = useState(createNewGuide)
  const [replaySession, setReplaySession] = useState<ReplaySession | null>(null)
  const [replayFrameIndex, setReplayFrameIndex] = useState(0)
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
      const titleHint =
        feature === 'guide'
          ? guide.title.trim() || guide.myLeaderName || 'mu-guide'
          : editor.title
      await downloadMatchupCurvePng(el, titleHint, { footerElement: footerRef.current })
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
    if (feature !== 'curve') return
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
    setFeature('curve')
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

  const startNewGuide = () => {
    if (!window.confirm('Discard this guide and start a new blank one?')) return
    setGuide(createNewGuide())
    setTab('edit')
  }

  const switchFeature = (next: Feature) => {
    setFeature(next)
    setTab('edit')
    setSaveMessage(null)
  }

  const userLabel = auth.user?.email ?? auth.user?.id ?? null
  const previewShell = feature !== 'replay' && tab === 'preview'
  const title = feature === 'guide' ? 'MU Guide' : feature === 'replay' ? 'Replay' : 'Matchup curve'
  const wideShell = previewShell || (feature === 'replay' && !!replaySession)

  return (
    <main
      className={`app-shell${wideShell ? ' app-shell--wide' : ''}${feature === 'replay' && replaySession ? ' app-shell--replay' : ''}`}
    >
      <div className="app-toolbar">
        <div className="app-toolbar__row app-toolbar__row--nav">
          <div className="app-toolbar__features" role="tablist" aria-label="App feature">
            <button
              type="button"
              role="tab"
              aria-selected={feature === 'curve'}
              className={`app-toolbar__feature ${feature === 'curve' ? 'is-active' : ''}`}
              onClick={() => switchFeature('curve')}
            >
              Matchup curve
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={feature === 'guide'}
              className={`app-toolbar__feature ${feature === 'guide' ? 'is-active' : ''}`}
              onClick={() => switchFeature('guide')}
            >
              MU Guide
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={feature === 'replay'}
              className={`app-toolbar__feature ${feature === 'replay' ? 'is-active' : ''}`}
              onClick={() => switchFeature('replay')}
            >
              Replay <span className="app-toolbar__beta">beta</span>
            </button>
          </div>

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

        <div className="app-toolbar__row app-toolbar__row--main">
          <h1 className="app-toolbar__title">
            {title}
            {feature === 'replay' ? <span className="app-toolbar__beta">beta</span> : null}
          </h1>

          <div className="app-toolbar__actions">
            {feature !== 'replay' ? (
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
            ) : null}

            {feature !== 'replay' && tab === 'preview' ? (
              <button
                type="button"
                className="app-toolbar__download"
                disabled={exporting}
                onClick={() => void onDownloadPng()}
              >
                {exporting ? 'Saving…' : 'Download PNG'}
              </button>
            ) : null}

            {feature === 'curve' ? (
              <>
                <button type="button" className="app-toolbar__reset" onClick={startNewMatchup}>
                  New matchup
                </button>
                <button
                  type="button"
                  className="app-toolbar__reset"
                  onClick={() => setEditor((prev) => flipTurnOrder(prev))}
                  title="Swap who goes first and second"
                >
                  Swap 1st / 2nd
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
              </>
            ) : feature === 'guide' ? (
              <button type="button" className="app-toolbar__reset" onClick={startNewGuide}>
                New guide
              </button>
            ) : null}

            {saveMessage ? <span className="app-toolbar__save-status">{saveMessage}</span> : null}
          </div>
        </div>
      </div>

      {feature === 'curve' ? (
        tab === 'edit' ? (
          <MatchupEditor value={editor} onChange={setEditor} />
        ) : (
          <div ref={boardRef} className="preview-export-wrap">
            <TurnCurveBoard data={curve} />
          </div>
        )
      ) : feature === 'guide' ? (
        tab === 'edit' ? (
          <MuGuideEditor value={guide} onChange={setGuide} />
        ) : (
          <div ref={boardRef} className="preview-export-wrap">
            <MuGuideBoard data={guide} />
          </div>
        )
      ) : (
        <ReplayView
          session={replaySession}
          frameIndex={replayFrameIndex}
          onSession={setReplaySession}
          onFrameIndex={setReplayFrameIndex}
          onClear={() => {
            setReplaySession(null)
            setReplayFrameIndex(0)
          }}
        />
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
        onRenamedReport={(id, renamedTitle) => {
          if (id === currentReportId) {
            setEditor((prev) => ({ ...prev, title: renamedTitle }))
          }
        }}
      />
    </main>
  )
}

export default App
