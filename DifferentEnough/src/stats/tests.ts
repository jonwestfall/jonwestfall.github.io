import type {
  ChiGoFInput,
  ContingencyInput,
  CorrelationRawInput,
  CorrelationSummaryInput,
  IndependentRawInput,
  IndependentSummaryInput,
  PairedRawInput,
  PairedSummaryInput,
} from '../types'
import { chiSquareCdf, mean, normalCdf, pearsonR, sd, tCdf, variance } from './math'

export interface TTestOutput {
  t: number
  df: number
  pValue: number
  meanDiff: number
  ciLower: number
  ciUpper: number
  n1: number
  n2: number
  sd1: number
  sd2: number
  hedgesG: number
}

export interface PairedTestOutput {
  t: number
  df: number
  pValue: number
  meanDiff: number
  ciLower: number
  ciUpper: number
  n: number
  sdDiff: number
  dz: number
}

export interface ChiOutput {
  chiSquare: number
  df: number
  pValue: number
  n: number
  effect: number
}

export interface CorrelationOutput {
  r: number
  pValue: number
  n: number
  ciLower: number
  ciUpper: number
}

function twoTailedPFromT(t: number, df: number): number {
  const tail = 1 - tCdf(Math.abs(t), df)
  return Math.min(1, Math.max(0, 2 * tail))
}

function tCritical95(df: number): number {
  let lo = 0
  let hi = 20
  const target = 0.975
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2
    if (tCdf(mid, df) < target) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

export function independentTTest(input: IndependentRawInput | IndependentSummaryInput): TTestOutput {
  const fromRaw = 'groupA' in input
  const groupA = fromRaw ? input.groupA : []
  const groupB = fromRaw ? input.groupB : []

  const n1 = fromRaw ? groupA.length : input.n1
  const n2 = fromRaw ? groupB.length : input.n2
  const mean1 = fromRaw ? mean(groupA) : input.mean1
  const mean2 = fromRaw ? mean(groupB) : input.mean2
  const sd1 = fromRaw ? sd(groupA) : input.sd1
  const sd2 = fromRaw ? sd(groupB) : input.sd2
  const var1 = sd1 ** 2
  const var2 = sd2 ** 2

  const se = Math.sqrt(var1 / n1 + var2 / n2)
  const meanDiff = mean1 - mean2
  const t = meanDiff / se
  const dfNumerator = (var1 / n1 + var2 / n2) ** 2
  const dfDenominator = var1 ** 2 / (n1 ** 2 * (n1 - 1)) + var2 ** 2 / (n2 ** 2 * (n2 - 1))
  const df = dfNumerator / dfDenominator
  const pValue = twoTailedPFromT(t, df)
  const tCrit = tCritical95(df)
  const ciLower = meanDiff - tCrit * se
  const ciUpper = meanDiff + tCrit * se

  const pooled = Math.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2))
  const d = meanDiff / pooled
  const j = 1 - 3 / (4 * (n1 + n2) - 9)
  const hedgesG = d * j

  return { t, df, pValue, meanDiff, ciLower, ciUpper, n1, n2, sd1, sd2, hedgesG }
}

export function pairedTTest(input: PairedRawInput | PairedSummaryInput): PairedTestOutput {
  if ('before' in input) {
    const diffs = input.before.map((b, i) => b - input.after[i])
    const n = diffs.length
    const meanDiff = mean(diffs)
    const sdDiff = sd(diffs)
    const se = sdDiff / Math.sqrt(n)
    const t = meanDiff / se
    const df = n - 1
    const pValue = twoTailedPFromT(t, df)
    const tCrit = tCritical95(df)
    const ciLower = meanDiff - tCrit * se
    const ciUpper = meanDiff + tCrit * se
    const dz = meanDiff / sdDiff
    return { t, df, pValue, meanDiff, ciLower, ciUpper, n, sdDiff, dz }
  }

  const n = input.n
  const se = input.sdDiff / Math.sqrt(n)
  const t = input.meanDiff / se
  const df = n - 1
  const pValue = twoTailedPFromT(t, df)
  const tCrit = tCritical95(df)
  const ciLower = input.meanDiff - tCrit * se
  const ciUpper = input.meanDiff + tCrit * se
  return {
    t,
    df,
    pValue,
    meanDiff: input.meanDiff,
    ciLower,
    ciUpper,
    n,
    sdDiff: input.sdDiff,
    dz: input.meanDiff / input.sdDiff,
  }
}

export function chiSquareGoodnessOfFit(input: ChiGoFInput): ChiOutput {
  const n = input.observed.reduce((acc, c) => acc + c, 0)
  const k = input.observed.length
  const expected = input.expected ?? Array.from({ length: k }, () => n / k)
  let chiSquare = 0
  for (let i = 0; i < k; i += 1) {
    const diff = input.observed[i] - expected[i]
    chiSquare += (diff * diff) / expected[i]
  }
  const df = k - 1
  const pValue = 1 - chiSquareCdf(chiSquare, df)
  const effect = Math.sqrt(chiSquare / n)
  return { chiSquare, df, pValue, n, effect }
}

export function chiSquareIndependence(input: ContingencyInput): ChiOutput {
  const rowSums = input.counts.map((row) => row.reduce((acc, c) => acc + c, 0))
  const colSums = input.colLabels.map((_, col) =>
    input.counts.reduce((acc, row) => acc + row[col], 0),
  )
  const n = rowSums.reduce((acc, c) => acc + c, 0)
  let chiSquare = 0
  for (let r = 0; r < input.rowLabels.length; r += 1) {
    for (let c = 0; c < input.colLabels.length; c += 1) {
      const expected = (rowSums[r] * colSums[c]) / n
      const diff = input.counts[r][c] - expected
      chiSquare += (diff * diff) / expected
    }
  }
  const df = (input.rowLabels.length - 1) * (input.colLabels.length - 1)
  const pValue = 1 - chiSquareCdf(chiSquare, df)
  const minDim = Math.min(input.rowLabels.length - 1, input.colLabels.length - 1)
  const effect = Math.sqrt(chiSquare / (n * minDim))
  return { chiSquare, df, pValue, n, effect }
}

export function correlationTest(input: CorrelationRawInput | CorrelationSummaryInput): CorrelationOutput {
  const n = 'x' in input ? input.x.length : input.n
  const r = 'x' in input ? pearsonR(input.x, input.y) : input.r
  const t = r * Math.sqrt((n - 2) / (1 - r ** 2))
  const pValue = twoTailedPFromT(t, n - 2)

  const z = 0.5 * Math.log((1 + r) / (1 - r))
  const seZ = 1 / Math.sqrt(n - 3)
  const zCrit = 1.96
  const zLow = z - zCrit * seZ
  const zHigh = z + zCrit * seZ
  const ciLower = (Math.exp(2 * zLow) - 1) / (Math.exp(2 * zLow) + 1)
  const ciUpper = (Math.exp(2 * zHigh) - 1) / (Math.exp(2 * zHigh) + 1)

  return { r, pValue, n, ciLower, ciUpper }
}

function skewness(values: number[]): number {
  const m = mean(values)
  const s = sd(values, false)
  if (!Number.isFinite(s) || s === 0) return 0
  const n = values.length
  const sum3 = values.reduce((acc, v) => acc + ((v - m) / s) ** 3, 0)
  return sum3 / n
}

export function recommendSpearman(x: number[], y: number[]): string | null {
  const n = x.length
  if (n < 10) return 'Small sample size can make Pearson unstable. Consider Spearman as a robustness check.'

  const sx = Math.abs(skewness(x))
  const sy = Math.abs(skewness(y))
  const uniqueX = new Set(x).size
  const uniqueY = new Set(y).size
  const tiedRatio = Math.min(uniqueX / n, uniqueY / n)

  if (sx > 1 || sy > 1 || tiedRatio < 0.7) {
    return 'Data look skewed or heavily tied. A rank-based Spearman correlation may be more appropriate.'
  }
  return null
}

export function quickNormalityConcern(values: number[]): boolean {
  const n = values.length
  if (n < 8) return true
  const s = Math.abs(values.reduce((acc, v) => acc + (v - mean(values)) ** 3, 0) / n)
  return s > 2.5 * variance(values, false) ** 1.5
}

export function practicalSignificanceReminder(effect: number, pValue: number): string {
  const weak = Math.abs(effect) < 0.2
  if (pValue < 0.05 && weak) {
    return 'Statistically significant, but effect size looks small. Useful? Maybe. Big? Probably not.'
  }
  if (pValue >= 0.05 && !weak) {
    return 'Effect may be meaningful, but uncertainty is still high. This could be underpowered.'
  }
  return 'Significance and practical importance are different questions.'
}

export function pToWords(p: number): string {
  if (p < 0.001) return 'p < .001'
  return `p = ${p.toFixed(3).replace(/^0/, '.')}`
}

export function pToStability(p: number): string {
  if (p < 0.01) return 'fairly stable signal'
  if (p < 0.05) return 'possible signal, but keep context in view'
  if (p < 0.1) return 'weak evidence'
  return 'could easily be noise'
}

export function rSquared(r: number): number {
  return r ** 2
}

export function phiFrom2x2(input: ContingencyInput): number | null {
  if (input.rowLabels.length !== 2 || input.colLabels.length !== 2) return null
  const [[a, b], [c, d]] = input.counts
  const denom = Math.sqrt((a + b) * (c + d) * (a + c) * (b + d))
  return denom === 0 ? null : (a * d - b * c) / denom
}

export function normalApproxP(z: number): number {
  const tail = 1 - normalCdf(Math.abs(z))
  return 2 * tail
}
