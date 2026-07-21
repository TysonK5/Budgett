import { useMemo, useState } from 'react'
import type { Category, SortDirection, SortField, Transaction } from '@/types/transaction'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  expandCategoryFilter,
  getCategoryLabel,
} from '@/lib/categoryHelpers'
import { CategorySelect } from '@/components/CategorySelect'
import { ResizableTh } from '@/components/ResizableTh'
import { useColumnWidths } from '@/hooks/useColumnWidths'

interface TransactionTableProps {
  transactions: Transaction[]
  categories: Category[]
  onUpdateCategory?: (id: string, categoryId: string) => void
  onDelete?: (id: string) => void
  pageSize?: number
}

const DEFAULT_WIDTHS = {
  date: 120,
  description: 280,
  amount: 110,
  type: 90,
  category: 200,
  actions: 72,
} as const

export function TransactionTable({
  transactions,
  categories,
  onUpdateCategory,
  onDelete,
  pageSize = 20,
}: TransactionTableProps) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [page, setPage] = useState(0)

  const showActions = Boolean(onUpdateCategory || onDelete)
  const defaults = useMemo(() => {
    const d: Record<string, number> = { ...DEFAULT_WIDTHS }
    if (!showActions) delete d.actions
    return d
  }, [showActions])

  const { widths, setWidth, reset, startResize } = useColumnWidths(
    'transactions',
    defaults
  )

  const catMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  )

  const filtered = useMemo(() => {
    let list = transactions

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          t.date.includes(q) ||
          String(t.amount).includes(q) ||
          getCategoryLabel(catMap, t.categoryId).toLowerCase().includes(q)
      )
    }
    if (categoryFilter) {
      const ids = expandCategoryFilter(categories, categoryFilter)
      list = list.filter((t) => ids.has(t.categoryId))
    }
    if (typeFilter) {
      list = list.filter((t) => t.type === typeFilter)
    }

    list = [...list].sort((a, b) => {
      let cmp = 0
      if (sortField === 'date') cmp = a.date.localeCompare(b.date)
      else if (sortField === 'description')
        cmp = a.description.localeCompare(b.description)
      else if (sortField === 'amount') cmp = a.amount - b.amount
      else if (sortField === 'categoryId')
        cmp = getCategoryLabel(catMap, a.categoryId).localeCompare(
          getCategoryLabel(catMap, b.categoryId)
        )
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [transactions, search, categoryFilter, typeFilter, sortField, sortDir, categories, catMap])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages - 1)
  const pageItems = filtered.slice(safePage * pageSize, (safePage + 1) * pageSize)

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir(field === 'date' ? 'desc' : 'asc')
    }
    setPage(0)
  }

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return '↕'
    return sortDir === 'asc' ? '↑' : '↓'
  }

  const colKeys = showActions
    ? (['date', 'description', 'amount', 'type', 'category', 'actions'] as const)
    : (['date', 'description', 'amount', 'type', 'category'] as const)

  const tableWidth = colKeys.reduce((sum, k) => sum + (widths[k] ?? defaults[k] ?? 100), 0)

  return (
    <div className="transaction-table-wrap">
      <div className="table-toolbar flex gap-md" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          className="input"
          style={{ maxWidth: 280 }}
          placeholder="Search description, date, amount…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
        />
        <CategorySelect
          categories={categories}
          value={categoryFilter}
          onChange={(id) => {
            setCategoryFilter(id)
            setPage(0)
          }}
          allowEmpty
          emptyLabel="All categories"
          style={{ maxWidth: 220 }}
        />
        <select
          className="select"
          style={{ maxWidth: 140 }}
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value)
            setPage(0)
          }}
        >
          <option value="">All types</option>
          <option value="debit">Debit</option>
          <option value="credit">Credit</option>
        </select>
        <span className="text-sm text-muted" style={{ alignSelf: 'center' }}>
          {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          style={{ marginLeft: 'auto' }}
          onClick={reset}
          title="Reset column widths to defaults"
        >
          Reset columns
        </button>
      </div>

      <div className="table-scroll">
        <table
          className="data-table resizable-table"
          style={{ width: tableWidth, minWidth: '100%', tableLayout: 'fixed' }}
        >
          <colgroup>
            {colKeys.map((k) => (
              <col key={k} style={{ width: widths[k] ?? defaults[k] }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <ResizableTh
                colKey="date"
                width={widths.date ?? DEFAULT_WIDTHS.date}
                className="sortable"
                onClick={() => toggleSort('date')}
                onResizeStart={startResize}
                onResetWidth={(k) => setWidth(k, DEFAULT_WIDTHS.date)}
              >
                Date {sortIcon('date')}
              </ResizableTh>
              <ResizableTh
                colKey="description"
                width={widths.description ?? DEFAULT_WIDTHS.description}
                className="sortable"
                onClick={() => toggleSort('description')}
                onResizeStart={startResize}
                onResetWidth={(k) => setWidth(k, DEFAULT_WIDTHS.description)}
              >
                Description {sortIcon('description')}
              </ResizableTh>
              <ResizableTh
                colKey="amount"
                width={widths.amount ?? DEFAULT_WIDTHS.amount}
                className="sortable"
                onClick={() => toggleSort('amount')}
                onResizeStart={startResize}
                onResetWidth={(k) => setWidth(k, DEFAULT_WIDTHS.amount)}
              >
                Amount {sortIcon('amount')}
              </ResizableTh>
              <ResizableTh
                colKey="type"
                width={widths.type ?? DEFAULT_WIDTHS.type}
                onResizeStart={startResize}
                onResetWidth={(k) => setWidth(k, DEFAULT_WIDTHS.type)}
              >
                Type
              </ResizableTh>
              <ResizableTh
                colKey="category"
                width={widths.category ?? DEFAULT_WIDTHS.category}
                className="sortable"
                onClick={() => toggleSort('categoryId')}
                onResizeStart={startResize}
                onResetWidth={(k) => setWidth(k, DEFAULT_WIDTHS.category)}
              >
                Category {sortIcon('categoryId')}
              </ResizableTh>
              {showActions && (
                <ResizableTh
                  colKey="actions"
                  width={widths.actions ?? DEFAULT_WIDTHS.actions}
                  onResizeStart={startResize}
                  onResetWidth={(k) => setWidth(k, DEFAULT_WIDTHS.actions)}
                >
                  Actions
                </ResizableTh>
              )}
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td
                  colSpan={colKeys.length}
                  className="text-center text-muted"
                  style={{ padding: 32 }}
                >
                  No transactions found
                </td>
              </tr>
            ) : (
              pageItems.map((t) => {
                const cat = catMap.get(t.categoryId)
                const label = getCategoryLabel(catMap, t.categoryId)
                return (
                  <tr key={t.id}>
                    <td>{formatDate(t.date)}</td>
                    <td className="desc-cell" title={t.description}>
                      {t.description}
                    </td>
                    <td className={t.type === 'credit' ? 'amount-credit' : 'amount-debit'}>
                      {t.type === 'credit' ? '+' : '-'}
                      {formatCurrency(t.amount)}
                    </td>
                    <td>
                      <span
                        className={`badge ${t.type === 'credit' ? 'badge-success' : 'badge-info'}`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td>
                      {onUpdateCategory ? (
                        <CategorySelect
                          categories={categories}
                          value={t.categoryId}
                          onChange={(id) => onUpdateCategory(t.id, id)}
                          className="select select-sm"
                          style={{
                            borderLeft: `3px solid ${cat?.color ?? '#94a3b8'}`,
                            width: '100%',
                            minWidth: 0,
                          }}
                        />
                      ) : (
                        <span
                          className="category-pill"
                          title={label}
                          style={{
                            background: `${cat?.color ?? '#94a3b8'}22`,
                            color: cat?.color,
                          }}
                        >
                          {cat?.icon} {label}
                        </span>
                      )}
                    </td>
                    {showActions && (
                      <td>
                        {onDelete && (
                          <button
                            className="btn-icon"
                            title="Delete"
                            onClick={() => onDelete(t.id)}
                          >
                            🗑️
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination flex items-center justify-between" style={{ marginTop: 16 }}>
          <button
            className="btn btn-secondary btn-sm"
            disabled={safePage === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span className="text-sm text-muted">
            Page {safePage + 1} of {totalPages}
          </span>
          <button
            className="btn btn-secondary btn-sm"
            disabled={safePage >= totalPages - 1}
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
