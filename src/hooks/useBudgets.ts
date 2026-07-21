import { useCallback, useEffect, useState } from 'react'
import type { Budget } from '@/types/transaction'
import * as storage from '@/lib/storage/budgets'
import { generateId, getCurrentPeriod } from '@/lib/utils'

export function useBudgets(period?: string) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const activePeriod = period ?? getCurrentPeriod()

  const refresh = useCallback(async () => {
    setLoading(true)
    const data = await storage.getAllBudgets()
    setBudgets(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const periodBudgets = budgets.filter((b) => b.period === activePeriod)

  const setBudget = useCallback(
    async (categoryId: string, monthlyAmount: number, forPeriod = activePeriod) => {
      const existing = budgets.find(
        (b) => b.categoryId === categoryId && b.period === forPeriod
      )
      const budget: Budget = existing
        ? { ...existing, monthlyAmount }
        : {
            id: generateId(),
            categoryId,
            monthlyAmount,
            period: forPeriod,
          }
      await storage.upsertBudget(budget)
      setBudgets((prev) => {
        const idx = prev.findIndex((b) => b.id === budget.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = budget
          return next
        }
        return [...prev, budget]
      })
    },
    [budgets, activePeriod]
  )

  const remove = useCallback(async (id: string) => {
    await storage.deleteBudget(id)
    setBudgets((prev) => prev.filter((b) => b.id !== id))
  }, [])

  return {
    budgets,
    periodBudgets,
    period: activePeriod,
    loading,
    refresh,
    setBudget,
    remove,
  }
}
