import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { Category } from '@/types/transaction'
import {
  getCategoryLabel,
  getCategorySelectGroups,
} from '@/lib/categoryHelpers'

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
  /**
   * Typeahead: filter categories as you type and pick from a matching list.
   * Used for the transaction table filter (and optional elsewhere).
   */
  searchable?: boolean
  placeholder?: string
}

interface Option {
  id: string
  label: string
  searchText: string
  /** Indent / secondary styling for children */
  isChild?: boolean
  parentLabel?: string
}

/**
 * Hierarchical category picker.
 * - Default: native <select> with optgroups
 * - searchable: combobox that filters options as you type
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
  searchable = false,
  placeholder = 'Filter by category…',
}: CategorySelectProps) {
  if (searchable) {
    return (
      <CategoryCombobox
        categories={categories}
        value={value}
        onChange={onChange}
        className={className}
        style={style}
        allowEmpty={allowEmpty}
        emptyLabel={emptyLabel}
        id={id}
        placeholder={placeholder}
      />
    )
  }

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

function CategoryCombobox({
  categories,
  value,
  onChange,
  className,
  style,
  allowEmpty,
  emptyLabel,
  id,
  placeholder,
}: {
  categories: Category[]
  value: string
  onChange: (categoryId: string) => void
  className?: string
  style?: React.CSSProperties
  allowEmpty: boolean
  emptyLabel: string
  id?: string
  placeholder: string
}) {
  const listId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)

  const catMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  )

  const allOptions = useMemo((): Option[] => {
    const groups = getCategorySelectGroups(categories)
    const opts: Option[] = []
    if (allowEmpty) {
      opts.push({
        id: '',
        label: emptyLabel,
        searchText: emptyLabel.toLowerCase(),
      })
    }
    for (const { parent, children } of groups) {
      opts.push({
        id: parent.id,
        label: children.length
          ? `${parent.icon} ${parent.name} (general)`
          : `${parent.icon} ${parent.name}`,
        searchText: `${parent.name} ${parent.icon}`.toLowerCase(),
      })
      for (const child of children) {
        const full = getCategoryLabel(catMap, child.id)
        opts.push({
          id: child.id,
          label: `${child.icon} ${child.name}`,
          searchText: `${full} ${child.name} ${parent.name}`.toLowerCase(),
          isChild: true,
          parentLabel: parent.name,
        })
      }
    }
    return opts
  }, [categories, catMap, allowEmpty, emptyLabel])

  const selectedLabel = useMemo(() => {
    if (!value) return allowEmpty ? emptyLabel : ''
    return getCategoryLabel(catMap, value, { includeIcon: true })
  }, [value, catMap, allowEmpty, emptyLabel])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allOptions
    return allOptions.filter((o) => o.searchText.includes(q))
  }, [allOptions, query])

  // Keep highlight in range when filter changes
  useEffect(() => {
    setHighlight((h) =>
      filtered.length === 0 ? 0 : Math.min(h, filtered.length - 1)
    )
  }, [filtered.length])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const pick = (id: string) => {
    onChange(id)
    setOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }

  const displayValue = open ? query : selectedLabel

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        setOpen(true)
        setQuery('')
        return
      }
      setHighlight((h) => Math.min(h + 1, Math.max(0, filtered.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open && filtered[highlight]) {
        pick(filtered[highlight].id)
      } else {
        setOpen(true)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div
      ref={rootRef}
      className="category-combobox"
      style={style}
    >
      <div className="category-combobox-input-wrap">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && filtered[highlight]
              ? `${listId}-opt-${filtered[highlight].id || 'all'}`
              : undefined
          }
          className={className?.includes('select') ? 'input' : className || 'input'}
          style={{ width: '100%', maxWidth: 'none' }}
          placeholder={placeholder}
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            setHighlight(0)
          }}
          onFocus={() => {
            setOpen(true)
            setQuery('')
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
        {value && allowEmpty && (
          <button
            type="button"
            className="category-combobox-clear"
            aria-label="Clear category filter"
            title="Clear"
            onClick={(e) => {
              e.preventDefault()
              pick('')
            }}
          >
            ×
          </button>
        )}
        <button
          type="button"
          className="category-combobox-chevron"
          tabIndex={-1}
          aria-label={open ? 'Close list' : 'Open list'}
          onClick={() => {
            if (open) {
              setOpen(false)
              setQuery('')
            } else {
              setOpen(true)
              setQuery('')
              inputRef.current?.focus()
            }
          }}
        >
          {open ? '▴' : '▾'}
        </button>
      </div>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="category-combobox-list"
        >
          {filtered.length === 0 ? (
            <li className="category-combobox-empty text-sm text-muted">
              No categories match “{query}”
            </li>
          ) : (
            filtered.map((opt, i) => {
              const active = i === highlight
              const selected = opt.id === value
              return (
                <li
                  key={opt.id || '__all__'}
                  id={`${listId}-opt-${opt.id || 'all'}`}
                  role="option"
                  aria-selected={selected}
                  className={[
                    'category-combobox-option',
                    active ? 'is-active' : '',
                    selected ? 'is-selected' : '',
                    opt.isChild ? 'is-child' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    // prevent input blur before click registers
                    e.preventDefault()
                    pick(opt.id)
                  }}
                >
                  {opt.isChild && opt.parentLabel ? (
                    <span className="category-combobox-option-meta">
                      {opt.parentLabel} ›
                    </span>
                  ) : null}
                  <span>{opt.label}</span>
                </li>
              )
            })
          )}
        </ul>
      )}
    </div>
  )
}
