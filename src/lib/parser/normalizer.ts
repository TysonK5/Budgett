import type { ParsedRow, Transaction } from '@/types/transaction'
import { generateId } from '@/lib/utils'
import { UNCATEGORIZED_ID } from '@/lib/constants'

export function normalizeTransactions(
  rows: ParsedRow[],
  categoryIds: string[] = []
): Transaction[] {
  const now = new Date().toISOString()
  return rows.map((row) => ({
    id: generateId(),
    date: row.date,
    description: cleanDescription(row.description),
    amount: Math.round(row.amount * 100) / 100,
    type: row.type,
    categoryId: categoryIds.length === 1 ? categoryIds[0] : UNCATEGORIZED_ID,
    rawText: row.rawText,
    createdAt: now,
  }))
}

function cleanDescription(desc: string): string {
  return desc
    .replace(/\s+/g, ' ')
    .replace(/\*+/g, '*')
    .trim()
}

/** Deduplicate against existing transactions by date+description+amount */
export function filterDuplicates(
  incoming: Transaction[],
  existing: Transaction[]
): Transaction[] {
  const key = (t: Transaction) =>
    `${t.date}|${t.description.toLowerCase()}|${t.amount}|${t.type}`
  const seen = new Set(existing.map(key))
  return incoming.filter((t) => {
    const k = key(t)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}
