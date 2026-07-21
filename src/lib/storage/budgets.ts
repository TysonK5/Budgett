import type { Budget } from '@/types/transaction'
import { getDB } from './db'
import { STORE_BUDGETS } from '@/lib/constants'

export async function getAllBudgets(): Promise<Budget[]> {
  const db = await getDB()
  return db.getAll(STORE_BUDGETS)
}

export async function getBudgetsByPeriod(period: string): Promise<Budget[]> {
  const db = await getDB()
  return db.getAllFromIndex(STORE_BUDGETS, 'by-period', period)
}

export async function upsertBudget(budget: Budget): Promise<void> {
  const db = await getDB()
  await db.put(STORE_BUDGETS, budget)
}

export async function deleteBudget(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_BUDGETS, id)
}
