/**
 * Client-side PDF text extraction is limited without a full PDF.js pipeline.
 * Bank PDF formats vary widely — we attempt basic text extraction via FileReader
 * and surface a clear error when unsupported.
 *
 * For production-quality bank PDF support, consider pdf.js + bank-specific templates.
 */

import type { ParsedRow } from '@/types/transaction'
import { parseCSV } from './csvParser'
import { parseAmount } from '@/lib/utils'

export interface PdfParseResult {
  rows: ParsedRow[]
  errors: string[]
  method: 'text-table' | 'unsupported'
}

/**
 * Attempt to extract transaction-like rows from PDF file text.
 * Users should prefer CSV exports from their bank.
 */
export async function parsePDF(file: File): Promise<PdfParseResult> {
  try {
    // Try reading as text (works only for text-based simple PDFs / mislabeled files)
    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    const text = extractReadableText(bytes)

    if (!text || text.trim().length < 20) {
      return {
        rows: [],
        errors: [
          'Could not extract text from this PDF. Bank PDFs vary widely in format.',
          'Please export your statement as CSV/TSV from your bank for best results.',
        ],
        method: 'unsupported',
      }
    }

    // If it looks like CSV embedded, use CSV parser
    if (text.includes(',') && /date/i.test(text)) {
      const csvResult = parseCSV(text)
      if (csvResult.rows.length > 0) {
        return { rows: csvResult.rows, errors: csvResult.errors, method: 'text-table' }
      }
    }

    // Heuristic line-based extraction: DATE  DESCRIPTION  AMOUNT
    const rows = extractFromLines(text)
    if (rows.length === 0) {
      return {
        rows: [],
        errors: [
          'No transactions found in PDF text. This bank format may not be supported.',
          'Please download a CSV statement from your bank and upload that instead.',
        ],
        method: 'unsupported',
      }
    }

    return { rows, errors: [], method: 'text-table' }
  } catch {
    return {
      rows: [],
      errors: [
        'Failed to parse PDF. Please use a CSV export from your bank instead.',
      ],
      method: 'unsupported',
    }
  }
}

function extractReadableText(bytes: Uint8Array): string {
  // Extract strings between PDF text operators roughly
  let raw = ''
  try {
    raw = new TextDecoder('latin1').decode(bytes)
  } catch {
    return ''
  }

  const parts: string[] = []
  // BT ... ET text blocks and Tj / TJ operators
  const tjRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*Tj/g
  let m: RegExpExecArray | null
  while ((m = tjRegex.exec(raw)) !== null) {
    parts.push(m[1].replace(/\\(.)/g, '$1'))
  }

  const hexRegex = /<([0-9A-Fa-f]+)>\s*Tj/g
  while ((m = hexRegex.exec(raw)) !== null) {
    const hex = m[1]
    let s = ''
    for (let i = 0; i < hex.length; i += 2) {
      s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16))
    }
    parts.push(s)
  }

  if (parts.length > 0) return parts.join(' ')

  // Fallback: strip non-printable
  return raw.replace(/[^\x20-\x7E\n\r\t]/g, ' ')
}

function extractFromLines(text: string): ParsedRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const rows: ParsedRow[] = []
  const dateRe = /(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{4}-\d{2}-\d{2})/
  const amountRe = /(-?\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\(\$?\d+(?:,\d{3})*(?:\.\d{2})?\))/

  for (const line of lines) {
    const dateMatch = line.match(dateRe)
    const amountMatch = line.match(amountRe)
    if (!dateMatch || !amountMatch) continue

    const dateRaw = dateMatch[1]
    const amountRaw = amountMatch[1]
    const amount = Math.abs(parseAmount(amountRaw))
    if (amount === 0) continue

    let description = line
      .replace(dateRaw, '')
      .replace(amountRaw, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (!description) description = 'Unknown'

    // Normalize date via CSV helper path
    const iso = normalizeDate(dateRaw)
    if (!iso) continue

    const type: 'debit' | 'credit' =
      amountRaw.includes('(') || amountRaw.startsWith('-') ? 'debit' : 'debit'

    rows.push({
      date: iso,
      description,
      amount,
      type,
      rawText: line,
    })
  }

  return rows
}

function normalizeDate(raw: string): string | null {
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const us = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/)
  if (us) {
    let year = parseInt(us[3], 10)
    if (year < 100) year += 2000
    return `${year}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`
  }
  return null
}
