export type AnalysisTest =
  | 'independent_t'
  | 'paired_t'
  | 'chi_gof'
  | 'chi_independence'
  | 'correlation'

export type InputMethod = 'raw' | 'csv' | 'summary' | 'table'

export type ColumnKind = 'numeric' | 'categorical'

export interface DataColumn {
  name: string
  kind: ColumnKind
  values: (number | string | null)[]
}

export interface ParsedCsv {
  headers: string[]
  rows: Record<string, string>[]
  inferredKinds: Record<string, ColumnKind>
}

export interface Recommendation {
  recommendedTest: AnalysisTest
  confidence: 'low' | 'medium' | 'high'
  rationale: string[]
  warnings: string[]
  considerAlternative?: string
}

export interface AnalysisWarnings {
  assumptions: string[]
  sample: string[]
  missingData: string[]
  interpretation: string[]
}

export interface TrustPanel {
  summary: string
  bullets: string[]
  riskLevel: 'low' | 'moderate' | 'high'
}

export interface Descriptives {
  label: string
  value: string
}

export interface EffectSizeInfo {
  name: string
  value: number
  formatted: string
  interpretation: string
}

export interface CIInfo {
  label: string
  lower: number
  upper: number
  formatted: string
}

export interface AnalysisResult {
  test: AnalysisTest
  plainLanguage: string
  formalResult: string
  apa: string
  pValue: number
  significant: boolean
  alpha: number
  descriptives: Descriptives[]
  effectSize: EffectSizeInfo
  confidenceInterval?: CIInfo
  warnings: AnalysisWarnings
  trust: TrustPanel
  deepExplanation: string[]
  chartData?: unknown
}

export interface IndependentRawInput {
  groupA: number[]
  groupB: number[]
}

export interface PairedRawInput {
  before: number[]
  after: number[]
}

export interface CorrelationRawInput {
  x: number[]
  y: number[]
}

export interface IndependentSummaryInput {
  n1: number
  mean1: number
  sd1: number
  n2: number
  mean2: number
  sd2: number
}

export interface PairedSummaryInput {
  n: number
  meanDiff: number
  sdDiff: number
}

export interface CorrelationSummaryInput {
  n: number
  r: number
}

export interface ChiGoFInput {
  categories: string[]
  observed: number[]
  expected?: number[]
}

export interface ContingencyInput {
  rowLabels: string[]
  colLabels: string[]
  counts: number[][]
}

export interface MissingDataReport {
  originalRows: number
  analyzedRows: number
  excludedRows: number
  reason: string
}

export interface PersistedAnalysis {
  app: 'Different Enough?'
  version: 1
  savedAt: string
  test: AnalysisTest
  inputMethod: InputMethod
  payload: unknown
  result: AnalysisResult
}

export interface ExampleDataset {
  id: string
  title: string
  subtitle: string
  description: string
  test: AnalysisTest
  inputMethod: InputMethod
  payload: unknown
}
