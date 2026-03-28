import type { ExampleDataset } from '../types'

export const EXAMPLES: ExampleDataset[] = [
  {
    id: 'education-independent-t',
    title: 'Education: tutoring vs no tutoring',
    subtitle: 'Independent t-test',
    description: 'Compares quiz scores between students who attended tutoring and those who did not.',
    test: 'independent_t',
    inputMethod: 'raw',
    payload: {
      groupA: [78, 81, 84, 79, 76, 88, 90, 85, 82, 87],
      groupB: [74, 71, 68, 77, 73, 69, 70, 72, 75, 71],
    },
  },
  {
    id: 'marketing-chi-independence',
    title: 'Marketing survey: channel x conversion',
    subtitle: 'Chi-square independence',
    description: 'Checks whether conversion rates differ by ad channel.',
    test: 'chi_independence',
    inputMethod: 'table',
    payload: {
      rowLabels: ['Search Ads', 'Social Ads', 'Email'],
      colLabels: ['Converted', 'Not Converted'],
      counts: [
        [42, 158],
        [30, 170],
        [50, 150],
      ],
    },
  },
  {
    id: 'paired-repeated-measures',
    title: 'Repeated measures: pre-post stress',
    subtitle: 'Paired t-test',
    description: 'Same participants measured before and after a short intervention.',
    test: 'paired_t',
    inputMethod: 'raw',
    payload: {
      before: [23, 25, 21, 24, 27, 22, 26, 28, 24, 25],
      after: [20, 21, 19, 22, 24, 20, 23, 25, 21, 22],
    },
  },
]
