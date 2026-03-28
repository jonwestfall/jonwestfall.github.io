import type { MissingDataReport } from '../types'

function hasValue(v: unknown): boolean {
  if (v == null) return false
  if (typeof v === 'number') return Number.isFinite(v)
  if (typeof v === 'string') return v.trim().length > 0
  return true
}

export function listwiseExclude<T extends Record<string, unknown>>(
  rows: T[],
  requiredFields: (keyof T)[],
  reason: string,
): { rows: T[]; report: MissingDataReport } {
  const filtered = rows.filter((row) => requiredFields.every((field) => hasValue(row[field])))
  return {
    rows: filtered,
    report: {
      originalRows: rows.length,
      analyzedRows: filtered.length,
      excludedRows: rows.length - filtered.length,
      reason,
    },
  }
}
