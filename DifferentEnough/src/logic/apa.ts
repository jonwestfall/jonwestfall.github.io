import type { AnalysisResult } from '../types'

export function apaItalicize(symbol: string): string {
  return `<em>${symbol}</em>`
}

export function buildApa(result: AnalysisResult): string {
  return result.apa
}

export function copyApaToClipboard(apa: string): Promise<void> {
  return navigator.clipboard.writeText(apa.replace(/<[^>]+>/g, ''))
}
