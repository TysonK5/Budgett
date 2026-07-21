import { useCallback, useEffect, useState } from 'react'

const STORAGE_PREFIX = 'budgett-col-widths:'
const MIN_WIDTH = 48
const MAX_WIDTH = 800

function loadWidths(
  tableId: string,
  defaults: Record<string, number>
): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + tableId)
    if (!raw) return { ...defaults }
    const parsed = JSON.parse(raw) as Record<string, number>
    const merged = { ...defaults }
    for (const key of Object.keys(defaults)) {
      if (typeof parsed[key] === 'number' && parsed[key] > 0) {
        merged[key] = clamp(parsed[key], MIN_WIDTH, MAX_WIDTH)
      }
    }
    return merged
  } catch {
    return { ...defaults }
  }
}

function saveWidths(tableId: string, widths: Record<string, number>): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + tableId, JSON.stringify(widths))
  } catch {
    // ignore quota / private mode
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(n)))
}

/**
 * Persistable column widths for a named table.
 * Values are stored in localStorage under `budgett-col-widths:{tableId}`.
 */
export function useColumnWidths(
  tableId: string,
  defaults: Record<string, number>
) {
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    loadWidths(tableId, defaults)
  )

  // Re-merge if defaults keys change (new columns)
  useEffect(() => {
    setWidths((prev) => {
      const next = { ...defaults, ...prev }
      for (const key of Object.keys(defaults)) {
        if (prev[key] == null) next[key] = defaults[key]
      }
      return next
    })
  }, [tableId]) // eslint-disable-line react-hooks/exhaustive-deps -- defaults are stable per table

  const setWidth = useCallback(
    (key: string, width: number) => {
      setWidths((prev) => {
        const next = {
          ...prev,
          [key]: clamp(width, MIN_WIDTH, MAX_WIDTH),
        }
        saveWidths(tableId, next)
        return next
      })
    },
    [tableId]
  )

  const reset = useCallback(() => {
    const next = { ...defaults }
    saveWidths(tableId, next)
    setWidths(next)
  }, [tableId, defaults])

  /**
   * Start a drag-resize from a mouse/pointer event.
   * Call from the resize handle's onPointerDown.
   */
  const startResize = useCallback(
    (key: string, clientX: number) => {
      const startW = widths[key] ?? defaults[key] ?? 100
      const startX = clientX

      const onMove = (e: PointerEvent) => {
        e.preventDefault()
        setWidth(key, startW + (e.clientX - startX))
      }
      const onUp = () => {
        document.body.classList.remove('col-resizing')
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }

      document.body.classList.add('col-resizing')
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [widths, defaults, setWidth]
  )

  return {
    widths,
    setWidth,
    reset,
    startResize,
    minWidth: MIN_WIDTH,
    maxWidth: MAX_WIDTH,
  }
}
