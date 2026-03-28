import { describe, expect, it } from 'vitest'
import { recommendFromDataHints, recommendFromQuestions } from './recommendation'

describe('recommendation engine', () => {
  it('recommends paired t-test for repeated difference questions', () => {
    const rec = recommendFromQuestions({
      goal: 'difference',
      repeated: true,
      variableType: 'numeric',
    })
    expect(rec.recommendedTest).toBe('paired_t')
  })

  it('recommends correlation for two numeric columns in data-first hints', () => {
    const rec = recommendFromDataHints({
      hasRawValues: true,
      hasSummary: false,
      hasContingencyTable: false,
      inferredNumericColumns: 2,
      inferredCategoricalColumns: 0,
    })
    expect(rec.recommendedTest).toBe('correlation')
  })
})
