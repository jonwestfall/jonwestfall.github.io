import type {
  ContingencyInput,
  CorrelationRawInput,
  IndependentRawInput,
  PairedRawInput,
} from '../types'

function normalize(values: number[], minPx: number, maxPx: number): number[] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  if (min === max) return values.map(() => (minPx + maxPx) / 2)
  return values.map((v) => minPx + ((v - min) / (max - min)) * (maxPx - minPx))
}

export function MeanBars({ data }: { data: IndependentRawInput | PairedRawInput | null }) {
  if (!data) return null
  const means = 'groupA' in data
    ? [data.groupA.reduce((a, b) => a + b, 0) / data.groupA.length, data.groupB.reduce((a, b) => a + b, 0) / data.groupB.length]
    : [data.before.reduce((a, b) => a + b, 0) / data.before.length, data.after.reduce((a, b) => a + b, 0) / data.after.length]
  const labels = 'groupA' in data ? ['Group A', 'Group B'] : ['Before', 'After']
  const max = Math.max(...means, 1)

  return (
    <div className="mini-chart">
      {means.map((m, i) => (
        <div key={labels[i]} className="bar-block">
          <div className="bar" style={{ height: `${(m / max) * 120}px` }} />
          <span>{labels[i]}</span>
          <strong>{m.toFixed(1)}</strong>
        </div>
      ))}
    </div>
  )
}

export function Scatter({ data }: { data: CorrelationRawInput | null }) {
  if (!data) return null
  if (data.x.length < 2) return null
  const x = normalize(data.x, 20, 280)
  const y = normalize(data.y, 180, 20)
  return (
    <svg width="300" height="200" className="scatter">
      <rect x={0} y={0} width={300} height={200} fill="transparent" />
      {x.map((cx, i) => (
        <circle key={`${cx}-${y[i]}`} cx={cx} cy={y[i]} r={4} />
      ))}
    </svg>
  )
}

export function HeatTable({ data }: { data: ContingencyInput | null }) {
  if (!data) return null
  const max = Math.max(...data.counts.flat(), 1)
  return (
    <table className="heat-table">
      <thead>
        <tr>
          <th> </th>
          {data.colLabels.map((c) => (
            <th key={c}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.rowLabels.map((r, ri) => (
          <tr key={r}>
            <th>{r}</th>
            {data.colLabels.map((c, ci) => {
              const val = data.counts[ri][ci]
              const opacity = Math.max(0.15, val / max)
              return (
                <td key={`${r}-${c}`} style={{ background: `rgba(22, 119, 255, ${opacity})` }}>
                  {val}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
