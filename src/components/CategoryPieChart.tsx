import { useCallback, useState } from 'react'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CategorySpend } from '@/hooks/useCharts'
import { formatCurrency } from '@/lib/utils'

export type CategoryChartType = 'donut' | 'pie' | 'bar' | 'barHorizontal' | 'radial'

const CHART_OPTIONS: { value: CategoryChartType; label: string }[] = [
  { value: 'donut', label: 'Donut' },
  { value: 'pie', label: 'Pie' },
  { value: 'bar', label: 'Bar (vertical)' },
  { value: 'barHorizontal', label: 'Bar (horizontal)' },
  { value: 'radial', label: 'Radial' },
]

const STORAGE_PREFIX = 'budgett-chart-type:'

function loadChartType(
  storageKey: string | undefined,
  fallback: CategoryChartType
): CategoryChartType {
  if (!storageKey) return fallback
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + storageKey)
    if (raw && CHART_OPTIONS.some((o) => o.value === raw)) {
      return raw as CategoryChartType
    }
  } catch {
    /* ignore */
  }
  return fallback
}

function saveChartType(storageKey: string | undefined, type: CategoryChartType): void {
  if (!storageKey) return
  try {
    localStorage.setItem(STORAGE_PREFIX + storageKey, type)
  } catch {
    /* ignore */
  }
}

interface CategoryPieChartProps {
  data: CategorySpend[]
  /** Persist chart type under `budgett-chart-type:{storageKey}` */
  storageKey?: string
  /** Default when nothing is stored */
  defaultType?: CategoryChartType
  /** Show the chart-type dropdown (default true when storageKey is set) */
  showTypeSelect?: boolean
  height?: number
}

export function CategoryPieChart({
  data,
  storageKey,
  defaultType = 'donut',
  showTypeSelect,
  height = 280,
}: CategoryPieChartProps) {
  const allowSelect = showTypeSelect ?? Boolean(storageKey)
  const [chartType, setChartType] = useState<CategoryChartType>(() =>
    loadChartType(storageKey, defaultType)
  )

  const onTypeChange = useCallback(
    (next: CategoryChartType) => {
      setChartType(next)
      saveChartType(storageKey, next)
    },
    [storageKey]
  )

  if (data.length === 0) {
    return (
      <div className="chart-empty">
        <p className="text-muted">No spending data yet. Upload a statement to get started.</p>
      </div>
    )
  }

  const chartData = data.map((d) => ({
    name: d.name,
    value: d.amount,
    color: d.color,
    // RadialBar needs a fill on the data item
    fill: d.color,
  }))

  const total = chartData.reduce((s, d) => s + d.value, 0)

  const tooltipStyle = {
    borderRadius: 8,
    border: '1px solid var(--color-border)',
    fontSize: 13,
  } as const

  const barHeight =
    chartType === 'barHorizontal'
      ? Math.max(height, chartData.length * 36 + 40)
      : height

  return (
    <div className="category-chart">
      {allowSelect && (
        <div className="category-chart-toolbar flex justify-between items-center" style={{ marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
          <span className="text-xs text-muted">
            {chartData.length} categor{chartData.length === 1 ? 'y' : 'ies'} ·{' '}
            {formatCurrency(total)} total
          </span>
          <label className="category-chart-type-label text-xs text-muted flex items-center gap-sm">
            Chart type
            <select
              className="select select-sm"
              value={chartType}
              onChange={(e) => onTypeChange(e.target.value as CategoryChartType)}
              aria-label="Spending by category chart type"
              style={{ maxWidth: 180 }}
            >
              {CHART_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <ResponsiveContainer width="100%" height={barHeight}>
        {chartType === 'donut' || chartType === 'pie' ? (
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={chartType === 'donut' ? 60 : 0}
              outerRadius={100}
              paddingAngle={2}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={tooltipStyle}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{ fontSize: 12 }}
            />
          </PieChart>
        ) : chartType === 'bar' ? (
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              interval={0}
              angle={-25}
              textAnchor="end"
              height={50}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
              }
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={tooltipStyle}
            />
            <Bar dataKey="value" name="Spending" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        ) : chartType === 'barHorizontal' ? (
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
          >
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
              }
            />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={tooltipStyle}
            />
            <Bar dataKey="value" name="Spending" radius={[0, 4, 4, 0]} barSize={18}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        ) : (
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="20%"
            outerRadius="90%"
            data={[...chartData].reverse()}
            startAngle={180}
            endAngle={-180}
          >
            <RadialBar
              dataKey="value"
              background
              cornerRadius={4}
              label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }}
            />
            <Legend
              iconSize={10}
              layout="vertical"
              align="right"
              verticalAlign="middle"
              wrapperStyle={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={tooltipStyle}
            />
          </RadialBarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}
