import { useState } from 'react'
import type { AnalysisResult, AnalysisTest } from '../types'
import { copyApaToClipboard } from '../logic/apa'
import { testLabel } from '../logic/recommendation'
import { HeatTable, MeanBars, Scatter } from './Charts'
import type { ContingencyInput, CorrelationRawInput, IndependentRawInput, PairedRawInput } from '../types'

interface ResultsProps {
  test: AnalysisTest
  result: AnalysisResult
  payload: unknown
  missingInfo?: string
  onSave: () => void
}

export function Results({ test, result, payload, missingInfo, onSave }: ResultsProps) {
  const [deep, setDeep] = useState(false)
  const [copied, setCopied] = useState(false)

  async function copyApa(): Promise<void> {
    await copyApaToClipboard(result.apa)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <section className="results">
      <article className="panel">
        <h2>Plain-language answer</h2>
        <p className="plain-answer">{result.plainLanguage}</p>
        <p className="muted">Test: {testLabel(test)}</p>
      </article>

      <article className="panel">
        <h3>Formal result</h3>
        <p>{result.formalResult}</p>
        <div className="stats-grid">
          {result.descriptives.map((d) => (
            <div key={d.label} className="kv"><span>{d.label}</span><strong>{d.value}</strong></div>
          ))}
        </div>
      </article>

      <article className={`panel trust ${result.trust.riskLevel}`}>
        <h3>Should I trust this result?</h3>
        <p>{result.trust.summary}</p>
        <ul>
          {result.trust.bullets.map((b) => <li key={b}>{b}</li>)}
          {missingInfo && <li>{missingInfo}</li>}
          <li>Practical significance still needs context and judgment.</li>
        </ul>
      </article>

      <article className="panel">
        <h3>Effect size + confidence interval</h3>
        <p>{result.effectSize.name}: <strong>{result.effectSize.formatted}</strong> ({result.effectSize.interpretation})</p>
        {result.confidenceInterval && <p>{result.confidenceInterval.label}: <strong>{result.confidenceInterval.formatted}</strong></p>}
      </article>

      <article className="panel">
        <h3>Warnings and assumptions</h3>
        <div className="grid-two">
          <div>
            <h4>Assumption checks</h4>
            <ul>{result.warnings.assumptions.map((w) => <li key={w}>{w}</li>)}</ul>
          </div>
          <div>
            <h4>Interpretive cautions</h4>
            <ul>{result.warnings.interpretation.map((w) => <li key={w}>{w}</li>)}</ul>
          </div>
        </div>
      </article>

      <article className="panel">
        <h3>APA-style report</h3>
        <p dangerouslySetInnerHTML={{ __html: result.apa }} />
        <div className="row">
          <button onClick={copyApa}>{copied ? 'Copied' : 'Copy APA report'}</button>
          <button onClick={onSave}>Save analysis JSON</button>
          <button onClick={() => window.print()}>Print-friendly summary</button>
        </div>
      </article>

      <article className="panel">
        <h3>Simple visual</h3>
        {(test === 'independent_t' || test === 'paired_t') && (
          <MeanBars data={payload as IndependentRawInput | PairedRawInput} />
        )}
        {test === 'correlation' && <Scatter data={payload as CorrelationRawInput} />}
        {(test === 'chi_independence') && <HeatTable data={payload as ContingencyInput} />}
      </article>

      <article className="panel">
        <h3>Deep explanation</h3>
        <button onClick={() => setDeep((v) => !v)}>{deep ? 'Hide details' : 'Show details'}</button>
        {deep && (
          <ul>
            {result.deepExplanation.map((line) => <li key={line}>{line}</li>)}
          </ul>
        )}
      </article>
    </section>
  )
}
