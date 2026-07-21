import type { Category } from '@/types/transaction'
import { getDB } from './db'
import { STORE_CATEGORIES, STORE_RULES, STORE_TRANSACTIONS, UNCATEGORIZED_ID } from '@/lib/constants'
import { normalizeCategory } from '@/lib/categoryHelpers'

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDB()
  const all = await db.getAll(STORE_CATEGORIES)
  return all.map(normalizeCategory)
}

export async function getCategory(id: string): Promise<Category | undefined> {
  const db = await getDB()
  const cat = await db.get(STORE_CATEGORIES, id)
  return cat ? normalizeCategory(cat) : undefined
}

export async function addCategory(category: Category): Promise<void> {
  const db = await getDB()
  await db.put(STORE_CATEGORIES, normalizeCategory(category))
}

export async function updateCategory(category: Category): Promise<void> {
  const db = await getDB()
  await db.put(STORE_CATEGORIES, normalizeCategory(category))
}

export interface DeleteCategoryResult {
  deletedIds: string[]
  reassignedTransactions: number
  reassignedRules: number
}

/**
 * Delete a category (parent or child). Parents delete their children too.
 * Transactions and rules pointing at deleted ids are moved to fallback (Uncategorized).
 * The Uncategorized leaf itself cannot be deleted.
 */
export async function deleteCategory(
  id: string,
  fallbackCategoryId: string = UNCATEGORIZED_ID
): Promise<DeleteCategoryResult> {
  if (id === UNCATEGORIZED_ID || id === fallbackCategoryId) {
    throw new Error('Cannot delete the Uncategorized fallback category')
  }

  const db = await getDB()
  const cat = await db.get(STORE_CATEGORIES, id)
  if (!cat) {
    return { deletedIds: [], reassignedTransactions: 0, reassignedRules: 0 }
  }

  const all = await db.getAll(STORE_CATEGORIES)
  const children = all.filter((c) => c.parentId === id)
  const deletedIds = [id, ...children.map((c) => c.id)].filter(
    (cid) => cid !== fallbackCategoryId
  )
  const deletedSet = new Set(deletedIds)

  // Ensure fallback exists
  const fallback = await db.get(STORE_CATEGORIES, fallbackCategoryId)
  if (!fallback) {
    throw new Error(`Fallback category “${fallbackCategoryId}” is missing`)
  }

  // Reassign transactions
  const transactions = await db.getAll(STORE_TRANSACTIONS)
  let reassignedTransactions = 0
  const txWrite = db.transaction(STORE_TRANSACTIONS, 'readwrite')
  for (const t of transactions) {
    if (deletedSet.has(t.categoryId)) {
      await txWrite.store.put({ ...t, categoryId: fallbackCategoryId })
      reassignedTransactions++
    }
  }
  await txWrite.done

  // Reassign rules
  const rules = await db.getAll(STORE_RULES)
  let reassignedRules = 0
  const ruleWrite = db.transaction(STORE_RULES, 'readwrite')
  for (const r of rules) {
    if (deletedSet.has(r.categoryId)) {
      await ruleWrite.store.put({ ...r, categoryId: fallbackCategoryId })
      reassignedRules++
    }
  }
  await ruleWrite.done

  // Delete category rows
  const catWrite = db.transaction(STORE_CATEGORIES, 'readwrite')
  for (const cid of deletedIds) {
    await catWrite.store.delete(cid)
  }
  await catWrite.done

  return { deletedIds, reassignedTransactions, reassignedRules }
}
