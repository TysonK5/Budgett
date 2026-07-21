import type { ParsedRow } from '@/types/transaction'
import { parseAmount } from '@/lib/utils'

const DATE_HEADERS = [
  'date',
  'transaction date',
  'post date',
  'posted date',
  'trans date',
  'booking date',
  'value date',
  'transaction_date',
  'posting date',
]

const DESC_HEADERS = [
  'description',
  'memo',
  'payee',
  'merchant',
  'name',
  'details',
  'transaction description',
  'narrative',
  'particulars',
  'transaction',
]

const AMOUNT_HEADERS = ['amount', 'transaction amount', 'value', 'sum']
const DEBIT_HEADERS = ['debit', 'withdrawal', 'out', 'money out', 'debit amount']
const CREDIT_HEADERS = ['credit', 'deposit', 'in', 'money in', 'credit amount']

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim().length > 0) ?? ''
  const candidates: Array<{ d: string; count: number }> = [
    { d: ',', count: (firstLine.match(/,/g) || []).length },
    { d: '\t', count: (firstLine.match(/\t/g) || []).length },
    { d: ';', count: (firstLine.match(/;/g) || []).length },
    { d: '|', count: (firstLine.match(/\|/g) || []).length },
  ]
  candidates.sort((a, b) => b.count - a.count)
  return candidates[0].count > 0 ? candidates[0].d : ','
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function normalizeHeader(h: string): string {
  return h
    .replace(/^\uFEFF/, '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
}

function findColumnIndex(headers: string[], candidates: string[]): number {
  for (const c of candidates) {
    const idx = headers.findIndex((h) => h === c || h.includes(c))
    if (idx !== -1) return idx
  }
  return -1
}

function parseFlexibleDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    return s.slice(0, 10)
  }

  // MM/DD/YYYY or M/D/YYYY
  const us = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (us) {
    let year = parseInt(us[3], 10)
    if (year < 100) year += year > 50 ? 1900 : 2000
    const month = us[1].padStart(2, '0')
    const day = us[2].padStart(2, '0')
    // Prefer US format (MM/DD) when both plausible
    return `${year}-${month}-${day}`
  }

  // DD-MMM-YYYY or DD MMM YYYY
  const mon = s.match(/^(\d{1,2})[\s\-.]([A-Za-z]{3,})[\s\-.](\d{2,4})$/)
  if (mon) {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    }
    const m = months[mon[2].slice(0, 3).toLowerCase()]
    if (m) {
      let year = parseInt(mon[3], 10)
      if (year < 100) year += 2000
      return `${year}-${m}-${mon[1].padStart(2, '0')}`
    }
  }

  const d = new Date(s)
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10)
  }
  return null
}

export interface ParseResult {
  rows: ParsedRow[]
  errors: string[]
  headers: string[]
  delimiter: string
}

export function parseCSV(text: string): ParseResult {
  const errors: string[] = []
  const delimiter = detectDelimiter(text)
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length < 2) {
    return { rows: [], errors: ['File appears empty or has no data rows'], headers: [], delimiter }
  }

  // Detect header row: prefer first line that looks like headers
  let headerIdx = 0
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const cells = parseCSVLine(lines[i], delimiter).map(normalizeHeader)
    const hasDate = findColumnIndex(cells, DATE_HEADERS) !== -1
    const hasDesc = findColumnIndex(cells, DESC_HEADERS) !== -1
    const hasAmount =
      findColumnIndex(cells, AMOUNT_HEADERS) !== -1 ||
      findColumnIndex(cells, DEBIT_HEADERS) !== -1
    if (hasDate && (hasDesc || hasAmount)) {
      headerIdx = i
      break
    }
  }

  const headers = parseCSVLine(lines[headerIdx], delimiter).map(normalizeHeader)
  const dateIdx = findColumnIndex(headers, DATE_HEADERS)
  const descIdx = findColumnIndex(headers, DESC_HEADERS)
  const amountIdx = findColumnIndex(headers, AMOUNT_HEADERS)
  const debitIdx = findColumnIndex(headers, DEBIT_HEADERS)
  const creditIdx = findColumnIndex(headers, CREDIT_HEADERS)

  if (dateIdx === -1) {
    errors.push('Could not find a date column. Expected headers like: Date, Transaction Date, Post Date')
  }
  if (descIdx === -1) {
    errors.push('Could not find a description column. Expected headers like: Description, Memo, Payee')
  }
  if (amountIdx === -1 && debitIdx === -1 && creditIdx === -1) {
    errors.push('Could not find an amount column. Expected headers like: Amount, Debit, Credit')
  }

  if (errors.length > 0) {
    return { rows: [], errors, headers, delimiter }
  }

  const rows: ParsedRow[] = []

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i], delimiter)
    if (cells.every((c) => !c)) continue

    const dateRaw = cells[dateIdx] ?? ''
    const date = parseFlexibleDate(dateRaw)
    if (!date) {
      errors.push(`Row ${i + 1}: unparseable date "${dateRaw}"`)
      continue
    }

    const description = (cells[descIdx] ?? '').replace(/^"|"$/g, '').trim() || 'Unknown'
    let amount = 0
    let type: 'debit' | 'credit' = 'debit'

    if (amountIdx !== -1) {
      amount = parseAmount(cells[amountIdx] ?? '0')
      if (amount < 0) {
        type = 'debit'
        amount = Math.abs(amount)
      } else if (amount > 0) {
        // Many banks use negative for debits; if all positive, check for type hints
        // Default: positive = debit (expense) unless credit column exists
        type = 'debit'
      }
    } else {
      const debitVal = debitIdx !== -1 ? parseAmount(cells[debitIdx] ?? '0') : 0
      const creditVal = creditIdx !== -1 ? parseAmount(cells[creditIdx] ?? '0') : 0
      if (debitVal !== 0) {
        amount = Math.abs(debitVal)
        type = 'debit'
      } else if (creditVal !== 0) {
        amount = Math.abs(creditVal)
        type = 'credit'
      }
    }

    // If single amount column and value is positive with income keywords, leave as-is;
    // user rules / categorizer can mark income. Banks often use signed amounts:
    // re-check signed amount for type
    if (amountIdx !== -1) {
      const rawAmt = parseAmount(cells[amountIdx] ?? '0')
      if (rawAmt < 0) {
        type = 'debit'
        amount = Math.abs(rawAmt)
      } else if (rawAmt > 0) {
        // Heuristic: credits (income/refunds) are often positive when bank uses signed convention
        // where purchases are negative. If we saw negatives above, positives are credits.
        // Without knowing convention, prefer treating positive as credit when description suggests income.
        const lower = description.toLowerCase()
        if (/payroll|deposit|refund|transfer in|direct dep|interest|salary|wage/.test(lower)) {
          type = 'credit'
        } else {
          type = 'debit'
        }
        amount = Math.abs(rawAmt)
      }
    }

    if (amount === 0) continue

    rows.push({
      date,
      description,
      amount,
      type,
      rawText: lines[i],
    })
  }

  return { rows, errors, headers, delimiter }
}
