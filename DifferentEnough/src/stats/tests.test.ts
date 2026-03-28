import { describe, expect, it } from 'vitest'
import { chiSquareIndependence, correlationTest, independentTTest, pairedTTest } from './tests'

describe('stats engine', () => {
  it('runs Welch independent t-test with plausible direction', () => {
    const out = independentTTest({
      groupA: [10, 11, 12, 13, 14],
      groupB: [8, 9, 9, 10, 9],
    })
    expect(out.t).toBeGreaterThan(0)
    expect(out.pValue).toBeLessThan(0.05)
  })

  it('runs paired t-test', () => {
    const out = pairedTTest({
      before: [10, 12, 14, 16, 18],
      after: [9, 11, 13, 15, 17],
    })
    expect(out.meanDiff).toBeCloseTo(1, 5)
    expect(out.pValue).toBeLessThan(0.05)
  })

  it('runs chi-square independence', () => {
    const out = chiSquareIndependence({
      rowLabels: ['A', 'B'],
      colLabels: ['Yes', 'No'],
      counts: [
        [30, 10],
        [12, 28],
      ],
    })
    expect(out.chiSquare).toBeGreaterThan(0)
    expect(out.pValue).toBeLessThan(0.01)
  })

  it('runs correlation with strong signal', () => {
    const out = correlationTest({
      x: [1, 2, 3, 4, 5, 6],
      y: [1.1, 1.8, 3.2, 4.1, 5.1, 5.9],
    })
    expect(out.r).toBeGreaterThan(0.95)
    expect(out.pValue).toBeLessThan(0.01)
  })
})
