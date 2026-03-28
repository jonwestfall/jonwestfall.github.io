import type { AnalysisResult, InputMethod, PersistedAnalysis, AnalysisTest } from '../types'

function downloadText(filename: string, text: string, type: string): void {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportAnalysis(
  test: AnalysisTest,
  inputMethod: InputMethod,
  payload: unknown,
  result: AnalysisResult,
): void {
  const body: PersistedAnalysis = {
    app: 'Different Enough?',
    version: 1,
    savedAt: new Date().toISOString(),
    test,
    inputMethod,
    payload,
    result,
  }
  const stamp = new Date().toISOString().slice(0, 10)
  downloadText(`different-enough-${stamp}.json`, JSON.stringify(body, null, 2), 'application/json')
}

export function parseSavedAnalysis(text: string): PersistedAnalysis {
  const parsed = JSON.parse(text) as PersistedAnalysis
  if (parsed.app !== 'Different Enough?' || parsed.version !== 1) {
    throw new Error('This file does not look like a Different Enough? export.')
  }
  return parsed
}

export function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Could not read file.'))
    reader.readAsText(file)
  })
}
