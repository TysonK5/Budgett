export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  categoryId: string
  rawText: string
  createdAt: string
}

/**
 * Two-level category tree.
 * - parentId === null  → top-level (parent) category, e.g. "Loans"
 * - parentId set       → child category, e.g. "Mortgage" under Loans
 */
export interface Category {
  id: string
  name: string
  color: string
  icon: string
  isSystem: boolean
  parentId: string | null
}

/** Field a condition can inspect */
export type RuleConditionField = 'description' | 'amount' | 'type' | 'date'

/**
 * Operators by field:
 * - description: contains, not_contains, equals, starts_with, ends_with
 * - amount: eq, gt, gte, lt, lte
 * - type: is (debit|credit)
 * - date: eq, before, after (YYYY-MM-DD)
 */
export type RuleConditionOp =
  | 'contains'
  | 'not_contains'
  | 'equals'
  | 'starts_with'
  | 'ends_with'
  | 'eq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'is'
  | 'before'
  | 'after'

export interface RuleCondition {
  id: string
  field: RuleConditionField
  op: RuleConditionOp
  value: string
}

/** How conditions inside a layer combine */
export type RuleJoin = 'AND' | 'OR'

/**
 * A layer is a group of conditions (ALL / ANY).
 * Layers stack: IF layer1 AND/OR layer2 AND/OR …
 */
export interface RuleLayer {
  id: string
  /** ALL = AND, ANY = OR among conditions in this layer */
  join: RuleJoin
  conditions: RuleCondition[]
}

/**
 * Custom categorization rule.
 * Evaluation: IF layers match (combined via layerJoin) THEN assign categoryId.
 * Legacy `keyword` is kept for older saved rules; normalized into layers when loaded.
 */
export interface Rule {
  id: string
  /** Optional display name */
  name?: string
  /** @deprecated Use layers — still written for simple keyword rules */
  keyword: string
  categoryId: string
  isActive: boolean
  priority: number
  /** How successive layers combine (default AND) */
  layerJoin?: RuleJoin
  layers?: RuleLayer[]
}

export interface Budget {
  id: string
  categoryId: string
  monthlyAmount: number
  period: string // YYYY-MM
}

export interface ParsedRow {
  date: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  rawText: string
}

export type SortField = 'date' | 'description' | 'amount' | 'categoryId'
export type SortDirection = 'asc' | 'desc'
