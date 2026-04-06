import { forwardRef, useMemo, useRef, useState } from 'react'
import { TurnCurveBoard } from './components/TurnCurveBoard'
import { MatchupEditor } from './editor/MatchupEditor'
import { createNewMatchup } from './editor/model'
import { editorToMatchupCurve } from './editor/toCurve'
import { downloadMatchupCurvePng } from './lib/exportMatchupPng'
import './App.css'

type Tab = 'edit' | 'preview'

const AppFooter = forwardRef<HTMLElement>(function AppFooter(_, ref) {
  return (
    <footer ref={ref} className="app-footer">
      <p className="app-footer__credit">
        Made by{' '}
        <a>
          Jimmy Lieu (Best Shanks Player)
        </a>
      </p>
    </footer>
  )
})

function App() {
  const [tab, setTab] = useState<Tab>('edit')
  const [editor, setEditor] = useState(createNewMatchup)
  const [exporting, setExporting] = useState(false)

  const curve = useMemo(() => editorToMatchupCurve(editor), [editor])
  const boardRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLElement>(null)

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

  return (
    <main className="app-shell">
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
        <button
          type="button"
          className="app-toolbar__reset"
          onClick={() => {
            if (window.confirm('Discard this matchup and start a new blank one?')) {
              setEditor(createNewMatchup())
              setTab('edit')
            }
          }}
        >
          New matchup
        </button>
      </div>

      {tab === 'edit' ? (
        <MatchupEditor value={editor} onChange={setEditor} />
      ) : (
        <div ref={boardRef} className="preview-export-wrap">
          <TurnCurveBoard data={curve} />
        </div>
      )}

      <AppFooter ref={footerRef} />
    </main>
  )
}

export default App
