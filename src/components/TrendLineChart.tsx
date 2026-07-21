import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Category, Transaction } from '@/types/transaction'
import { getParents, getRootCategoryId } from '@/lib/categoryHelpers'
import { formatCurrency } from '@/lib/utils'

interface TrendLineChartProps {
  transactions: Transaction[]
  categories: Category[]
}

interface ParentSeries {
  id: string
  name: string
  color: string
  total: number
}

type TrendMode = 'grouped' | 'aggregate'
/** Week = Mon–Sun; Month = calendar month (1st–last day) */
type PeriodGrain = 'week' | 'month'

const AGGREGATE_KEY = 'total'
const AGGREGATE_COLOR = '#4f46e5'

function parseISODate(dateStr: string): Date {
  // Force local calendar day (avoid UTC shift)
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Monday of the week containing `date` (Mon–Sun week) */
function startOfWeekMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay() // 0=Sun … 6=Sat
  const diff = day === 0 ? -6 : 1 - day // shift back to Monday
  d.setDate(d.getDate() + diff)
  return d
}

function endOfWeekSunday(monday: Date): Date {
  const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate())
  d.setDate(d.getDate() + 6)
  return d
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function formatShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export interface PeriodBucket {
  /** Sort key (ISO start date) */
  key: string
  /** Axis / tooltip label */
  label: string
  /** Full range for tooltip */
  rangeLabel: string
}

/** Map a transaction date string to its period bucket */
export function getPeriodBucket(dateStr: string, grain: PeriodGrain): PeriodBucket {
  const date = parseISODate(dateStr)

  if (grain === 'week') {
    const start = startOfWeekMonday(date)
    const end = endOfWeekSunday(start)
    const key = toISODate(start)
    const sameYear = start.getFullYear() === end.getFullYear()
    const rangeLabel = sameYear
      ? `${formatShort(start)} – ${formatShort(end)}, ${end.getFullYear()}`
      : `${formatShort(start)}, ${start.getFullYear()} – ${formatShort(end)}, ${end.getFullYear()}`
    // Compact axis: "Jan 6" (week of Monday)
    const label = `W ${formatShort(start)}`
    return { key, label, rangeLabel }
  }

  // month
  const start = startOfMonth(date)
  const end = endOfMonth(date)
  const key = toISODate(start)
  const label = start.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  const rangeLabel = `${formatShort(start)} – ${formatShort(end)}, ${start.getFullYear()}`
  return { key, label, rangeLabel }
}

export function TrendLineChart({ transactions, categories }: TrendLineChartProps) {
  const catMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  )

  const [mode, setMode] = useState<TrendMode>('grouped')
  const [grain, setGrain] = useState<PeriodGrain>('week')

  /** Parent categories that appear in debit transactions (with totals) */
  const parentSeries = useMemo((): ParentSeries[] => {
    const totals = new Map<string, number>()
    for (const t of transactions) {
      if (t.type === 'credit') continue
      const rootId = getRootCategoryId(catMap, t.categoryId)
      totals.set(rootId, (totals.get(rootId) ?? 0) + t.amount)
    }

    const parents = getParents(categories)
    return parents
      .filter((p) => (totals.get(p.id) ?? 0) > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        total: Math.round((totals.get(p.id) ?? 0) * 100) / 100,
      }))
      .sort((a, b) => b.total - a.total)
  }, [transactions, categories, catMap])

  const [selected, setSelected] = useState<Set<string> | null>(null)
  const activeIds = useMemo(() => {
    if (selected === null) {
      return new Set(parentSeries.map((p) => p.id))
    }
    const valid = new Set(parentSeries.map((p) => p.id))
    const next = new Set([...selected].filter((id) => valid.has(id)))
    return next.size > 0 ? next : new Set(parentSeries.map((p) => p.id).slice(0, 3))
  }, [selected, parentSeries])

  const activeSeries = useMemo(
    () => parentSeries.filter((p) => activeIds.has(p.id)),
    [parentSeries, activeIds]
  )

  const selectedTotal = useMemo(
    () => Math.round(activeSeries.reduce((s, p) => s + p.total, 0) * 100) / 100,
    [activeSeries]
  )

  const chartData = useMemo(() => {
    if (activeIds.size === 0) return []

    // periodKey -> { meta, amounts by parentId }
    const byPeriod = new Map<
      string,
      { label: string; rangeLabel: string; amounts: Map<string, number> }
    >()

    for (const t of transactions) {
      if (t.type === 'credit') continue
      const rootId = getRootCategoryId(catMap, t.categoryId)
      if (!activeIds.has(rootId)) continue

      const bucket = getPeriodBucket(t.date, grain)
      let entry = byPeriod.get(bucket.key)
      if (!entry) {
        entry = {
          label: bucket.label,
          rangeLabel: bucket.rangeLabel,
          amounts: new Map(),
        }
        byPeriod.set(bucket.key, entry)
      }
      entry.amounts.set(rootId, (entry.amounts.get(rootId) ?? 0) + t.amount)
    }

    return Array.from(byPeriod.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, { label, rangeLabel, amounts }]) => {
        const row: Record<string, string | number> = {
          periodKey: key,
          label,
          rangeLabel,
        }
        let periodTotal = 0
        for (const id of activeIds) {
          const v = Math.round((amounts.get(id) ?? 0) * 100) / 100
          row[id] = v
          periodTotal += v
        }
        row[AGGREGATE_KEY] = Math.round(periodTotal * 100) / 100
        return row
      })
  }, [transactions, catMap, activeIds, grain])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const base = prev ?? new Set(parentSeries.map((p) => p.id))
      const next = new Set(base)
      if (next.has(id)) {
        if (next.size === 1) return next
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const selectAll = () => setSelected(new Set(parentSeries.map((p) => p.id)))
  const selectNone = () => {
    if (parentSeries[0]) setSelected(new Set([parentSeries[0].id]))
  }

  if (parentSeries.length === 0) {
    return (
      <div className="chart-empty">
        <p className="text-muted">No spending trend data yet.</p>
      </div>
    )
  }

  const aggregateLabel =
    activeSeries.length === 1
      ? activeSeries[0].name
      : `Selected total (${activeSeries.length})`

  const grainHint =
    grain === 'week'
      ? 'Each point is Mon–Sun week total'
      : 'Each point is calendar month (1st–last day)'

  return (
    <div className="trend-chart">
      <div className="trend-toggles">
        <div
          className="trend-toggles-header flex justify-between items-center"
          style={{ flexWrap: 'wrap', gap: 8 }}
        >
          <span className="text-xs text-muted">Parent categories</span>
          <div className="flex gap-sm" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="trend-mode-toggle" role="group" aria-label="Time period">
              <button
                type="button"
                className={`trend-mode-btn ${grain === 'week' ? 'active' : ''}`}
                onClick={() => setGrain('week')}
                aria-pressed={grain === 'week'}
                title="Week over week (Monday–Sunday)"
              >
                Weekly
              </button>
              <button
                type="button"
                className={`trend-mode-btn ${grain === 'month' ? 'active' : ''}`}
                onClick={() => setGrain('month')}
                aria-pressed={grain === 'month'}
                title="Month over month (1st–last day of month)"
              >
                Monthly
              </button>
            </div>
            <div className="trend-mode-toggle" role="group" aria-label="Chart mode">
              <button
                type="button"
                className={`trend-mode-btn ${mode === 'grouped' ? 'active' : ''}`}
                onClick={() => setMode('grouped')}
                aria-pressed={mode === 'grouped'}
                title="One line per selected category"
              >
                Grouped
              </button>
              <button
                type="button"
                className={`trend-mode-btn ${mode === 'aggregate' ? 'active' : ''}`}
                onClick={() => setMode('aggregate')}
                aria-pressed={mode === 'aggregate'}
                title="Single line for sum of selected categories"
              >
                Aggregate
              </button>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={selectAll}>
              All
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={selectNone}>
              Top only
            </button>
          </div>
        </div>
        <div className="trend-toggle-list" role="group" aria-label="Toggle parent categories">
          {parentSeries.map((p) => {
            const on = activeIds.has(p.id)
            return (
              <button
                key={p.id}
                type="button"
                className={`trend-toggle ${on ? 'active' : ''}`}
                style={
                  on
                    ? {
                        borderColor: p.color,
                        background: `${p.color}18`,
                        color: p.color,
                      }
                    : undefined
                }
                onClick={() => toggle(p.id)}
                aria-pressed={on}
                title={`${p.name}: ${formatCurrency(p.total)} total`}
              >
                <span className="trend-toggle-dot" style={{ background: p.color }} />
                <span className="trend-toggle-name">{p.name}</span>
                <span className="trend-toggle-total text-xs">
                  {formatCurrency(p.total)}
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-muted" style={{ marginTop: 8 }}>
          {grainHint}
          {mode === 'aggregate' && (
            <>
              {' · '}
              Combined for {activeSeries.length} selected · {formatCurrency(selectedTotal)} total
            </>
          )}
        </p>
      </div>

      {chartData.length === 0 ? (
        <div className="chart-empty" style={{ height: 220 }}>
          <p className="text-muted">Select at least one category to see trends.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === AGGREGATE_KEY || name === aggregateLabel) {
                  return [formatCurrency(value), aggregateLabel]
                }
                const series = activeSeries.find((s) => s.id === name)
                return [formatCurrency(value), series?.name ?? name]
              }}
              labelFormatter={(_label, payload) => {
                const range = payload?.[0]?.payload?.rangeLabel as string | undefined
                return range
                  ? grain === 'week'
                    ? `Week: ${range}`
                    : `Month: ${range}`
                  : String(_label)
              }}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                fontSize: 13,
              }}
            />
            <Legend
              formatter={(value) => {
                if (value === AGGREGATE_KEY) return aggregateLabel
                const series = activeSeries.find((s) => s.id === value)
                return series?.name ?? value
              }}
            />
            {mode === 'aggregate' ? (
              <Line
                type="monotone"
                dataKey={AGGREGATE_KEY}
                name={AGGREGATE_KEY}
                stroke={AGGREGATE_COLOR}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                connectNulls
              />
            ) : (
              activeSeries.map((s) => (
                <Line
                  key={s.id}
                  type="monotone"
                  dataKey={s.id}
                  name={s.id}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  connectNulls
                />
              ))
            )}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
