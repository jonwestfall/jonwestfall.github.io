import { useMemo, useState } from 'react'
import type { AnalysisTest } from '../types'
import { recommendFromDataHints, recommendFromQuestions, testLabel } from '../logic/recommendation'

interface OnboardingProps {
  onChooseTest: (test: AnalysisTest) => void
}

export function Onboarding({ onChooseTest }: OnboardingProps) {
  const [path, setPath] = useState<'question' | 'data' | 'manual'>('question')
  const [goal, setGoal] = useState<'difference' | 'relationship'>('difference')
  const [repeated, setRepeated] = useState(false)
  const [varType, setVarType] = useState<'numeric' | 'categorical' | 'mixed'>('numeric')
  const [oneCategorical, setOneCategorical] = useState(false)
  const [hasRawValues, setHasRawValues] = useState(true)
  const [hasSummary, setHasSummary] = useState(false)
  const [hasContingency, setHasContingency] = useState(false)
  const [numCount, setNumCount] = useState(2)
  const [catCount, setCatCount] = useState(0)
  const [manual, setManual] = useState<AnalysisTest>('independent_t')

  const recommendation = useMemo(() => {
    if (path === 'question') {
      return recommendFromQuestions({
        goal,
        repeated,
        variableType: varType,
        oneCategoricalVariable: oneCategorical,
      })
    }
    return recommendFromDataHints({
      hasRawValues,
      hasSummary,
      hasContingencyTable: hasContingency,
      inferredNumericColumns: numCount,
      inferredCategoricalColumns: catCount,
    })
  }, [path, goal, repeated, varType, oneCategorical, hasRawValues, hasSummary, hasContingency, numCount, catCount])

  return (
    <section className="onboarding panel">
      <h2>Choose your starting point</h2>
      <div className="switch-row">
        <button className={path === 'question' ? 'active' : ''} onClick={() => setPath('question')}>Question-first</button>
        <button className={path === 'data' ? 'active' : ''} onClick={() => setPath('data')}>Data-first</button>
        <button className={path === 'manual' ? 'active' : ''} onClick={() => setPath('manual')}>Manual</button>
      </div>

      {path === 'question' && (
        <div className="grid-two">
          <label>
            Are you comparing groups or looking for a relationship?
            <select value={goal} onChange={(e) => setGoal(e.target.value as typeof goal)}>
              <option value="difference">Comparing groups</option>
              <option value="relationship">Looking for a relationship</option>
            </select>
          </label>
          <label>
            Same people measured twice?
            <select value={repeated ? 'yes' : 'no'} onChange={(e) => setRepeated(e.target.value === 'yes')}>
              <option value="no">No, different groups</option>
              <option value="yes">Yes, repeated/paired</option>
            </select>
          </label>
          <label>
            Variable type
            <select value={varType} onChange={(e) => setVarType(e.target.value as typeof varType)}>
              <option value="numeric">Mostly numeric</option>
              <option value="categorical">Mostly categorical</option>
              <option value="mixed">Mixed</option>
            </select>
          </label>
          <label>
            One categorical variable vs expected pattern?
            <select value={oneCategorical ? 'yes' : 'no'} onChange={(e) => setOneCategorical(e.target.value === 'yes')}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </label>
        </div>
      )}

      {path === 'data' && (
        <div className="grid-two">
          <label>
            Data format
            <select value={hasRawValues ? 'raw' : hasSummary ? 'summary' : hasContingency ? 'table' : 'raw'} onChange={(e) => {
              const v = e.target.value
              setHasRawValues(v === 'raw')
              setHasSummary(v === 'summary')
              setHasContingency(v === 'table')
            }}>
              <option value="raw">Raw values / CSV</option>
              <option value="summary">Summary statistics</option>
              <option value="table">Contingency table</option>
            </select>
          </label>
          <label>
            Likely numeric columns
            <input type="number" min={0} value={numCount} onChange={(e) => setNumCount(Number(e.target.value))} />
          </label>
          <label>
            Likely categorical columns
            <input type="number" min={0} value={catCount} onChange={(e) => setCatCount(Number(e.target.value))} />
          </label>
        </div>
      )}

      {path === 'manual' && (
        <label>
          Choose test
          <select value={manual} onChange={(e) => setManual(e.target.value as AnalysisTest)}>
            <option value="independent_t">Independent-samples t-test (Welch)</option>
            <option value="paired_t">Paired-samples t-test</option>
            <option value="chi_gof">Chi-square goodness-of-fit</option>
            <option value="chi_independence">Chi-square independence</option>
            <option value="correlation">Correlation (Pearson)</option>
          </select>
        </label>
      )}

      {path !== 'manual' && (
        <div className="recommendation">
          <h3>Recommendation: {testLabel(recommendation.recommendedTest)}</h3>
          <p>Confidence: {recommendation.confidence}</p>
          <ul>
            {recommendation.rationale.map((r) => <li key={r}>{r}</li>)}
          </ul>
          {recommendation.warnings.length > 0 && (
            <div className="warn">
              {recommendation.warnings.map((w) => <p key={w}>{w}</p>)}
            </div>
          )}
        </div>
      )}

      <button className="primary" onClick={() => onChooseTest(path === 'manual' ? manual : recommendation.recommendedTest)}>
        Continue with {path === 'manual' ? testLabel(manual) : testLabel(recommendation.recommendedTest)}
      </button>
    </section>
  )
}
