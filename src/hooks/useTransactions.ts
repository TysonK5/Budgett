import { useCallback, useEffect, useState } from 'react'
import type { Transaction } from '@/types/transaction'
import * as storage from '@/lib/storage/transactions'
import { categorizeTransactions } from '@/lib/categorizer'
import type { Rule } from '@/types/transaction'

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const data = await storage.getAllTransactions()
      setTransactions(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load transactions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const addMany = useCallback(async (items: Transaction[]) => {
    await storage.addTransactions(items)
    await refresh()
  }, [refresh])

  const update = useCallback(async (item: Transaction) => {
    await storage.updateTransaction(item)
    setTransactions((prev) => prev.map((t) => (t.id === item.id ? item : t)))
  }, [])

  const remove = useCallback(async (id: string) => {
    await storage.deleteTransaction(id)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const removeAll = useCallback(async () => {
    await storage.deleteAllTransactions()
    setTransactions([])
  }, [])

  const recategorize = useCallback(async (rules: Rule[]) => {
    const updated = categorizeTransactions(transactions, rules)
    await storage.updateTransactions(updated)
    setTransactions(updated)
  }, [transactions])

  return {
    transactions,
    loading,
    error,
    refresh,
    addMany,
    update,
    remove,
    removeAll,
    recategorize,
  }
}
