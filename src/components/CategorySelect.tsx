import type { Category } from '@/types/transaction'
import { getCategorySelectGroups } from '@/lib/categoryHelpers'

interface CategorySelectProps {
  categories: Category[]
  value: string
  onChange: (categoryId: string) => void
  className?: string
  style?: React.CSSProperties
  /** Include empty "all" option */
  allowEmpty?: boolean
  emptyLabel?: string
  id?: string
}

/**
 * Hierarchical category picker: parents as optgroups, children nested under them.
 * Parent itself is also selectable (e.g. "Loans" for uncategorized loan payments).
 */
export function CategorySelect({
  categories,
  value,
  onChange,
  className = 'select',
  style,
  allowEmpty = false,
  emptyLabel = 'All categories',
  id,
}: CategorySelectProps) {
  const groups = getCategorySelectGroups(categories)

  return (
    <select
      id={id}
      className={className}
      style={style}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {allowEmpty && <option value="">{emptyLabel}</option>}
      {groups.map(({ parent, children }) =>
        children.length === 0 ? (
          <option key={parent.id} value={parent.id}>
            {parent.icon} {parent.name}
          </option>
        ) : (
          <optgroup key={parent.id} label={`${parent.icon} ${parent.name}`}>
            <option value={parent.id}>
              {parent.name} (general)
            </option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.icon} {child.name}
              </option>
            ))}
          </optgroup>
        )
      )}
    </select>
  )
}
