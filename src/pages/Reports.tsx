import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useCharts, type CategorySpend } from '@/hooks/useCharts'
import { exportToExcel } from '@/lib/export/excel'
import { exportToPdf } from '@/lib/export/pdf'
import { formatCurrency, formatDate } from '@/lib/utils'
import { expandCategoryFilter } from '@/lib/categoryHelpers'
import {
  groupTransactionsBySummary,
  type SummaryGroup,
} from '@/lib/summaryGroups'
import { CategoryPieChart } from '@/components/CategoryPieChart'
import { SortableTh } from '@/components/SortableTh'
import { ToastContainer } from '@/components/Toast'
import { useToast } from '@/hooks/useToast'
import { sortItems, useTableSort } from '@/hooks/useTableSort'
import {
  useDateFilteredTransactions,
  useDateRange,
} from '@/context/DateRangeContext'
import type { RulesLocationState } from '@/pages/Rules'

/** How rows are rolled up in Category details */
type CategoryDetailMode = 'parent' | 'subcategory'

type MerchantSort = 'rank' | 'name' | 'amount'
type CategoryDetailSort = 'name' | 'count' | 'amount' | 'pct'
type SummarySort = 'label' | 'count' | 'amount'

export function Reports() {
  const navigate = useNavigate()
  const { transactions: allTransactions, loading } = useTransactions()
  const filtered = useDateFilteredTransactions(allTransactions)
  const { label: rangeLabel, preset, bounds } = useDateRange()
  const { categories } = useCategories()
  const { toasts, show, dismiss } = useToast()

  const [detailMode, setDetailMode] = useState<CategoryDetailMode>('parent')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set())

  const { spendingByCategory, spendingByParent, totals, topMerchants } = useCharts(filtered, categories)

  const merchantSort = useTableSort<MerchantSort>(
    'reports-merchants',
    { field: 'amount', direction: 'desc' },
    ['rank', 'name', 'amount'] as const
  )
  const categorySort = useTableSort<CategoryDetailSort>(
    'reports-category-details',
    { field: 'amount', direction: 'desc' },
    ['name', 'count', 'amount', 'pct'] as const
  )
  const summarySort = useTableSort<SummarySort>(
    'reports-summary-groups',
    { field: 'amount', direction: 'desc' },
    ['label', 'count', 'amount'] as const
  )

  const detailRowsBase: CategorySpend[] =
    detailMode === 'parent' ? spendingByParent : spendingByCategory

  const detailRows = useMemo(() => {
    const spending = totals.spending
    return sortItems(detailRowsBase, categorySort.field, categorySort.direction, (c, field) => {
      if (field === 'name') return c.name
      if (field === 'count') return c.count
      if (field === 'amount') return c.amount
      return spending > 0 ? (c.amount / spending) * 100 : 0
    })
  }, [detailRowsBase, categorySort.field, categorySort.direction, totals.spending])

  const sortedMerchants = useMemo(() => {
    const withRank = topMerchants.map((m, i) => ({ ...m, rank: i + 1 }))
    return sortItems(withRank, merchantSort.field, merchantSort.direction, (m, field) => {
      if (field === 'rank') return m.rank
      if (field === 'name') return m.name
      return m.amount
    })
  }, [topMerchants, merchantSort.field, merchantSort.direction])

  // Reset drill-down when date range or grouping mode changes
  useEffect(() => {
    setSelectedCategoryId(null)
    setExpandedGroups(new Set())
  }, [preset, bounds.start, bounds.end, detailMode])

  const selectedCategory = useMemo(
    () => detailRowsBase.find((c) => c.categoryId === selectedCategoryId) ?? null,
    [detailRowsBase, selectedCategoryId]
  )

  const categoryTransactions = useMemo(() => {
    if (!selectedCategoryId) return []
    if (detailMode === 'parent') {
      const ids = expandCategoryFilter(categories, selectedCategoryId)
      return filtered.filter((t) => t.type === 'debit' && ids.has(t.categoryId))
    }
    return filtered.filter(
      (t) => t.categoryId === selectedCategoryId && t.type === 'debit'
    )
  }, [filtered, selectedCategoryId, detailMode, categories])

  const summaryGroups = useMemo(() => {
    const groups = groupTransactionsBySummary(categoryTransactions)
    return sortItems(groups, summarySort.field, summarySort.direction, (g, field) => {
      if (field === 'label') return g.label
      if (field === 'count') return g.count
      return g.amount
    })
  }, [categoryTransactions, summarySort.field, summarySort.direction])

  const toggleCategory = (categoryId: string) => {
    setSelectedCategoryId((prev) => (prev === categoryId ? null : categoryId))
    setExpandedGroups(new Set())
  }

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  /** Prefer normalized key for rules; fall back to representative label */
  const ruleKeywordForGroup = (group: SummaryGroup): string => {
    const key = group.key.trim()
    if (key && key !== 'UNKNOWN') return key
    return group.label.trim()
  }

  const openRuleForGroup = (group: SummaryGroup) => {
    const state: RulesLocationState = {
      prefillDescription: ruleKeywordForGroup(group),
      prefillCategoryId: selectedCategoryId ?? undefined,
    }
    navigate('/rules', { state })
  }

  const exportSuffix =
    preset === 'all'
      ? 'all'
      : bounds.start && bounds.end
        ? `${bounds.start}_to_${bounds.end}`
        : preset

  const handleExcel = () => {
    if (filtered.length === 0) {
      show('No transactions to export', 'warning')
      return
    }
    exportToExcel(
      filtered,
      categories,
      `budgett-transactions-${exportSuffix}.xlsx`
    )
    show('Excel file downloaded', 'success')
  }

  const handlePdf = () => {
    if (filtered.length === 0) {
      show('No transactions to export', 'warning')
      return
    }
    exportToPdf(filtered, categories, {
      period: preset === 'all' ? undefined : rangeLabel,
      title: 'Budgett Spending Report',
    })
    show('PDF report downloaded', 'success')
  }

  if (loading) {
    return <div className="skeleton" style={{ height: 300 }} />
  }

  if (allTransactions.length === 0) {
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

  if (filtered.length === 0) {
    return (
      <div className="page-reports">
        <div className="page-header">
          <h1>Reports</h1>
          <p className="text-muted">No transactions in {rangeLabel}</p>
        </div>
        <div className="card empty-state text-center">
          <p className="text-muted">
            Widen the date range filter in the top bar, or choose All time.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-reports">
      <div className="page-header flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Reports</h1>
          <p className="text-muted">
            Summaries and export · {rangeLabel}
          </p>
        </div>
        <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
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
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Top merchants</h3>
          <table className="data-table">
            <thead>
              <tr>
                <SortableTh
                  field="rank"
                  activeField={merchantSort.field}
                  direction={merchantSort.direction}
                  onToggle={(f) => merchantSort.toggleSort(f, 'asc')}
                >
                  #
                </SortableTh>
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
                <tr key={`${m.rank}-${m.name}`}>
                  <td>{m.rank}</td>
                  <td className="desc-cell">{m.name}</td>
                  <td>{formatCurrency(m.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div
          className="flex justify-between items-center"
          style={{ marginBottom: 12, flexWrap: 'wrap', gap: 12 }}
        >
          <div>
            <h3 style={{ marginBottom: 4 }}>Category details</h3>
            <p className="text-muted text-sm">
              Click a row to see transactions grouped by similar summaries
            </p>
          </div>
          <div
            className="trend-mode-toggle"
            role="group"
            aria-label="Category details grouping"
          >
            <button
              type="button"
              className={`trend-mode-btn ${detailMode === 'parent' ? 'active' : ''}`}
              onClick={() => setDetailMode('parent')}
              aria-pressed={detailMode === 'parent'}
            >
              Parent
            </button>
            <button
              type="button"
              className={`trend-mode-btn ${detailMode === 'subcategory' ? 'active' : ''}`}
              onClick={() => setDetailMode('subcategory')}
              aria-pressed={detailMode === 'subcategory'}
            >
              Parent / subcategory
            </button>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <SortableTh
                field="name"
                activeField={categorySort.field}
                direction={categorySort.direction}
                onToggle={(f) => categorySort.toggleSort(f, 'asc')}
              >
                {detailMode === 'parent' ? 'Parent category' : 'Category'}
              </SortableTh>
              <SortableTh
                field="count"
                activeField={categorySort.field}
                direction={categorySort.direction}
                onToggle={(f) => categorySort.toggleSort(f, 'desc')}
              >
                Transactions
              </SortableTh>
              <SortableTh
                field="amount"
                activeField={categorySort.field}
                direction={categorySort.direction}
                onToggle={(f) => categorySort.toggleSort(f, 'desc')}
              >
                Amount
              </SortableTh>
              <SortableTh
                field="pct"
                activeField={categorySort.field}
                direction={categorySort.direction}
                onToggle={(f) => categorySort.toggleSort(f, 'desc')}
              >
                % of spend
              </SortableTh>
            </tr>
          </thead>
          <tbody>
            {detailRows.map((c) => {
              const isSelected = selectedCategoryId === c.categoryId
              return (
                <tr
                  key={c.categoryId}
                  className={`clickable-row ${isSelected ? 'row-selected' : ''}`}
                  onClick={() => toggleCategory(c.categoryId)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      toggleCategory(c.categoryId)
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={`View summaries for ${c.name}`}
                >
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
              )
            })}
          </tbody>
        </table>
      </div>

      {selectedCategory && (
        <div className="card category-summary-panel fade-in" style={{ marginTop: 16 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3 style={{ marginBottom: 4 }}>
                <span
                  className="category-pill"
                  style={{
                    background: `${selectedCategory.color}22`,
                    color: selectedCategory.color,
                    marginRight: 8,
                  }}
                >
                  {selectedCategory.name}
                </span>
                Transaction summaries
              </h3>
              <p className="text-muted text-sm">
                {summaryGroups.length} unique summary group
                {summaryGroups.length === 1 ? '' : 's'} · {categoryTransactions.length}{' '}
                transaction
                {categoryTransactions.length === 1 ? '' : 's'} ·{' '}
                {formatCurrency(selectedCategory.amount)} total
              </p>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSelectedCategoryId(null)
                setExpandedGroups(new Set())
              }}
            >
              Close
            </button>
          </div>

          {summaryGroups.length === 0 ? (
            <p className="text-muted text-sm">No debit transactions in this category for the selected period.</p>
          ) : (
            <table className="data-table summary-groups-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }} aria-hidden />
                  <SortableTh
                    field="label"
                    activeField={summarySort.field}
                    direction={summarySort.direction}
                    onToggle={(f) => summarySort.toggleSort(f, 'asc')}
                  >
                    Summary
                  </SortableTh>
                  <SortableTh
                    field="count"
                    activeField={summarySort.field}
                    direction={summarySort.direction}
                    onToggle={(f) => summarySort.toggleSort(f, 'desc')}
                  >
                    Count
                  </SortableTh>
                  <SortableTh
                    field="amount"
                    activeField={summarySort.field}
                    direction={summarySort.direction}
                    onToggle={(f) => summarySort.toggleSort(f, 'desc')}
                  >
                    Total
                  </SortableTh>
                  <th>Rule</th>
                </tr>
              </thead>
              <tbody>
                {summaryGroups.map((group) => {
                  const open = expandedGroups.has(group.key)
                  return (
                    <SummaryGroupRows
                      key={group.key}
                      group={group}
                      open={open}
                      onToggle={() => toggleGroup(group.key)}
                      onCreateRule={() => openRuleForGroup(group)}
                    />
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}

function SummaryGroupRows({
  group,
  open,
  onToggle,
  onCreateRule,
}: {
  group: SummaryGroup
  open: boolean
  onToggle: () => void
  onCreateRule: () => void
}) {
  return (
    <>
      <tr
        className={`clickable-row summary-group-row ${open ? 'row-selected' : ''}`}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onToggle()
          }
        }}
        tabIndex={0}
        role="button"
        aria-expanded={open}
      >
        <td className="summary-expand-cell">{open ? '▾' : '▸'}</td>
        <td className="desc-cell" title={group.label}>
          {group.label}
        </td>
        <td>{group.count}</td>
        <td className="amount-debit">{formatCurrency(group.amount)}</td>
        <td className="summary-rule-cell">
          <button
            type="button"
            className="btn btn-secondary btn-sm summary-rule-btn"
            onClick={(e) => {
              e.stopPropagation()
              onCreateRule()
            }}
            title="Open Rules with this summary prefilled"
          >
            Update or create rule
          </button>
        </td>
      </tr>
      {open &&
        group.transactions.map((t) => (
          <tr key={t.id} className="summary-txn-row">
            <td />
            <td className="desc-cell" title={t.description}>
              <span className="summary-txn-date">{formatDate(t.date)}</span>
              <span className="summary-txn-desc">{t.description}</span>
            </td>
            <td />
            <td className={t.type === 'credit' ? 'amount-credit' : 'amount-debit'}>
              {t.type === 'credit' ? '+' : ''}
              {formatCurrency(t.amount)}
            </td>
            <td />
          </tr>
        ))}
    </>
  )
}
