import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CategoryPieChart } from '@/components/CategoryPieChart'
import { MonthlyBarChart } from '@/components/MonthlyBarChart'
import { TrendLineChart } from '@/components/TrendLineChart'
import { BudgetTracker } from '@/components/BudgetTracker'
import { SortableTh } from '@/components/SortableTh'
import { StatCard } from '@/components/StatCard'
import { useDateFilteredTransactions } from '@/context/DateRangeContext'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useBudgets } from '@/hooks/useBudgets'
import { useCharts } from '@/hooks/useCharts'
import { sortItems, useTableSort } from '@/hooks/useTableSort'
import { formatCurrency } from '@/lib/utils'

type MerchantSort = 'name' | 'amount'

export function Dashboard() {
  const { transactions: allTransactions, loading } = useTransactions()
  const transactions = useDateFilteredTransactions(allTransactions)
  const { categories } = useCategories()
  const { budgets, setBudget, period } = useBudgets()
  const { spendingByParent, monthlySpending, totals, topMerchants } =
    useCharts(transactions, categories)

  const merchantSort = useTableSort<MerchantSort>(
    'dashboard-merchants',
    { field: 'amount', direction: 'desc' },
    ['name', 'amount'] as const
  )

  const sortedMerchants = useMemo(
    () =>
      sortItems(topMerchants, merchantSort.field, merchantSort.direction, (m, field) =>
        field === 'name' ? m.name : m.amount
      ),
    [topMerchants, merchantSort.field, merchantSort.direction]
  )

  if (loading) {
    return (
      <div className="page-dashboard">
        <div className="skeleton" style={{ height: 40, width: 200, marginBottom: 24 }} />
        <div className="stats-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 100 }} />
          ))}
        </div>
      </div>
    )
  }

  if (allTransactions.length === 0) {
    return (
      <div className="page-dashboard">
        <div className="page-header">
          <h1>Dashboard</h1>
        </div>
        <div className="card empty-state text-center">
          <div style={{ fontSize: 48, marginBottom: 12 }}>📊</div>
          <h2>No data yet</h2>
          <p className="text-muted" style={{ marginBottom: 16 }}>
            Upload a bank statement to see spending charts and budgets.
          </p>
          <Link to="/upload" className="btn btn-primary">
            Upload statement
          </Link>
        </div>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="page-dashboard">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p className="text-muted">No transactions in the selected date range</p>
        </div>
        <div className="card empty-state text-center">
          <p className="text-muted" style={{ marginBottom: 12 }}>
            Try widening the date range filter in the top bar, or choose All time.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="text-muted">Overview of your spending and budgets</p>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Total spending"
          value={formatCurrency(totals.spending)}
          icon="💸"
          accent="var(--color-danger)"
        />
        <StatCard
          label="Total income"
          value={formatCurrency(totals.income)}
          icon="💰"
          accent="var(--color-success)"
        />
        <StatCard
          label="Net"
          value={formatCurrency(totals.net)}
          icon="⚖️"
          accent={totals.net >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
        />
        <StatCard label="Transactions" value={String(totals.count)} icon="🧾" />
      </div>

      <div className="charts-grid">
        <div className="card chart-card chart-wide">
          <h3>Spending by category</h3>
          <p className="text-xs text-muted" style={{ marginBottom: 8 }}>
            Parent rollup — subcategories are included in their parent
          </p>
          <CategoryPieChart
            data={spendingByParent}
            storageKey="spending-by-category"
            defaultType="donut"
          />
        </div>
        <div className="card chart-card chart-wide">
          <h3>Monthly comparison</h3>
          <MonthlyBarChart data={monthlySpending} />
        </div>
        <div className="card chart-card chart-wide">
          <h3>Spending trends</h3>
          <p className="text-xs text-muted" style={{ marginBottom: 8 }}>
            Toggle categories · Weekly (Mon–Sun) or Monthly (1st–last) · Grouped or Aggregate
          </p>
          <TrendLineChart transactions={transactions} categories={categories} />
        </div>
      </div>

      <div className="dashboard-bottom">
        <div className="card">
          <BudgetTracker
            categories={categories}
            budgets={budgets}
            transactions={transactions}
            period={period}
            onSetBudget={setBudget}
          />
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Top merchants</h3>
          {topMerchants.length === 0 ? (
            <p className="text-muted text-sm">No spending merchants yet.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <SortableTh
                    field="name"
                    activeField={merchantSort.field}
                    direction={merchantSort.direction}
                    onToggle={(f) => merchantSort.toggleSort(f, 'asc')}
                  >
                    Merchant
                  </SortableTh>
                  <SortableTh
                    field="amount"
                    activeField={merchantSort.field}
                    direction={merchantSort.direction}
                    onToggle={(f) => merchantSort.toggleSort(f, 'desc')}
                  >
                    Amount
                  </SortableTh>
                </tr>
              </thead>
              <tbody>
                {sortedMerchants.map((m) => (
                  <tr key={m.name}>
                    <td className="desc-cell" title={m.name}>
                      {m.name}
                    </td>
                    <td className="font-medium">{formatCurrency(m.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
