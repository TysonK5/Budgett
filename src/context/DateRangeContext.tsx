import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Transaction } from '@/types/transaction'

export type DatePreset =
  | 'all'
  | 'this_month'
  | 'last_month'
  | 'last_3_months'
  | 'last_12_months'
  | 'ytd'
  | 'custom'

export interface DateRangeBounds {
  /** Inclusive YYYY-MM-DD, or null for open start */
  start: string | null
  /** Inclusive YYYY-MM-DD, or null for open end */
  end: string | null
}

interface DateRangeState {
  preset: DatePreset
  /** Custom range start (YYYY-MM-DD) */
  customStart: string
  /** Custom range end (YYYY-MM-DD) */
  customEnd: string
}

interface DateRangeContextValue {
  preset: DatePreset
  customStart: string
  customEnd: string
  /** Resolved bounds for filtering */
  bounds: DateRangeBounds
  /** Human-readable summary */
  label: string
  setPreset: (preset: DatePreset) => void
  setCustomStart: (value: string) => void
  setCustomEnd: (value: string) => void
  setCustomRange: (start: string, end: string) => void
  clear: () => void
  filterTransactions: <T extends { date: string }>(items: T[]) => T[]
  isInRange: (date: string) => boolean
}

const STORAGE_KEY = 'budgett-date-range'
const DEFAULT_STATE: DateRangeState = {
  preset: 'all',
  customStart: '',
  customEnd: '',
}

const PRESET_LABELS: Record<DatePreset, string> = {
  all: 'All time',
  this_month: 'This month',
  last_month: 'Last month',
  last_3_months: 'Last 3 months',
  last_12_months: 'Last 12 months',
  ytd: 'Year to date',
  custom: 'Custom',
}

export const DATE_PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: 'all', label: PRESET_LABELS.all },
  { value: 'this_month', label: PRESET_LABELS.this_month },
  { value: 'last_month', label: PRESET_LABELS.last_month },
  { value: 'last_3_months', label: PRESET_LABELS.last_3_months },
  { value: 'last_12_months', label: PRESET_LABELS.last_12_months },
  { value: 'ytd', label: PRESET_LABELS.ytd },
  { value: 'custom', label: PRESET_LABELS.custom },
]

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function resolveDateBounds(state: DateRangeState): DateRangeBounds {
  const now = new Date()
  const today = toISODate(now)

  switch (state.preset) {
    case 'all':
      return { start: null, end: null }
    case 'this_month': {
      const start = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`
      return { start, end: today }
    }
    case 'last_month': {
      const startD = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endD = new Date(now.getFullYear(), now.getMonth(), 0)
      return { start: toISODate(startD), end: toISODate(endD) }
    }
    case 'last_3_months': {
      const startD = new Date(now.getFullYear(), now.getMonth() - 2, 1)
      return { start: toISODate(startD), end: today }
    }
    case 'last_12_months': {
      const startD = new Date(now.getFullYear(), now.getMonth() - 11, 1)
      return { start: toISODate(startD), end: today }
    }
    case 'ytd': {
      const start = `${now.getFullYear()}-01-01`
      return { start, end: today }
    }
    case 'custom': {
      let start = state.customStart || null
      let end = state.customEnd || null
      if (start && end && start > end) {
        ;[start, end] = [end, start]
      }
      return { start, end }
    }
    default:
      return { start: null, end: null }
  }
}

export function formatDateRangeLabel(
  preset: DatePreset,
  bounds: DateRangeBounds
): string {
  if (preset === 'all' || (!bounds.start && !bounds.end)) {
    return PRESET_LABELS.all
  }
  if (bounds.start && bounds.end) {
    if (bounds.start === bounds.end) return formatShort(bounds.start)
    return `${formatShort(bounds.start)} – ${formatShort(bounds.end)}`
  }
  if (bounds.start) return `From ${formatShort(bounds.start)}`
  if (bounds.end) return `Until ${formatShort(bounds.end)}`
  return PRESET_LABELS[preset]
}

export function isDateInRange(date: string, bounds: DateRangeBounds): boolean {
  const day = date.slice(0, 10)
  if (bounds.start && day < bounds.start) return false
  if (bounds.end && day > bounds.end) return false
  return true
}

function loadState(): DateRangeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_STATE }
    const parsed = JSON.parse(raw) as Partial<DateRangeState>
    const preset = parsed.preset
    if (!preset || !(preset in PRESET_LABELS)) return { ...DEFAULT_STATE }
    return {
      preset,
      customStart: typeof parsed.customStart === 'string' ? parsed.customStart : '',
      customEnd: typeof parsed.customEnd === 'string' ? parsed.customEnd : '',
    }
  } catch {
    return { ...DEFAULT_STATE }
  }
}

function saveState(state: DateRangeState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* ignore */
  }
}

const DateRangeContext = createContext<DateRangeContextValue | null>(null)

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DateRangeState>(() => loadState())

  const update = useCallback((patch: Partial<DateRangeState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch }
      saveState(next)
      return next
    })
  }, [])

  const bounds = useMemo(() => resolveDateBounds(state), [state])
  const label = useMemo(
    () => formatDateRangeLabel(state.preset, bounds),
    [state.preset, bounds]
  )

  const isInRange = useCallback(
    (date: string) => isDateInRange(date, bounds),
    [bounds]
  )

  const filterTransactions = useCallback(
    <T extends { date: string }>(items: T[]): T[] => {
      if (!bounds.start && !bounds.end) return items
      return items.filter((t) => isDateInRange(t.date, bounds))
    },
    [bounds]
  )

  const value = useMemo<DateRangeContextValue>(
    () => ({
      preset: state.preset,
      customStart: state.customStart,
      customEnd: state.customEnd,
      bounds,
      label,
      setPreset: (preset) => update({ preset }),
      setCustomStart: (customStart) =>
        update({ customStart, preset: 'custom' }),
      setCustomEnd: (customEnd) => update({ customEnd, preset: 'custom' }),
      setCustomRange: (customStart, customEnd) =>
        update({ customStart, customEnd, preset: 'custom' }),
      clear: () => update({ ...DEFAULT_STATE }),
      filterTransactions,
      isInRange,
    }),
    [state, bounds, label, update, filterTransactions, isInRange]
  )

  return (
    <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>
  )
}

export function useDateRange(): DateRangeContextValue {
  const ctx = useContext(DateRangeContext)
  if (!ctx) {
    throw new Error('useDateRange must be used within DateRangeProvider')
  }
  return ctx
}

/** Convenience: filter a transaction list with the global date range */
export function useDateFilteredTransactions(
  transactions: Transaction[]
): Transaction[] {
  const { filterTransactions } = useDateRange()
  return useMemo(
    () => filterTransactions(transactions),
    [transactions, filterTransactions]
  )
}
