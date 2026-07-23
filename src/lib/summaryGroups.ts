import type { Transaction } from '@/types/transaction'

export interface SummaryGroup {
  /** Normalized key used to cluster similar descriptions */
  key: string
  /** Representative label (most common original description in the group) */
  label: string
  count: number
  amount: number
  transactions: Transaction[]
}

/**
 * Normalize a bank description so near-duplicates share a key.
 * Strips dates, long numeric refs, and extra whitespace/punctuation noise.
 */
export function normalizeSummaryKey(description: string): string {
  const key = description
    .toUpperCase()
    .replace(/[#*]+/g, ' ')
    .replace(/\d{1,2}[/\-.]\d{1,2}([/\-.]\d{2,4})?/g, ' ')
    .replace(/\b\d{4,}\b/g, ' ')
    .replace(/\b[A-Z]{0,3}\d{5,}[A-Z0-9]*\b/g, ' ')
    .replace(/[^A-Z0-9\s&'/.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return key || description.toUpperCase().trim() || 'UNKNOWN'
}

function pickLabel(descriptions: string[]): string {
  const counts = new Map<string, number>()
  for (const d of descriptions) {
    counts.set(d, (counts.get(d) ?? 0) + 1)
  }
  let best = descriptions[0] ?? ''
  let bestCount = 0
  for (const [d, n] of counts) {
    if (n > bestCount || (n === bestCount && d.length < best.length)) {
      best = d
      bestCount = n
    }
  }
  return best
}

/**
 * Group transactions by similar summary text (normalized description).
 * Sorted by total amount descending.
 */
export function groupTransactionsBySummary(
  transactions: Transaction[]
): SummaryGroup[] {
  const map = new Map<
    string,
    { descriptions: string[]; transactions: Transaction[]; amount: number }
  >()

  for (const t of transactions) {
    const key = normalizeSummaryKey(t.description)
    const cur = map.get(key) ?? {
      descriptions: [],
      transactions: [],
      amount: 0,
    }
    cur.descriptions.push(t.description)
    cur.transactions.push(t)
    // Debits add to spend total; credits subtract (net of group)
    cur.amount += t.type === 'credit' ? -t.amount : t.amount
    map.set(key, cur)
  }

  return Array.from(map.entries())
    .map(([key, { descriptions, transactions: txns, amount }]) => {
      const sorted = [...txns].sort((a, b) => b.date.localeCompare(a.date))
      return {
        key,
        label: pickLabel(descriptions),
        count: sorted.length,
        amount: Math.round(amount * 100) / 100,
        transactions: sorted,
      }
    })
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount) || b.count - a.count)
}
