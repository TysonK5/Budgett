import type { Rule, Transaction } from '@/types/transaction'
import { UNCATEGORIZED_ID } from '@/lib/constants'
import { DEFAULT_KEYWORD_RULES } from './defaultRules'
import { ruleMatches } from '@/lib/rules/evaluate'

/**
 * Categorize a single transaction.
 * Priority: active custom rules (by priority asc) → default keyword rules → Uncategorized
 */
export function categorizeTransaction(
  description: string,
  customRules: Rule[] = [],
  txPartial?: Partial<Transaction>
): string {
  // Build a minimal transaction for layered rule evaluation
  const tx: Transaction = {
    id: txPartial?.id ?? '',
    date: txPartial?.date ?? '',
    description,
    amount: txPartial?.amount ?? 0,
    type: txPartial?.type ?? 'debit',
    categoryId: txPartial?.categoryId ?? UNCATEGORIZED_ID,
    rawText: txPartial?.rawText ?? description,
    createdAt: txPartial?.createdAt ?? '',
  }

  const activeCustom = customRules
    .filter((r) => r.isActive)
    .sort((a, b) => a.priority - b.priority)

  for (const rule of activeCustom) {
    if (ruleMatches(rule, tx)) {
      return rule.categoryId
    }
  }

  const upper = description.toUpperCase()
  for (const rule of DEFAULT_KEYWORD_RULES) {
    if (upper.includes(rule.keyword.toUpperCase())) {
      return rule.categoryId
    }
  }

  return UNCATEGORIZED_ID
}

export function categorizeTransactions(
  transactions: Transaction[],
  customRules: Rule[] = []
): Transaction[] {
  return transactions.map((t) => ({
    ...t,
    categoryId: categorizeTransaction(t.description, customRules, t),
  }))
}

/** Only re-categorize transactions currently in uncategorized */
export function categorizeUncategorized(
  transactions: Transaction[],
  customRules: Rule[] = []
): Transaction[] {
  return transactions.map((t) => {
    if (t.categoryId !== UNCATEGORIZED_ID) return t
    return {
      ...t,
      categoryId: categorizeTransaction(t.description, customRules, t),
    }
  })
}

/** Re-apply all rules to every transaction (e.g. after rule change) */
export function recategorizeAll(
  transactions: Transaction[],
  customRules: Rule[] = []
): Transaction[] {
  return categorizeTransactions(transactions, customRules)
}
