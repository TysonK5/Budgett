import type { SortDirection } from '@/hooks/useTableSort'

interface SortableThProps<F extends string> {
  field: F
  activeField: F
  direction: SortDirection
  onToggle: (field: F) => void
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  title?: string
}

/**
 * Clickable table header that cycles sort direction and shows ↑ / ↓ / ↕.
 */
export function SortableTh<F extends string>({
  field,
  activeField,
  direction,
  onToggle,
  children,
  className = '',
  style,
  title,
}: SortableThProps<F>) {
  const active = activeField === field
  const icon = !active ? '↕' : direction === 'asc' ? '↑' : '↓'
  const ariaSort = !active
    ? 'none'
    : direction === 'asc'
      ? 'ascending'
      : 'descending'

  return (
    <th
      className={`sortable ${className}`.trim()}
      style={style}
      title={title ?? 'Click to sort'}
      onClick={() => onToggle(field)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle(field)
        }
      }}
      tabIndex={0}
      role="columnheader"
      aria-sort={ariaSort}
    >
      {children} <span className="sort-icon" aria-hidden>{icon}</span>
    </th>
  )
}
