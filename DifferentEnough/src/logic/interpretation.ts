import type { AnalysisResult, AnalysisWarnings, TrustPanel } from '../types'
import { pToStability, practicalSignificanceReminder } from '../stats/tests'

function effectLabel(value: number): string {
  const abs = Math.abs(value)
  if (abs < 0.1) return 'trivial-ish (rough convention)'
  if (abs < 0.3) return 'small-ish (rough convention)'
  if (abs < 0.5) return 'moderate-ish (rough convention)'
  return 'large-ish (rough convention)'
}

export function makeWarnings(
  assumptionFlags: string[],
  sampleFlags: string[],
  missingFlags: string[],
  interpretationFlags: string[],
): AnalysisWarnings {
  return {
    assumptions: assumptionFlags,
    sample: sampleFlags,
    missingData: missingFlags,
    interpretation: interpretationFlags,
  }
}

export function trustPanelFromWarnings(warnings: AnalysisWarnings, pValue: number): TrustPanel {
  const bulletCount =
    warnings.assumptions.length +
    warnings.sample.length +
    warnings.missingData.length +
    warnings.interpretation.length
  const riskLevel = bulletCount >= 4 || pValue > 0.1 ? 'high' : bulletCount >= 2 ? 'moderate' : 'low'
  const summary =
    riskLevel === 'low'
      ? 'Reasonably interpretable, with normal caution.'
      : riskLevel === 'moderate'
        ? 'Useful, but interpret with caution.'
        : 'Fragile result. Interpret very cautiously.'

  return {
    summary,
    bullets: [
      ...warnings.assumptions,
      ...warnings.sample,
      ...warnings.missingData,
      ...warnings.interpretation,
    ],
    riskLevel,
  }
}

export function plainLanguageFromResult(
  testName: string,
  pValue: number,
  effectValue: number,
  relationship = false,
): string {
  if (pValue < 0.05) {
    const base = relationship
      ? 'There appears to be a relationship here, but that does not tell us what caused it.'
      : 'This difference is unlikely to be due to random chance alone.'
    return `${base} Signal strength looks ${effectLabel(effectValue)}.`
  }
  return `This could easily be noise, so do not plan the parade yet. For ${testName}, the evidence is ${pToStability(pValue)}.`
}

export function deepExplanation(
  testChoiceReason: string,
  nullText: string,
  pValueText: string,
  effectName: string,
  ciText: string,
): string[] {
  return [
    `Why this test: ${testChoiceReason}`,
    `Null hypothesis: ${nullText}`,
    `P-value meaning: ${pValueText}`,
    `Effect size (${effectName}): shows magnitude, not just detectability.`,
    `Confidence interval: ${ciText}`,
    'Common mistake to avoid: statistical significance is not practical significance.',
  ]
}

export function practicalReminder(effectValue: number, pValue: number): string {
  return practicalSignificanceReminder(effectValue, pValue)
}

export function withApa(result: Omit<AnalysisResult, 'apa'>, apa: string): AnalysisResult {
  return { ...result, apa }
}
