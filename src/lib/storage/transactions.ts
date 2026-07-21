import type { Transaction } from '@/types/transaction'
import { getDB } from './db'
import { STORE_TRANSACTIONS } from '@/lib/constants'

export async function getAllTransactions(): Promise<Transaction[]> {
  const db = await getDB()
  const items = await db.getAll(STORE_TRANSACTIONS)
  return items.sort((a, b) => b.date.localeCompare(a.date))
}

export async function getTransaction(id: string): Promise<Transaction | undefined> {
  const db = await getDB()
  return db.get(STORE_TRANSACTIONS, id)
}

export async function addTransactions(transactions: Transaction[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORE_TRANSACTIONS, 'readwrite')
  await Promise.all(transactions.map((t) => tx.store.put(t)))
  await tx.done
}

export async function updateTransaction(transaction: Transaction): Promise<void> {
  const db = await getDB()
  await db.put(STORE_TRANSACTIONS, transaction)
}

export async function updateTransactions(transactions: Transaction[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction(STORE_TRANSACTIONS, 'readwrite')
  await Promise.all(transactions.map((t) => tx.store.put(t)))
  await tx.done
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_TRANSACTIONS, id)
}

export async function deleteAllTransactions(): Promise<void> {
  const db = await getDB()
  await db.clear(STORE_TRANSACTIONS)
}

export async function getTransactionsByCategory(categoryId: string): Promise<Transaction[]> {
  const db = await getDB()
  return db.getAllFromIndex(STORE_TRANSACTIONS, 'by-category', categoryId)
}
