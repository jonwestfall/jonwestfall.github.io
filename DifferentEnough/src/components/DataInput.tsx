import { useEffect, useState } from 'react'
import { parseCsvFile } from '../data/csv'
import { listwiseExclude } from '../data/missing'
import type {
  AnalysisTest,
  ChiGoFInput,
  ContingencyInput,
  CorrelationRawInput,
  CorrelationSummaryInput,
  IndependentRawInput,
  IndependentSummaryInput,
  InputMethod,
  PairedRawInput,
  PairedSummaryInput,
  ParsedCsv,
} from '../types'

interface DataInputProps {
  test: AnalysisTest
  onRun: (method: InputMethod, payload: unknown, missingMessage?: string) => void
  initialPayload?: unknown
  initialMethod?: InputMethod
}

function parseNumberList(text: string): number[] {
  return text
    .split(/[\n,;\t ]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isFinite(n))
}

function parseCountLines(text: string): { labels: string[]; counts: number[] } {
  const rows = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)
  const labels: string[] = []
  const counts: number[] = []
  for (const row of rows) {
    const [l, c] = row.split(',').map((x) => x.trim())
    if (!l || !Number.isFinite(Number(c))) continue
    labels.push(l)
    counts.push(Number(c))
  }
  return { labels, counts }
}

export function DataInput({ test, onRun, initialPayload, initialMethod }: DataInputProps) {
  const [method, setMethod] = useState<InputMethod>(initialMethod ?? 'raw')
  const [error, setError] = useState<string | null>(null)
  const [rawA, setRawA] = useState('')
  const [rawB, setRawB] = useState('')
  const [rawY, setRawY] = useState('')
  const [csvData, setCsvData] = useState<ParsedCsv | null>(null)
  const [kinds, setKinds] = useState<Record<string, 'numeric' | 'categorical'>>({})
  const [map1, setMap1] = useState('')
  const [map2, setMap2] = useState('')
  const [mapGroup, setMapGroup] = useState('')
  const [sum, setSum] = useState<Record<string, string>>({})
  const [tableRows, setTableRows] = useState('Row1,10,20\nRow2,18,25')
  const [tableCols, setTableCols] = useState('Col1,Col2')

  useEffect(() => {
    if (initialPayload == null) return
    if (initialMethod === 'raw' && (test === 'independent_t' || test === 'paired_t' || test === 'correlation')) {
      if (test === 'independent_t') {
        const p = initialPayload as IndependentRawInput
        setRawA(p.groupA.join(', '))
        setRawB(p.groupB.join(', '))
      } else if (test === 'paired_t') {
        const p = initialPayload as PairedRawInput
        setRawA(p.before.join(', '))
        setRawB(p.after.join(', '))
      } else {
        const p = initialPayload as CorrelationRawInput
        setRawA(p.x.join(', '))
        setRawB(p.y.join(', '))
      }
    }
    if (initialMethod === 'table' && test === 'chi_independence') {
      const p = initialPayload as ContingencyInput
      setTableCols(p.colLabels.join(','))
      setTableRows(p.rowLabels.map((row, i) => `${row},${p.counts[i].join(',')}`).join('\n'))
    }
  }, [initialPayload, initialMethod, test])

  async function onCsvPicked(file: File): Promise<void> {
    try {
      const parsed = await parseCsvFile(file)
      setCsvData(parsed)
      setKinds(parsed.inferredKinds)
      setMap1(parsed.headers[0] ?? '')
      setMap2(parsed.headers[1] ?? '')
      setMapGroup(parsed.headers.find((h) => parsed.inferredKinds[h] === 'categorical') ?? parsed.headers[0] ?? '')
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not parse CSV.')
    }
  }

  function run(): void {
    try {
      if (method === 'raw') {
        if (test === 'independent_t') {
          const payload: IndependentRawInput = { groupA: parseNumberList(rawA), groupB: parseNumberList(rawB) }
          if (payload.groupA.length < 2 || payload.groupB.length < 2) throw new Error('Need at least 2 values per group.')
          onRun('raw', payload)
          return
        }
        if (test === 'paired_t') {
          const before = parseNumberList(rawA)
          const after = parseNumberList(rawB)
          if (before.length !== after.length || before.length < 2) throw new Error('Paired data must have equal lengths (>= 2).')
          onRun('raw', { before, after } satisfies PairedRawInput)
          return
        }
        if (test === 'correlation') {
          const x = parseNumberList(rawA)
          const y = parseNumberList(rawB)
          if (x.length !== y.length || x.length < 3) throw new Error('Correlation requires equal-length lists (>= 3).')
          onRun('raw', { x, y } satisfies CorrelationRawInput)
          return
        }
        if (test === 'chi_gof') {
          const lines = parseCountLines(rawY)
          if (lines.labels.length < 2) throw new Error('Need at least 2 categories for goodness-of-fit.')
          onRun('raw', { categories: lines.labels, observed: lines.counts } satisfies ChiGoFInput)
          return
        }
        throw new Error('Raw input for this test is not supported. Use contingency table.')
      }

      if (method === 'summary') {
        if (test === 'independent_t') {
          const payload: IndependentSummaryInput = {
            n1: Number(sum.n1),
            mean1: Number(sum.mean1),
            sd1: Number(sum.sd1),
            n2: Number(sum.n2),
            mean2: Number(sum.mean2),
            sd2: Number(sum.sd2),
          }
          onRun('summary', payload)
          return
        }
        if (test === 'paired_t') {
          const payload: PairedSummaryInput = {
            n: Number(sum.n),
            meanDiff: Number(sum.meanDiff),
            sdDiff: Number(sum.sdDiff),
          }
          onRun('summary', payload)
          return
        }
        if (test === 'correlation') {
          const payload: CorrelationSummaryInput = {
            n: Number(sum.n),
            r: Number(sum.r),
          }
          onRun('summary', payload)
          return
        }
        throw new Error('Summary mode for this test is not available in v1.')
      }

      if (method === 'table') {
        if (test === 'chi_independence') {
          const colLabels = tableCols.split(',').map((v) => v.trim()).filter(Boolean)
          const rowLines = tableRows.split(/\r?\n/).map((v) => v.trim()).filter(Boolean)
          const rowLabels: string[] = []
          const counts: number[][] = []
          for (const row of rowLines) {
            const parts = row.split(',').map((p) => p.trim())
            if (parts.length !== colLabels.length + 1) continue
            rowLabels.push(parts[0])
            counts.push(parts.slice(1).map(Number))
          }
          onRun('table', { rowLabels, colLabels, counts } satisfies ContingencyInput)
          return
        }
        if (test === 'chi_gof') {
          const { labels, counts } = parseCountLines(rawY)
          onRun('table', { categories: labels, observed: counts } satisfies ChiGoFInput)
          return
        }
      }

      if (method === 'csv') {
        if (!csvData) throw new Error('Upload a CSV first.')
        const rows = csvData.rows
        if (test === 'independent_t') {
          const filtered = listwiseExclude(rows, [mapGroup, map1], `Missing ${mapGroup} or ${map1}`)
          const groups = new Map<string, number[]>()
          for (const row of filtered.rows) {
            const g = String(row[mapGroup])
            const v = Number(row[map1])
            if (!groups.has(g)) groups.set(g, [])
            groups.get(g)?.push(v)
          }
          if (groups.size !== 2) throw new Error('Independent t-test needs exactly 2 groups in group column.')
          const values = [...groups.values()]
          onRun('csv', { groupA: values[0], groupB: values[1] } satisfies IndependentRawInput, `${filtered.report.excludedRows} rows excluded listwise (${filtered.report.reason}).`)
          return
        }
        if (test === 'paired_t') {
          const filtered = listwiseExclude(rows, [map1, map2], `Missing ${map1} or ${map2}`)
          const before = filtered.rows.map((r) => Number(r[map1]))
          const after = filtered.rows.map((r) => Number(r[map2]))
          onRun('csv', { before, after } satisfies PairedRawInput, `${filtered.report.excludedRows} rows excluded listwise (${filtered.report.reason}).`)
          return
        }
        if (test === 'correlation') {
          const filtered = listwiseExclude(rows, [map1, map2], `Missing ${map1} or ${map2}`)
          const x = filtered.rows.map((r) => Number(r[map1]))
          const y = filtered.rows.map((r) => Number(r[map2]))
          onRun('csv', { x, y } satisfies CorrelationRawInput, `${filtered.report.excludedRows} rows excluded listwise (${filtered.report.reason}).`)
          return
        }
        if (test === 'chi_independence') {
          const filtered = listwiseExclude(rows, [map1, map2], `Missing ${map1} or ${map2}`)
          const rowLabels = [...new Set(filtered.rows.map((r) => String(r[map1])))]
          const colLabels = [...new Set(filtered.rows.map((r) => String(r[map2])))]
          const counts = rowLabels.map(() => colLabels.map(() => 0))
          for (const row of filtered.rows) {
            const ri = rowLabels.indexOf(String(row[map1]))
            const ci = colLabels.indexOf(String(row[map2]))
            counts[ri][ci] += 1
          }
          onRun('csv', { rowLabels, colLabels, counts } satisfies ContingencyInput, `${filtered.report.excludedRows} rows excluded listwise (${filtered.report.reason}).`)
          return
        }
        if (test === 'chi_gof') {
          const filtered = listwiseExclude(rows, [map1], `Missing ${map1}`)
          const categories = [...new Set(filtered.rows.map((r) => String(r[map1])))]
          const observed = categories.map((c) => filtered.rows.filter((r) => String(r[map1]) === c).length)
          onRun('csv', { categories, observed } satisfies ChiGoFInput, `${filtered.report.excludedRows} rows excluded listwise (${filtered.report.reason}).`)
          return
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not run analysis input parsing.')
    }
  }

  const csvPreview = csvData?.rows.slice(0, 4) ?? []

  return (
    <section className="panel data-input">
      <h2>Data input</h2>
      <div className="switch-row">
        <button className={method === 'raw' ? 'active' : ''} onClick={() => setMethod('raw')}>Raw values</button>
        <button className={method === 'csv' ? 'active' : ''} onClick={() => setMethod('csv')}>CSV upload</button>
        <button className={method === 'summary' ? 'active' : ''} onClick={() => setMethod('summary')}>Summary stats</button>
        <button className={method === 'table' ? 'active' : ''} onClick={() => setMethod('table')}>Contingency table</button>
      </div>

      {method === 'raw' && (
        <div className="grid-two">
          {(test === 'independent_t' || test === 'paired_t' || test === 'correlation') && (
            <>
              <label>Series A / Group A / X<input value={rawA} onChange={(e) => setRawA(e.target.value)} placeholder="1,2,3,4" /></label>
              <label>Series B / Group B / Y<input value={rawB} onChange={(e) => setRawB(e.target.value)} placeholder="2,3,4,5" /></label>
            </>
          )}
          {test === 'chi_gof' && (
            <label className="full-width">Category,Count lines<textarea value={rawY} onChange={(e) => setRawY(e.target.value)} rows={7} /></label>
          )}
          {test === 'chi_independence' && <p>Use contingency table mode for this test.</p>}
        </div>
      )}

      {method === 'csv' && (
        <div className="csv-panel">
          <label className="file-label">
            Upload CSV
            <input type="file" accept=".csv,text/csv" onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void onCsvPicked(file)
            }} />
          </label>
          {csvData && (
            <>
              <div className="grid-two">
                <label>Primary column<select value={map1} onChange={(e) => setMap1(e.target.value)}>{csvData.headers.map((h) => <option key={h}>{h}</option>)}</select></label>
                <label>Secondary column<select value={map2} onChange={(e) => setMap2(e.target.value)}>{csvData.headers.map((h) => <option key={h}>{h}</option>)}</select></label>
                {(test === 'independent_t') && (
                  <label>Group column<select value={mapGroup} onChange={(e) => setMapGroup(e.target.value)}>{csvData.headers.map((h) => <option key={h}>{h}</option>)}</select></label>
                )}
              </div>
              <div className="preview">
                <h4>Preview (first 4 rows)</h4>
                <div className="type-row">
                  {csvData.headers.map((h) => (
                    <label key={`kind-${h}`}>
                      {h} type
                      <select
                        value={kinds[h]}
                        onChange={(e) =>
                          setKinds((k) => ({ ...k, [h]: e.target.value as 'numeric' | 'categorical' }))
                        }
                      >
                        <option value="numeric">numeric</option>
                        <option value="categorical">categorical</option>
                      </select>
                    </label>
                  ))}
                </div>
                <table>
                  <thead>
                    <tr>{csvData.headers.map((h) => <th key={h}>{h}<small>{kinds[h]}</small></th>)}</tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((row, i) => (
                      <tr key={i.toString()}>
                        {csvData.headers.map((h) => <td key={`${i}-${h}`}>{row[h]}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {method === 'summary' && (
        <div className="grid-two">
          {test === 'independent_t' && ['n1', 'mean1', 'sd1', 'n2', 'mean2', 'sd2'].map((k) => (
            <label key={k}>{k}<input value={sum[k] ?? ''} onChange={(e) => setSum((s) => ({ ...s, [k]: e.target.value }))} /></label>
          ))}
          {test === 'paired_t' && ['n', 'meanDiff', 'sdDiff'].map((k) => (
            <label key={k}>{k}<input value={sum[k] ?? ''} onChange={(e) => setSum((s) => ({ ...s, [k]: e.target.value }))} /></label>
          ))}
          {test === 'correlation' && ['n', 'r'].map((k) => (
            <label key={k}>{k}<input value={sum[k] ?? ''} onChange={(e) => setSum((s) => ({ ...s, [k]: e.target.value }))} /></label>
          ))}
          {(test === 'chi_gof' || test === 'chi_independence') && <p>Use raw or table mode for chi-square in v1.</p>}
        </div>
      )}

      {method === 'table' && (
        <div className="grid-two">
          {test === 'chi_independence' && (
            <>
              <label>Column labels (comma-separated)<input value={tableCols} onChange={(e) => setTableCols(e.target.value)} /></label>
              <label className="full-width">Rows: rowLabel,val1,val2,...<textarea rows={8} value={tableRows} onChange={(e) => setTableRows(e.target.value)} /></label>
            </>
          )}
          {test === 'chi_gof' && (
            <label className="full-width">Category,Count lines<textarea value={rawY} onChange={(e) => setRawY(e.target.value)} rows={7} /></label>
          )}
        </div>
      )}

      {error && <p className="error">{error}</p>}
      <button className="primary" onClick={run}>Run analysis</button>
    </section>
  )
}
