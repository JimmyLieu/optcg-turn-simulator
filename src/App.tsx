import { useMemo, useState } from 'react'
import { TurnCurveBoard } from './components/TurnCurveBoard'
import { MatchupEditor } from './editor/MatchupEditor'
import { createNewMatchup } from './editor/model'
import { editorToMatchupCurve } from './editor/toCurve'
import './App.css'

type Tab = 'edit' | 'preview'

function App() {
  const [tab, setTab] = useState<Tab>('edit')
  const [editor, setEditor] = useState(createNewMatchup)

  const curve = useMemo(() => editorToMatchupCurve(editor), [editor])

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
        <TurnCurveBoard data={curve} />
      )}
    </main>
  )
}

export default App
