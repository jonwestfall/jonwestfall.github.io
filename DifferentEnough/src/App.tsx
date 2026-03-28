import { useState } from 'react'
import './index.css'
import { Landing } from './components/Landing'
import { Onboarding } from './components/Onboarding'
import { DataInput } from './components/DataInput'
import { Results } from './components/Results'
import { EXAMPLES } from './examples/datasets'
import { analyze } from './logic/analyze'
import type { AnalysisResult, AnalysisTest, InputMethod } from './types'
import { exportAnalysis, parseSavedAnalysis, readTextFile } from './utils/exportImport'
import { guardTestChoice } from './logic/recommendation'

type Stage = 'landing' | 'onboarding' | 'input' | 'results'

function App() {
  const [stage, setStage] = useState<Stage>('landing')
  const [test, setTest] = useState<AnalysisTest>('independent_t')
  const [inputMethod, setInputMethod] = useState<InputMethod>('raw')
  const [payload, setPayload] = useState<unknown>(null)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [missingInfo, setMissingInfo] = useState<string | undefined>(undefined)
  const [choiceWarnings, setChoiceWarnings] = useState<string[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  function startWithTest(nextTest: AnalysisTest): void {
    setTest(nextTest)
    const guard = guardTestChoice(nextTest, [])
    setChoiceWarnings(guard.warnings)
    setStage('input')
  }

  function runAnalysis(method: InputMethod, nextPayload: unknown, missingMessage?: string): void {
    setInputMethod(method)
    setPayload(nextPayload)
    const res = analyze(test, nextPayload)
    setResult(res)
    setMissingInfo(missingMessage)
    setStage('results')
  }

  function saveJson(): void {
    if (!result) return
    exportAnalysis(test, inputMethod, payload, result)
  }

  async function loadSaved(file: File): Promise<void> {
    try {
      const text = await readTextFile(file)
      const parsed = parseSavedAnalysis(text)
      setTest(parsed.test)
      setInputMethod(parsed.inputMethod)
      setPayload(parsed.payload)
      setResult(parsed.result)
      setStage('results')
      setLoadError(null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load saved analysis.')
    }
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>Different Enough?</h1>
          <p>Is that signal, or just noise?</p>
        </div>
        <div className="row">
          <button onClick={() => setStage('landing')}>Home</button>
          <button onClick={() => setStage('onboarding')}>Start</button>
          <label className="file-label">
            Load saved JSON
            <input type="file" accept=".json,application/json" onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void loadSaved(file)
            }} />
          </label>
        </div>
      </header>

      {loadError && <p className="error">{loadError}</p>}

      {stage === 'landing' && (
        <Landing
          onStart={() => setStage('onboarding')}
          examples={EXAMPLES}
          onLoadExample={(example) => {
            setTest(example.test)
            setInputMethod(example.inputMethod)
            setPayload(example.payload)
            setResult(analyze(example.test, example.payload))
            setStage('results')
          }}
        />
      )}

      {stage === 'onboarding' && (
        <Onboarding
          onChooseTest={(nextTest) => {
            startWithTest(nextTest)
          }}
        />
      )}

      {stage === 'input' && (
        <>
          {choiceWarnings.length > 0 && (
            <section className="panel warn">
              <h3>Test choice warning</h3>
              {choiceWarnings.map((w) => <p key={w}>{w}</p>)}
            </section>
          )}
          <DataInput test={test} onRun={runAnalysis} />
        </>
      )}

      {stage === 'results' && result && (
        <Results test={test} result={result} payload={payload} missingInfo={missingInfo} onSave={saveJson} />
      )}

      <footer className="disclaimer panel">
        <h3>Disclaimer</h3>
        <p>This tool is a practical helper, not a substitute for full statistical consultation.</p>
        <p>Significance does not equal importance. Poor study design cannot be fixed by a test.</p>
        <p>Inappropriate or low-quality data can produce misleading outputs. Use judgment before overinterpreting.</p>
      </footer>
    </main>
  )
}

export default App
