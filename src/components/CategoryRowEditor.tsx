import { useEffect, useState } from 'react'
import type { Category } from '@/types/transaction'
import { getParents } from '@/lib/categoryHelpers'
import { UNCATEGORIZED_ID } from '@/lib/constants'

interface CategoryRowEditorProps {
  category: Category
  categories: Category[]
  /** Indent for children */
  isChild?: boolean
  txCount?: number
  /** Children count (for parent delete warning) */
  childCount?: number
  onSave: (updated: Category) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  /** Quick-add a child under this parent */
  onAddChild?: (parentId: string) => void
}

/**
 * Inline-editable category row. Identity is `category.id` — renames/colors
 * apply to all transactions already tagged with this id (no tx rewrite needed).
 */
export function CategoryRowEditor({
  category,
  categories,
  isChild = false,
  txCount = 0,
  childCount = 0,
  onSave,
  onDelete,
  onAddChild,
}: CategoryRowEditorProps) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(category.name)
  const [color, setColor] = useState(category.color)
  const [icon, setIcon] = useState(category.icon)
  const [parentId, setParentId] = useState<string>(category.parentId ?? '')
  const [saving, setSaving] = useState(false)

  const isProtected = category.id === UNCATEGORIZED_ID

  useEffect(() => {
    if (!editing) {
      setName(category.name)
      setColor(category.color)
      setIcon(category.icon)
      setParentId(category.parentId ?? '')
    }
  }, [category, editing])

  const parents = getParents(categories).filter((p) => p.id !== category.id)

  const startEdit = () => {
    setName(category.name)
    setColor(category.color)
    setIcon(category.icon)
    setParentId(category.parentId ?? '')
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setName(category.name)
    setColor(category.color)
    setIcon(category.icon)
    setParentId(category.parentId ?? '')
  }

  const save = async () => {
    const trimmed = name.trim()
    if (!trimmed) return

    let nextParentId: string | null
    if (!category.parentId && !isChild) {
      nextParentId = null
    } else {
      nextParentId = parentId || null
    }
    if (nextParentId === category.id) nextParentId = category.parentId

    const updated: Category = {
      ...category,
      name: trimmed,
      color,
      icon: icon.trim() || category.icon,
      parentId: nextParentId,
    }

    setSaving(true)
    try {
      await onSave(updated)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className={`category-row category-row-editing ${isChild ? 'is-child' : ''}`}>
        <div className="category-row-edit-fields">
          <input
            className="input"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            title="Color"
            style={{ width: 40, padding: 2, height: 36 }}
          />
          <input
            className="input"
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            maxLength={4}
            title="Icon"
            style={{ width: 52 }}
            aria-label="Icon"
          />
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ flex: 1, minWidth: 120 }}
            aria-label="Name"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void save()
              }
              if (e.key === 'Escape') cancel()
            }}
          />
          {(isChild || category.parentId) && (
            <select
              className="select"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              style={{ maxWidth: 180 }}
              title="Parent category"
            >
              <option value="">— Top-level —</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="category-row-edit-actions">
          <span className="text-xs text-muted category-id-hint" title="Stable id used by transactions">
            id: {category.id}
            {txCount > 0 && ` · ${txCount} tx`}
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={saving || !name.trim()}
            onClick={() => void save()}
          >
            Save
          </button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={saving} onClick={cancel}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={`category-row ${isChild ? 'is-child' : ''}`}>
      <div className="category-row-display">
        {isChild && <span className="text-muted category-indent">↳</span>}
        <span className="color-dot" style={{ background: category.color }} />
        <span className="category-row-icon">{category.icon}</span>
        {isChild ? <span>{category.name}</span> : <strong>{category.name}</strong>}
        {category.isSystem && <span className="badge badge-info">system</span>}
        {isProtected && (
          <span className="badge badge-warning" title="Required fallback for uncategorized transactions">
            protected
          </span>
        )}
        {txCount > 0 && (
          <span className="badge badge-info" title="Transactions using this category id">
            {txCount} tx
          </span>
        )}
        {!isChild && childCount > 0 && (
          <span className="text-xs text-muted">{childCount} sub</span>
        )}
      </div>
      <div className="category-row-actions">
        {!isChild && onAddChild && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            title="Add subcategory under this parent"
            onClick={() => onAddChild(category.id)}
          >
            + Child
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-sm" onClick={startEdit} title="Edit category">
          Edit
        </button>
        {onDelete && !isProtected && (
          <button
            type="button"
            className="btn btn-danger btn-sm"
            title={
              !isChild && childCount > 0
                ? `Delete parent and ${childCount} subcategories`
                : 'Delete category'
            }
            onClick={() => void onDelete(category.id)}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
