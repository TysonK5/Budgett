import { useMemo, useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useCharts } from '@/hooks/useCharts'
import { exportToExcel } from '@/lib/export/excel'
import { exportToPdf } from '@/lib/export/pdf'
import { formatCurrency, periodLabel } from '@/lib/utils'
import { CategoryPieChart } from '@/components/CategoryPieChart'
import { ToastContainer } from '@/components/Toast'
import { useToast } from '@/hooks/useToast'
import { Link } from 'react-router-dom'

export function Reports() {
  const { transactions, loading } = useTransactions()
  const { categories } = useCategories()
  const { toasts, show, dismiss } = useToast()

  const periods = useMemo(() => {
    const set = new Set(transactions.map((t) => t.date.slice(0, 7)))
    return Array.from(set).sort().reverse()
  }, [transactions])

  const [period, setPeriod] = useState<string>('all')

  const filtered = useMemo(() => {
    if (period === 'all') return transactions
    return transactions.filter((t) => t.date.startsWith(period))
  }, [transactions, period])

  const { spendingByCategory, spendingByParent, totals, topMerchants } = useCharts(filtered, categories)

  const handleExcel = () => {
    if (filtered.length === 0) {
      show('No transactions to export', 'warning')
      return
    }
    exportToExcel(
      filtered,
      categories,
      period === 'all' ? 'budgett-transactions.xlsx' : `budgett-${period}.xlsx`
    )
    show('Excel file downloaded', 'success')
  }

  const handlePdf = () => {
    if (filtered.length === 0) {
      show('No transactions to export', 'warning')
      return
    }
    exportToPdf(filtered, categories, {
      period: period === 'all' ? undefined : period,
      title: 'Budgett Spending Report',
    })
    show('PDF report downloaded', 'success')
  }

  if (loading) {
    return <div className="skeleton" style={{ height: 300 }} />
  }

  if (transactions.length === 0) {
    return (
      <div className="page-reports">
        <div className="page-header">
          <h1>Reports</h1>
        </div>
        <div className="card empty-state text-center">
          <p className="text-muted" style={{ marginBottom: 12 }}>
            Import transactions to generate reports.
          </p>
          <Link to="/upload" className="btn btn-primary">
            Upload statement
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-reports">
      <div className="page-header flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Reports</h1>
          <p className="text-muted">Period summaries and export</p>
        </div>
        <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
          <select
            className="select"
            style={{ maxWidth: 180 }}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="all">All time</option>
            {periods.map((p) => (
              <option key={p} value={p}>
                {periodLabel(p)}
              </option>
            ))}
          </select>
          <button className="btn btn-secondary" onClick={handleExcel}>
            📗 Export Excel
          </button>
          <button className="btn btn-primary" onClick={handlePdf}>
            📕 Export PDF
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="card">
          <div className="text-sm text-muted">Spending</div>
          <div className="stat-value" style={{ color: 'var(--color-danger)' }}>
            {formatCurrency(totals.spending)}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-muted">Income</div>
          <div className="stat-value" style={{ color: 'var(--color-success)' }}>
            {formatCurrency(totals.income)}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-muted">Net</div>
          <div className="stat-value">{formatCurrency(totals.net)}</div>
        </div>
        <div className="card">
          <div className="text-sm text-muted">Transactions</div>
          <div className="stat-value">{totals.count}</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card chart-card">
          <h3>Category breakdown (parent)</h3>
          <CategoryPieChart data={spendingByParent} />
        </div>
        <div className="card chart-card">
          <h3>Subcategory detail</h3>
          <CategoryPieChart data={spendingByCategory} />
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Top merchants</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Merchant</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {topMerchants.map((m, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td className="desc-cell">{m.name}</td>
                  <td>{formatCurrency(m.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Category details</h3>
        <table className="data-table">
          <thead>
            <tr>
              <th>Category</th>
              <th>Transactions</th>
              <th>Amount</th>
              <th>% of spend</th>
            </tr>
          </thead>
          <tbody>
            {spendingByCategory.map((c) => (
              <tr key={c.categoryId}>
                <td>
                  <span
                    className="category-pill"
                    style={{ background: `${c.color}22`, color: c.color }}
                  >
                    {c.name}
                  </span>
                </td>
                <td>{c.count}</td>
                <td>{formatCurrency(c.amount)}</td>
                <td>
                  {totals.spending > 0
                    ? `${((c.amount / totals.spending) * 100).toFixed(1)}%`
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
