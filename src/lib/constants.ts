import type { Category } from '@/types/transaction'
import categoriesData from '@/lib/defaults/categories.json'

/** Fallback when no rule matches — must exist in categories.json */
export const UNCATEGORIZED_ID = 'other-uncategorized'

/**
 * Default parent + child category taxonomy.
 * Edit `src/lib/defaults/categories.json` to add/change system categories.
 * - parentId === null → top-level parent
 * - parentId set → child of that parent
 */
export const DEFAULT_CATEGORIES: Category[] = categoriesData.categories.map((c) => ({
  id: c.id,
  name: c.name,
  color: c.color,
  icon: c.icon,
  isSystem: c.isSystem ?? true,
  parentId: c.parentId ?? null,
}))

/** Bump when default category taxonomy in categories.json changes */
export const TAXONOMY_VERSION: number = categoriesData.version

export const DB_NAME = 'budgett-db'
/** Bump when IndexedDB schema or default taxonomy changes */
export const DB_VERSION = 3

export const STORE_TRANSACTIONS = 'transactions'
export const STORE_CATEGORIES = 'categories'
export const STORE_RULES = 'rules'
export const STORE_BUDGETS = 'budgets'
export const STORE_SETTINGS = 'settings'
