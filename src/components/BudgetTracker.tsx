import { useMemo, useState } from 'react'
import type { Budget, Category, Transaction } from '@/types/transaction'
import { clamp, formatCurrency, getCurrentPeriod, periodLabel } from '@/lib/utils'
import {
  getCategoryLabel,
  getCategorySelectGroups,
  orderCategoriesHierarchically,
  sumSpendForCategory,
} from '@/lib/categoryHelpers'

interface BudgetTrackerProps {
  categories: Category[]
  budgets: Budget[]
  transactions: Transaction[]
  period?: string
  onSetBudget: (categoryId: string, amount: number) => Promise<void>
}

export function BudgetTracker({
  categories,
  budgets,
  transactions,
  period = getCurrentPeriod(),
  onSetBudget,
}: BudgetTrackerProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const spendByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      if (t.type === 'credit') continue
      if (!t.date.startsWith(period)) continue
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount)
    }
    return map
  }, [transactions, period])

  const budgetMap = useMemo(
    () => new Map(budgets.filter((b) => b.period === period).map((b) => [b.categoryId, b])),
    [budgets, period]
  )

  const ordered = useMemo(() => orderCategoriesHierarchically(categories), [categories])

  const rows = ordered
    .filter((c) => c.id !== 'income' && c.parentId !== 'income') // exclude income tree
    .map((cat) => {
      // Parent budgets roll up child spend; child budgets are exact
      const spent = sumSpendForCategory(spendByCategory, categories, cat.id)
      const budget = budgetMap.get(cat.id)
      const limit = budget?.monthlyAmount ?? 0
      const pct = limit > 0 ? (spent / limit) * 100 : 0
      return { cat, spent, limit, pct, budget }
    })
    .filter((r) => r.limit > 0 || r.spent > 0 || editingId === r.cat.id)

  const handleSave = async (categoryId: string) => {
    const amount = parseFloat(editValue)
    if (isNaN(amount) || amount < 0) return
    await onSetBudget(categoryId, amount)
    setEditingId(null)
    setEditValue('')
  }

  const statusClass = (pct: number) => {
    if (pct >= 100) return 'over'
    if (pct >= 80) return 'warn'
    return 'ok'
  }

  const selectGroups = getCategorySelectGroups(categories).filter(
    (g) => g.parent.id !== 'income' // don't budget income
  )

  return (
    <div className="budget-tracker">
      <div className="flex justify-between items-center" style={{ marginBottom: 16 }}>
        <div>
          <h3>Budget tracking</h3>
          <p className="text-sm text-muted">
            {periodLabel(period)} · Parent budgets include all subcategories
          </p>
        </div>
        <select
          className="select"
          style={{ maxWidth: 220 }}
          value=""
          onChange={(e) => {
            if (!e.target.value) return
            setEditingId(e.target.value)
            setEditValue(String(budgetMap.get(e.target.value)?.monthlyAmount ?? ''))
          }}
        >
          <option value="">+ Set budget for…</option>
          {selectGroups.map(({ parent, children }) => (
            <optgroup key={parent.id} label={`${parent.icon} ${parent.name}`}>
              <option value={parent.id}>{parent.name} (all)</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {editingId && (
        <div className="card" style={{ marginBottom: 16, padding: 12 }}>
          <div className="flex gap-sm items-center" style={{ flexWrap: 'wrap' }}>
            <span className="font-medium">
              {getCategoryLabel(categories, editingId)} budget
            </span>
            <input
              className="input"
              type="number"
              min={0}
              step={10}
              placeholder="Monthly amount"
              style={{ maxWidth: 140 }}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
            />
            <button className="btn btn-primary btn-sm" onClick={() => void handleSave(editingId)}>
              Save
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-muted text-sm">
          No budgets set for this month. Choose a parent or subcategory above to set a limit.
        </p>
      ) : (
        <div className="budget-list">
          {rows.map(({ cat, spent, limit, pct }) => {
            const isChild = Boolean(cat.parentId)
            return (
              <div
                key={cat.id}
                className={`budget-row ${isChild ? 'budget-row-child' : ''}`}
              >
                <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
                  <span className="font-medium">
                    {isChild && <span className="text-muted">↳ </span>}
                    {cat.icon} {cat.name}
                    {!isChild && limit > 0 && (
                      <span className="badge badge-info" style={{ marginLeft: 8 }}>
                        parent
                      </span>
                    )}
                  </span>
                  <span className="text-sm">
                    {formatCurrency(spent)}
                    {limit > 0 && (
                      <span className="text-muted"> / {formatCurrency(limit)}</span>
                    )}
                    {limit > 0 && pct >= 100 && (
                      <span className="badge badge-danger" style={{ marginLeft: 8 }}>
                        Over budget
                      </span>
                    )}
                    {limit > 0 && pct >= 80 && pct < 100 && (
                      <span className="badge badge-warning" style={{ marginLeft: 8 }}>
                        {pct.toFixed(0)}% used
                      </span>
                    )}
                  </span>
                </div>
                {limit > 0 && (
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${statusClass(pct)}`}
                      style={{ width: `${clamp(pct, 0, 100)}%` }}
                    />
                  </div>
                )}
                {limit === 0 && spent > 0 && (
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ marginTop: 4 }}
                    onClick={() => {
                      setEditingId(cat.id)
                      setEditValue('')
                    }}
                  >
                    Set budget
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
