import type { Category, Rule, Transaction } from '@/types/transaction'
import { getCategoryLabel } from '@/lib/categoryHelpers'
import { ruleMatches } from '@/lib/rules/evaluate'

export interface MatchGroup {
  /** Normalized key used for grouping similar descriptions */
  groupKey: string
  /** Human-readable group label (cleaned merchant name) */
  label: string
  /** Most frequent raw description in the group */
  sample: string
  count: number
  totalAmount: number
  /** Current categories of matching txs (id → count) */
  categoryCounts: Array<{ categoryId: string; count: number }>
  /** Up to a few example descriptions */
  examples: string[]
}

/**
 * Collapse store numbers, refs, and noise so similar merchants group together.
 * e.g. "STARBUCKS STORE 88421" and "STARBUCKS STORE 123" → "STARBUCKS STORE"
 */
export function normalizeDescription(desc: string): string {
  return desc
    .toUpperCase()
    .replace(/\s+/g, ' ')
    // Amazon / card processor refs
    .replace(/\*[A-Z0-9]+/g, ' ')
    // Store / location numbers
    .replace(/#\s*\w+/g, ' ')
    // Long numeric tokens (ids, amounts already gone, card last4, etc.)
    .replace(/\b\d{3,}\b/g, ' ')
    // Dates embedded in memo
    .replace(/\b\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?\b/g, ' ')
    // Trailing city/state-ish fragments after multiple spaces often already cleaned
    .replace(/[^A-Z0-9 &'.\-/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Soften the group label for display (title-ish case of normalized key) */
export function groupLabelFromKey(key: string): string {
  if (!key) return 'Unknown'
  // Keep as uppercase merchant style — banks usually are
  return key
}

export function findMatchingTransactions(
  transactions: Transaction[],
  keyword: string
): Transaction[] {
  const q = keyword.trim().toUpperCase()
  if (q.length < 2) return []
  return transactions.filter((t) => t.description.toUpperCase().includes(q))
}

/** Match transactions against a full layered rule (draft or saved) */
export function findMatchingTransactionsByRule(
  transactions: Transaction[],
  rule: Rule
): Transaction[] {
  const draft: Rule = { ...rule, isActive: true }
  return transactions.filter((t) => ruleMatches(draft, t))
}

/**
 * Group matching transactions by normalized description similarity.
 * Sorted by count descending.
 */
export function groupMatchesBySimilarity(
  matches: Transaction[],
  categories: Category[] = []
): MatchGroup[] {
  const map = new Map<
    string,
    {
      samples: Map<string, number>
      count: number
      totalAmount: number
      categoryCounts: Map<string, number>
    }
  >()

  for (const t of matches) {
    const key = normalizeDescription(t.description) || t.description.toUpperCase()
    let bucket = map.get(key)
    if (!bucket) {
      bucket = {
        samples: new Map(),
        count: 0,
        totalAmount: 0,
        categoryCounts: new Map(),
      }
      map.set(key, bucket)
    }
    bucket.count += 1
    bucket.totalAmount += t.amount
    bucket.samples.set(t.description, (bucket.samples.get(t.description) ?? 0) + 1)
    bucket.categoryCounts.set(
      t.categoryId,
      (bucket.categoryCounts.get(t.categoryId) ?? 0) + 1
    )
  }

  const catMap = new Map(categories.map((c) => [c.id, c]))

  const groups: MatchGroup[] = Array.from(map.entries()).map(([groupKey, bucket]) => {
    const sortedSamples = [...bucket.samples.entries()].sort((a, b) => b[1] - a[1])
    const sample = sortedSamples[0]?.[0] ?? groupKey
    const examples = sortedSamples.slice(0, 3).map(([d]) => d)

    return {
      groupKey,
      label: groupLabelFromKey(groupKey),
      sample,
      count: bucket.count,
      totalAmount: Math.round(bucket.totalAmount * 100) / 100,
      categoryCounts: [...bucket.categoryCounts.entries()]
        .map(([categoryId, count]) => ({ categoryId, count }))
        .sort((a, b) => b.count - a.count),
      examples,
    }
  })

  // Silence unused if categories empty — label helper available for UI
  void catMap

  return groups.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export function formatCategoryBreakdown(
  group: MatchGroup,
  categories: Category[]
): string {
  return group.categoryCounts
    .slice(0, 3)
    .map(({ categoryId, count }) => {
      const label = getCategoryLabel(categories, categoryId)
      return `${label} (${count})`
    })
    .join(', ')
}
