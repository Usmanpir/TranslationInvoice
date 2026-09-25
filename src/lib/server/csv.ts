import 'server-only'

export interface CsvColumn<T> {
  header: string
  value: (row: T) => string | number | null | undefined
}

function cell(value: string | number | null | undefined) {
  if (value === null || value === undefined) return ''
  let s = String(value)
  // Neutralize spreadsheet formula injection (=, +, -, @, tab, CR at the start of a text cell).
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** RFC 4180 CSV with a UTF-8 BOM so Excel opens Arabic/accented text correctly. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]) {
  const lines = [columns.map((c) => cell(c.header)).join(',')]
  for (const row of rows) lines.push(columns.map((c) => cell(c.value(row))).join(','))
  return '﻿' + lines.join('\r\n')
}
