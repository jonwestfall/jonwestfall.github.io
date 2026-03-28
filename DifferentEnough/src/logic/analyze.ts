import type {
  AnalysisResult,
  AnalysisTest,
  ChiGoFInput,
  ContingencyInput,
  CorrelationRawInput,
  CorrelationSummaryInput,
  IndependentRawInput,
  IndependentSummaryInput,
  PairedRawInput,
  PairedSummaryInput,
} from '../types'
import {
  chiSquareGoodnessOfFit,
  chiSquareIndependence,
  correlationTest,
  independentTTest,
  pToWords,
  pairedTTest,
  practicalSignificanceReminder,
  quickNormalityConcern,
  recommendSpearman,
} from '../stats/tests'
import { deepExplanation, makeWarnings, plainLanguageFromResult, trustPanelFromWarnings } from './interpretation'

function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return 'NA'
  return n.toFixed(digits)
}

function effectText(value: number): string {
  const abs = Math.abs(value)
  if (abs < 0.1) return 'trivial (rough convention)'
  if (abs < 0.3) return 'small (rough convention)'
  if (abs < 0.5) return 'moderate (rough convention)'
  return 'large (rough convention)'
}

export function analyze(test: AnalysisTest, payload: unknown): AnalysisResult {
  if (test === 'independent_t') {
    const out = independentTTest(payload as IndependentRawInput | IndependentSummaryInput)
    const assumptions: string[] = []
    if ('groupA' in (payload as Record<string, unknown>)) {
      const p = payload as IndependentRawInput
      if (quickNormalityConcern(p.groupA) || quickNormalityConcern(p.groupB)) {
        assumptions.push('Group distributions look non-normal-ish. Welch helps, but still inspect plots.')
      }
    }
    if (out.n1 < 20 || out.n2 < 20) assumptions.push('Small sample in at least one group can make estimates unstable.')
    const warnings = makeWarnings(
      assumptions,
      [],
      [],
      [practicalSignificanceReminder(out.hedgesG, out.pValue)],
    )
    const trust = trustPanelFromWarnings(warnings, out.pValue)
    const plainLanguage = plainLanguageFromResult('independent t-test', out.pValue, out.hedgesG)
    return {
      test,
      plainLanguage,
      formalResult: `Welch's t(${fmt(out.df, 1)}) = ${fmt(out.t, 2)}, ${pToWords(out.pValue)}.`,
      apa: `<em>t</em>(${fmt(out.df, 1)}) = ${fmt(out.t, 2)}, ${pToWords(out.pValue)}, <em>g</em> = ${fmt(out.hedgesG, 2)}, 95% CI [${fmt(out.ciLower, 2)}, ${fmt(out.ciUpper, 2)}].`,
      pValue: out.pValue,
      significant: out.pValue < 0.05,
      alpha: 0.05,
      descriptives: [
        { label: 'n group A', value: String(out.n1) },
        { label: 'n group B', value: String(out.n2) },
        { label: 'Mean difference', value: fmt(out.meanDiff, 2) },
        { label: 'SD group A', value: fmt(out.sd1, 2) },
        { label: 'SD group B', value: fmt(out.sd2, 2) },
      ],
      effectSize: {
        name: "Hedges' g",
        value: out.hedgesG,
        formatted: fmt(out.hedgesG, 2),
        interpretation: effectText(out.hedgesG),
      },
      confidenceInterval: {
        label: '95% CI (mean difference)',
        lower: out.ciLower,
        upper: out.ciUpper,
        formatted: `[${fmt(out.ciLower, 2)}, ${fmt(out.ciUpper, 2)}]`,
      },
      warnings,
      trust,
      deepExplanation: deepExplanation(
        'You selected comparison of two independent groups on a numeric outcome.',
        'The group means are equal in the population.',
        `If the null were true, results at least this extreme would occur with probability ${pToWords(out.pValue)}.`,
        "Hedges' g",
        `The likely mean difference range is ${fmt(out.ciLower, 2)} to ${fmt(out.ciUpper, 2)}.`,
      ),
      chartData: payload,
    }
  }

  if (test === 'paired_t') {
    const out = pairedTTest(payload as PairedRawInput | PairedSummaryInput)
    const warnings = makeWarnings(
      out.n < 20 ? ['Small paired sample can be noisy.'] : [],
      [],
      [],
      [practicalSignificanceReminder(out.dz, out.pValue)],
    )
    const trust = trustPanelFromWarnings(warnings, out.pValue)
    return {
      test,
      plainLanguage: plainLanguageFromResult('paired t-test', out.pValue, out.dz),
      formalResult: `Paired t(${out.df}) = ${fmt(out.t, 2)}, ${pToWords(out.pValue)}.`,
      apa: `<em>t</em>(${out.df}) = ${fmt(out.t, 2)}, ${pToWords(out.pValue)}, <em>d</em><sub>z</sub> = ${fmt(out.dz, 2)}, 95% CI [${fmt(out.ciLower, 2)}, ${fmt(out.ciUpper, 2)}].`,
      pValue: out.pValue,
      significant: out.pValue < 0.05,
      alpha: 0.05,
      descriptives: [
        { label: 'n pairs', value: String(out.n) },
        { label: 'Mean difference', value: fmt(out.meanDiff, 2) },
        { label: 'SD of differences', value: fmt(out.sdDiff, 2) },
      ],
      effectSize: {
        name: 'Paired Cohen dz',
        value: out.dz,
        formatted: fmt(out.dz, 2),
        interpretation: effectText(out.dz),
      },
      confidenceInterval: {
        label: '95% CI (mean difference)',
        lower: out.ciLower,
        upper: out.ciUpper,
        formatted: `[${fmt(out.ciLower, 2)}, ${fmt(out.ciUpper, 2)}]`,
      },
      warnings,
      trust,
      deepExplanation: deepExplanation(
        'You selected repeated measures on the same units.',
        'The average within-person difference is zero.',
        `Observed difference has probability ${pToWords(out.pValue)} under the null.`,
        'dz',
        `CI spans ${fmt(out.ciLower, 2)} to ${fmt(out.ciUpper, 2)}.`,
      ),
      chartData: payload,
    }
  }

  if (test === 'chi_gof') {
    const out = chiSquareGoodnessOfFit(payload as ChiGoFInput)
    const warnings = makeWarnings(
      [],
      out.n < 100 ? ['Small total sample can make categorical inferences shaky.'] : [],
      [],
      [practicalSignificanceReminder(out.effect, out.pValue)],
    )
    const trust = trustPanelFromWarnings(warnings, out.pValue)
    return {
      test,
      plainLanguage: plainLanguageFromResult('chi-square goodness-of-fit', out.pValue, out.effect),
      formalResult: `Chi-square(${out.df}) = ${fmt(out.chiSquare, 2)}, ${pToWords(out.pValue)}.`,
      apa: `<em>χ</em><sup>2</sup>(${out.df}) = ${fmt(out.chiSquare, 2)}, ${pToWords(out.pValue)}, <em>w</em> = ${fmt(out.effect, 2)}.`,
      pValue: out.pValue,
      significant: out.pValue < 0.05,
      alpha: 0.05,
      descriptives: [{ label: 'Total n', value: String(out.n) }],
      effectSize: {
        name: "Cohen's w",
        value: out.effect,
        formatted: fmt(out.effect, 2),
        interpretation: effectText(out.effect),
      },
      warnings,
      trust,
      deepExplanation: deepExplanation(
        'You compared observed category counts against expected counts.',
        'Observed category distribution matches expected distribution.',
        `If null is true, this chi-square would appear with probability ${pToWords(out.pValue)}.`,
        "Cohen's w",
        'CI is not included for this effect in v1.',
      ),
      chartData: payload,
    }
  }

  if (test === 'chi_independence') {
    const out = chiSquareIndependence(payload as ContingencyInput)
    const rows = (payload as ContingencyInput).rowLabels.length
    const cols = (payload as ContingencyInput).colLabels.length
    const isPhi = rows === 2 && cols === 2
    const warnings = makeWarnings(
      [],
      out.n < 100 ? ['Small contingency total can create unstable cell estimates.'] : [],
      [],
      [practicalSignificanceReminder(out.effect, out.pValue)],
    )
    const trust = trustPanelFromWarnings(warnings, out.pValue)
    return {
      test,
      plainLanguage: plainLanguageFromResult('chi-square independence', out.pValue, out.effect, true),
      formalResult: `Chi-square(${out.df}) = ${fmt(out.chiSquare, 2)}, ${pToWords(out.pValue)}.`,
      apa: `<em>χ</em><sup>2</sup>(${out.df}) = ${fmt(out.chiSquare, 2)}, ${pToWords(out.pValue)}, <em>${isPhi ? 'φ' : "V"}</em> = ${fmt(out.effect, 2)}.`,
      pValue: out.pValue,
      significant: out.pValue < 0.05,
      alpha: 0.05,
      descriptives: [{ label: 'Total n', value: String(out.n) }],
      effectSize: {
        name: isPhi ? 'Phi' : "Cramer's V",
        value: out.effect,
        formatted: fmt(out.effect, 2),
        interpretation: effectText(out.effect),
      },
      warnings,
      trust,
      deepExplanation: deepExplanation(
        'You tested association between two categorical variables.',
        'The variables are independent in the population.',
        `Probability under the null is ${pToWords(out.pValue)}.`,
        isPhi ? 'Phi' : "Cramer's V",
        'CI is not included for this effect in v1.',
      ),
      chartData: payload,
    }
  }

  const corrInput = payload as CorrelationRawInput | CorrelationSummaryInput
  const out = correlationTest(corrInput)
  const warningsArray: string[] = []
  if ('x' in corrInput) {
    const maybeSpearman = recommendSpearman(corrInput.x, corrInput.y)
    if (maybeSpearman) warningsArray.push(maybeSpearman)
  }
  if (out.n < 30) warningsArray.push('Small sample can make r unstable and confidence intervals wide.')
  const warnings = makeWarnings(
    warningsArray,
    [],
    [],
    [practicalSignificanceReminder(out.r, out.pValue)],
  )
  const trust = trustPanelFromWarnings(warnings, out.pValue)
  return {
    test,
    plainLanguage: plainLanguageFromResult('correlation', out.pValue, out.r, true),
    formalResult: `r(${out.n - 2}) = ${fmt(out.r, 2)}, ${pToWords(out.pValue)}.`,
    apa: `<em>r</em>(${out.n - 2}) = ${fmt(out.r, 2)}, ${pToWords(out.pValue)}, 95% CI [${fmt(out.ciLower, 2)}, ${fmt(out.ciUpper, 2)}].`,
    pValue: out.pValue,
    significant: out.pValue < 0.05,
    alpha: 0.05,
    descriptives: [{ label: 'n', value: String(out.n) }],
    effectSize: {
      name: 'r',
      value: out.r,
      formatted: fmt(out.r, 2),
      interpretation: effectText(out.r),
    },
    confidenceInterval: {
      label: '95% CI (r)',
      lower: out.ciLower,
      upper: out.ciUpper,
      formatted: `[${fmt(out.ciLower, 2)}, ${fmt(out.ciUpper, 2)}]`,
    },
    warnings,
    trust,
    deepExplanation: deepExplanation(
      'You selected association between two numeric variables.',
      'Population correlation is zero.',
      `Under the null, this correlation has probability ${pToWords(out.pValue)}.`,
      'r',
      `Likely population correlation is between ${fmt(out.ciLower, 2)} and ${fmt(out.ciUpper, 2)}.`,
    ),
    chartData: payload,
  }
}
