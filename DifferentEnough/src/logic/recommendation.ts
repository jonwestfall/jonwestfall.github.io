import type { AnalysisTest, Recommendation } from '../types'

export interface QuestionFirstAnswers {
  goal: 'difference' | 'relationship'
  repeated?: boolean
  variableType?: 'numeric' | 'categorical' | 'mixed'
  oneCategoricalVariable?: boolean
}

export function recommendFromQuestions(answers: QuestionFirstAnswers): Recommendation {
  if (answers.goal === 'relationship') {
    if (answers.variableType === 'numeric') {
      return {
        recommendedTest: 'correlation',
        confidence: 'high',
        rationale: ['You are examining a relationship between two numeric variables.'],
        warnings: [],
      }
    }
    return {
      recommendedTest: 'chi_independence',
      confidence: 'medium',
      rationale: ['Relationship questions with categorical variables usually map to chi-square of independence.'],
      warnings: ['If one variable is numeric and one categorical, you may need a different test outside v1.'],
    }
  }

  if (answers.oneCategoricalVariable) {
    return {
      recommendedTest: 'chi_gof',
      confidence: 'high',
      rationale: ['You appear to have one categorical variable and want to compare observed counts to expected counts.'],
      warnings: [],
    }
  }

  if (answers.repeated) {
    return {
      recommendedTest: 'paired_t',
      confidence: 'high',
      rationale: ['Same people measured twice suggests paired-samples t-test.'],
      warnings: [],
    }
  }

  return {
    recommendedTest: 'independent_t',
    confidence: answers.variableType === 'numeric' ? 'high' : 'medium',
    rationale: ['Comparing two different groups on a numeric outcome suggests independent-samples t-test.'],
    warnings:
      answers.variableType === 'numeric'
        ? []
        : ['If outcomes are categorical, this recommendation may be inappropriate.'],
  }
}

export interface DataFirstHints {
  hasRawValues: boolean
  hasSummary: boolean
  hasContingencyTable: boolean
  inferredNumericColumns: number
  inferredCategoricalColumns: number
}

export function recommendFromDataHints(hints: DataFirstHints): Recommendation {
  if (hints.hasContingencyTable) {
    return {
      recommendedTest: 'chi_independence',
      confidence: 'medium',
      rationale: ['A contingency table usually points to chi-square analysis.'],
      warnings: ['If this table is one variable versus expected proportions, switch to chi-square goodness-of-fit.'],
    }
  }

  if (hints.inferredNumericColumns >= 2 && hints.hasRawValues) {
    return {
      recommendedTest: 'correlation',
      confidence: 'medium',
      rationale: ['Two numeric columns are often suitable for correlation.'],
      warnings: ['If the goal is group comparison, map one categorical and one numeric column for a t-test instead.'],
    }
  }

  if (hints.inferredCategoricalColumns >= 2) {
    return {
      recommendedTest: 'chi_independence',
      confidence: 'medium',
      rationale: ['Two categorical variables suggest chi-square independence.'],
      warnings: [],
    }
  }

  return {
    recommendedTest: 'independent_t',
    confidence: hints.hasSummary ? 'medium' : 'low',
    rationale: ['Fallback recommendation for two-group comparison when structure is unclear.'],
    warnings: ['Double-check your data mapping before running analysis.'],
  }
}

const TEST_LABELS: Record<AnalysisTest, string> = {
  independent_t: 'Independent-samples t-test (Welch)',
  paired_t: 'Paired-samples t-test',
  chi_gof: 'Chi-square goodness-of-fit',
  chi_independence: 'Chi-square test of independence',
  correlation: 'Pearson correlation',
}

export function testLabel(test: AnalysisTest): string {
  return TEST_LABELS[test]
}

export function guardTestChoice(test: AnalysisTest, notes: string[]): { blocking: boolean; warnings: string[] } {
  if (test === 'paired_t' && notes.includes('different_groups')) {
    return {
      blocking: false,
      warnings: ['Paired t-test assumes same units measured twice. Different groups can break that assumption.'],
    }
  }

  if (test === 'chi_independence' && notes.includes('numeric_outcome_only')) {
    return {
      blocking: true,
      warnings: ['Chi-square independence requires categorical counts, not purely numeric outcomes.'],
    }
  }

  if (test === 'correlation' && notes.includes('single_variable')) {
    return { blocking: true, warnings: ['Correlation needs two variables.'] }
  }

  return { blocking: false, warnings: [] }
}
