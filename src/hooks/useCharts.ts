import { useMemo } from 'react'
import type { Category, Transaction } from '@/types/transaction'
import {
  getCategoryLabel,
  getRootCategoryId,
} from '@/lib/categoryHelpers'

export interface CategorySpend {
  categoryId: string
  name: string
  color: string
  amount: number
  count: number
  /** true when this row is a rolled-up parent */
  isParentRollup?: boolean
}

export interface MonthlySpend {
  month: string
  label: string
  amount: number
  income: number
}

export interface DailyTrend {
  date: string
  amount: number
}

export function useCharts(transactions: Transaction[], categories: Category[]) {
  const catMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  )

  /** Leaf-level (exact categoryId) spending */
  const spendingByCategory = useMemo((): CategorySpend[] => {
    const map = new Map<string, { amount: number; count: number }>()
    for (const t of transactions) {
      if (t.type === 'credit') continue
      const cur = map.get(t.categoryId) ?? { amount: 0, count: 0 }
      cur.amount += t.amount
      cur.count += 1
      map.set(t.categoryId, cur)
    }
    return Array.from(map.entries())
      .map(([categoryId, { amount, count }]) => {
        const cat = catMap.get(categoryId)
        return {
          categoryId,
          name: getCategoryLabel(catMap, categoryId),
          color: cat?.color ?? '#94a3b8',
          amount: Math.round(amount * 100) / 100,
          count,
        }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [transactions, catMap])

  /** Parent-level rollup for pie chart (children fold into parent) */
  const spendingByParent = useMemo((): CategorySpend[] => {
    const map = new Map<string, { amount: number; count: number }>()
    for (const t of transactions) {
      if (t.type === 'credit') continue
      const rootId = getRootCategoryId(catMap, t.categoryId)
      const cur = map.get(rootId) ?? { amount: 0, count: 0 }
      cur.amount += t.amount
      cur.count += 1
      map.set(rootId, cur)
    }
    return Array.from(map.entries())
      .map(([categoryId, { amount, count }]) => {
        const cat = catMap.get(categoryId)
        return {
          categoryId,
          name: cat?.name ?? categoryId,
          color: cat?.color ?? '#94a3b8',
          amount: Math.round(amount * 100) / 100,
          count,
          isParentRollup: true,
        }
      })
      .sort((a, b) => b.amount - a.amount)
  }, [transactions, catMap])

  const monthlySpending = useMemo((): MonthlySpend[] => {
    const map = new Map<string, { amount: number; income: number }>()
    for (const t of transactions) {
      const month = t.date.slice(0, 7)
      const cur = map.get(month) ?? { amount: 0, income: 0 }
      if (t.type === 'credit') cur.income += t.amount
      else cur.amount += t.amount
      map.set(month, cur)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { amount, income }]) => {
        const [y, m] = month.split('-')
        const d = new Date(Number(y), Number(m) - 1, 1)
        return {
          month,
          label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          amount: Math.round(amount * 100) / 100,
          income: Math.round(income * 100) / 100,
        }
      })
  }, [transactions])

  const dailyTrend = useMemo((): DailyTrend[] => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (t.type === 'credit') continue
      map.set(t.date, (map.get(t.date) ?? 0) + t.amount)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({
        date,
        amount: Math.round(amount * 100) / 100,
      }))
  }, [transactions])

  const totals = useMemo(() => {
    let spending = 0
    let income = 0
    for (const t of transactions) {
      if (t.type === 'credit') income += t.amount
      else spending += t.amount
    }
    return {
      spending: Math.round(spending * 100) / 100,
      income: Math.round(income * 100) / 100,
      net: Math.round((income - spending) * 100) / 100,
      count: transactions.length,
    }
  }, [transactions])

  const topMerchants = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (t.type === 'credit') continue
      const key = t.description.slice(0, 40)
      map.set(key, (map.get(key) ?? 0) + t.amount)
    }
    return Array.from(map.entries())
      .map(([name, amount]) => ({ name, amount: Math.round(amount * 100) / 100 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
  }, [transactions])

  return {
    spendingByCategory,
    spendingByParent,
    monthlySpending,
    dailyTrend,
    totals,
    topMerchants,
  }
}
