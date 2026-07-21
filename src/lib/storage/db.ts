import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Budget, Category, Rule, Transaction } from '@/types/transaction'
import {
  DB_NAME,
  DB_VERSION,
  DEFAULT_CATEGORIES,
  STORE_BUDGETS,
  STORE_CATEGORIES,
  STORE_RULES,
  STORE_SETTINGS,
  STORE_TRANSACTIONS,
} from '@/lib/constants'
import { normalizeCategory } from '@/lib/categoryHelpers'

interface BudgettDB extends DBSchema {
  [STORE_TRANSACTIONS]: {
    key: string
    value: Transaction
    indexes: { 'by-date': string; 'by-category': string }
  }
  [STORE_CATEGORIES]: {
    key: string
    value: Category
  }
  [STORE_RULES]: {
    key: string
    value: Rule
    indexes: { 'by-priority': number }
  }
  [STORE_BUDGETS]: {
    key: string
    value: Budget
    indexes: { 'by-category': string; 'by-period': string }
  }
  [STORE_SETTINGS]: {
    key: string
    value: { key: string; value: unknown }
  }
}

let dbPromise: Promise<IDBPDatabase<BudgettDB>> | null = null

const TAXONOMY_VERSION_KEY = 'taxonomyVersion'
/** Bump with major category-set changes (pairs with DB_VERSION conceptually) */
const TAXONOMY_VERSION = 3

/**
 * Full system-category swap: write all defaults, drop obsolete system cats,
 * keep user-created (non-system) categories.
 */
async function migrateCategories(db: IDBPDatabase<BudgettDB>): Promise<void> {
  const existing = await db.getAll(STORE_CATEGORIES)
  const existingById = new Map(existing.map((c) => [c.id, normalizeCategory(c)]))
  const defaultIds = new Set(DEFAULT_CATEGORIES.map((c) => c.id))
  const custom = existing
    .map(normalizeCategory)
    .filter((c) => !c.isSystem && !defaultIds.has(c.id))

  // Preserve user edits (name/color/icon) for categories that keep the same id
  const systemMerged = DEFAULT_CATEGORIES.map((def) => {
    const prev = existingById.get(def.id)
    if (!prev) return def
    return {
      ...def,
      name: prev.name || def.name,
      color: prev.color || def.color,
      icon: prev.icon || def.icon,
    }
  })

  const tx = db.transaction(STORE_CATEGORIES, 'readwrite')
  await tx.store.clear()
  await Promise.all([
    ...systemMerged.map((c) => tx.store.put(c)),
    ...custom.map((c) => tx.store.put(normalizeCategory(c))),
  ])
  await tx.done

  await db.put(STORE_SETTINGS, { key: TAXONOMY_VERSION_KEY, value: TAXONOMY_VERSION })
}

export function getDB(): Promise<IDBPDatabase<BudgettDB>> {
  if (!dbPromise) {
    dbPromise = openDB<BudgettDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_TRANSACTIONS)) {
          const txStore = db.createObjectStore(STORE_TRANSACTIONS, { keyPath: 'id' })
          txStore.createIndex('by-date', 'date')
          txStore.createIndex('by-category', 'categoryId')
        }
        if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
          db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORE_RULES)) {
          const ruleStore = db.createObjectStore(STORE_RULES, { keyPath: 'id' })
          ruleStore.createIndex('by-priority', 'priority')
        }
        if (!db.objectStoreNames.contains(STORE_BUDGETS)) {
          const budgetStore = db.createObjectStore(STORE_BUDGETS, { keyPath: 'id' })
          budgetStore.createIndex('by-category', 'categoryId')
          budgetStore.createIndex('by-period', 'period')
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' })
        }
      },
    }).then(async (db) => {
      const count = await db.count(STORE_CATEGORIES)
      const taxonomy = await db.get(STORE_SETTINGS, TAXONOMY_VERSION_KEY)
      const needsTaxonomy = taxonomy?.value !== TAXONOMY_VERSION

      if (count === 0) {
        const tx = db.transaction(STORE_CATEGORIES, 'readwrite')
        await Promise.all(DEFAULT_CATEGORIES.map((c) => tx.store.put(c)))
        await tx.done
        await db.put(STORE_SETTINGS, {
          key: TAXONOMY_VERSION_KEY,
          value: TAXONOMY_VERSION,
        })
      } else if (needsTaxonomy) {
        await migrateCategories(db)
      }
      return db
    })
  }
  return dbPromise
}

export async function clearAllData(): Promise<void> {
  const db = await getDB()
  await Promise.all([
    db.clear(STORE_TRANSACTIONS),
    db.clear(STORE_RULES),
    db.clear(STORE_BUDGETS),
    db.clear(STORE_SETTINGS),
  ])
  await db.clear(STORE_CATEGORIES)
  const tx = db.transaction(STORE_CATEGORIES, 'readwrite')
  await Promise.all(DEFAULT_CATEGORIES.map((c) => tx.store.put(c)))
  await tx.done
}

/** Force reseed categories (e.g. after taxonomy update) without wiping transactions */
export async function reseedSystemCategories(): Promise<void> {
  const db = await getDB()
  await migrateCategories(db)
}
