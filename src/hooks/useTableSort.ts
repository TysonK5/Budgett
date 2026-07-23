import { useCallback, useState } from 'react'

export type SortDirection = 'asc' | 'desc'

export interface TableSortState<F extends string = string> {
  field: F
  direction: SortDirection
}

const STORAGE_PREFIX = 'budgett-table-sort:'

function loadSort<F extends string>(
  tableId: string,
  defaults: TableSortState<F>,
  allowed?: readonly F[]
): TableSortState<F> {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + tableId)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw) as { field?: string; direction?: string }
    const field = parsed.field as F | undefined
    const direction = parsed.direction
    if (
      !field ||
      (allowed && !allowed.includes(field)) ||
      (direction !== 'asc' && direction !== 'desc')
    ) {
      return { ...defaults }
    }
    return { field, direction }
  } catch {
    return { ...defaults }
  }
}

function saveSort<F extends string>(tableId: string, state: TableSortState<F>): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + tableId, JSON.stringify(state))
  } catch {
    // ignore quota / private mode
  }
}

/**
 * Persistable table sort state (field + direction) in localStorage.
 * Key: `budgett-table-sort:{tableId}`
 */
export function useTableSort<F extends string>(
  tableId: string,
  defaults: TableSortState<F>,
  allowedFields?: readonly F[]
) {
  const [state, setState] = useState<TableSortState<F>>(() =>
    loadSort(tableId, defaults, allowedFields)
  )

  const setSort = useCallback(
    (next: TableSortState<F>) => {
      setState(next)
      saveSort(tableId, next)
    },
    [tableId]
  )

  /**
   * Toggle sort: same field flips direction; new field uses defaultDirForField or 'asc'.
   */
  const toggleSort = useCallback(
    (field: F, defaultDirForField?: SortDirection) => {
      setState((prev) => {
        const next: TableSortState<F> =
          prev.field === field
            ? {
                field,
                direction: prev.direction === 'asc' ? 'desc' : 'asc',
              }
            : {
                field,
                direction: defaultDirForField ?? 'asc',
              }
        saveSort(tableId, next)
        return next
      })
    },
    [tableId]
  )

  const sortIcon = useCallback(
    (field: F) => {
      if (state.field !== field) return '↕'
      return state.direction === 'asc' ? '↑' : '↓'
    },
    [state.field, state.direction]
  )

  const reset = useCallback(() => {
    setSort({ ...defaults })
  }, [defaults, setSort])

  return {
    field: state.field,
    direction: state.direction,
    sort: state,
    setSort,
    toggleSort,
    sortIcon,
    reset,
  }
}

/** Compare two primitive values for sorting */
export function compareValues(
  a: string | number,
  b: string | number,
  direction: SortDirection
): number {
  let cmp = 0
  if (typeof a === 'number' && typeof b === 'number') {
    cmp = a - b
  } else {
    cmp = String(a).localeCompare(String(b), undefined, {
      numeric: true,
      sensitivity: 'base',
    })
  }
  return direction === 'asc' ? cmp : -cmp
}

/** Stable sort helper */
export function sortItems<T, F extends string>(
  items: readonly T[],
  field: F,
  direction: SortDirection,
  getValue: (item: T, field: F) => string | number
): T[] {
  return [...items].sort((a, b) =>
    compareValues(getValue(a, field), getValue(b, field), direction)
  )
}
