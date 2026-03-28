import type { ColumnKind, ParsedCsv } from '../types'

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      const next = line[i + 1]
      if (inQuotes && next === '"') {
        cell += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (ch === ',' && !inQuotes) {
      out.push(cell.trim())
      cell = ''
      continue
    }

    cell += ch
  }

  out.push(cell.trim())
  return out
}

function inferKind(values: string[]): ColumnKind {
  const nonEmpty = values.filter((v) => v !== '')
  if (nonEmpty.length === 0) return 'categorical'
  const numeric = nonEmpty.filter((v) => Number.isFinite(Number(v))).length
  return numeric / nonEmpty.length >= 0.8 ? 'numeric' : 'categorical'
}

export function parseCsv(text: string): ParsedCsv {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) {
    throw new Error('CSV needs a header row and at least one data row.')
  }

  const headers = parseCsvLine(lines[0])
  if (headers.length < 2) {
    throw new Error('CSV must include at least two columns.')
  }

  const rows = lines.slice(1).map((line) => {
    const cells = parseCsvLine(line)
    const row: Record<string, string> = {}
    headers.forEach((header, idx) => {
      row[header] = (cells[idx] ?? '').trim()
    })
    return row
  })

  const inferredKinds: Record<string, ColumnKind> = {}
  for (const header of headers) {
    inferredKinds[header] = inferKind(rows.map((r) => r[header] ?? ''))
  }

  return { headers, rows, inferredKinds }
}

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(parseCsv(String(reader.result ?? '')))
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('Could not read CSV file.'))
    reader.readAsText(file)
  })
}
