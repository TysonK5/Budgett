import { useMemo, useRef, useState } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { useTransactions } from '@/hooks/useTransactions'
import { clearAllData } from '@/lib/storage/db'
import { ToastContainer } from '@/components/Toast'
import { useToast } from '@/hooks/useToast'
import { generateId } from '@/lib/utils'
import { exportToExcel } from '@/lib/export/excel'
import { getChildren, getParents } from '@/lib/categoryHelpers'
import { CategoryRowEditor } from '@/components/CategoryRowEditor'
import type { Category } from '@/types/transaction'
import { UNCATEGORIZED_ID } from '@/lib/constants'

export function Settings() {
  const { categories, add, update, remove, refresh } = useCategories()
  const { transactions, removeAll, refresh: refreshTx } = useTransactions()
  const { toasts, show, dismiss } = useToast()

  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6366f1')
  const [newIcon, setNewIcon] = useState('📌')
  const [newParentId, setNewParentId] = useState<string>('') // empty = top-level parent
  const [cloudEnabled, setCloudEnabled] = useState(
    () => localStorage.getItem('budgett-cloud') === 'true'
  )
  const addFormRef = useRef<HTMLFormElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  const parents = getParents(categories)

  const txCountByCategory = useMemo(() => {
    const map = new Map<string, number>()
    for (const t of transactions) {
      map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + 1)
    }
    return map
  }, [transactions])

  /** Total txs under a parent including all children */
  const subtreeTxCount = (parentId: string) => {
    const kids = getChildren(categories, parentId)
    let n = txCountByCategory.get(parentId) ?? 0
    for (const k of kids) n += txCountByCategory.get(k.id) ?? 0
    return n
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    const parentId = newParentId || null
    const name = newName.trim()
    await add(name, newColor, newIcon, parentId)
    setNewName('')
    show(
      parentId
        ? `Subcategory “${name}” added`
        : `Parent category “${name}” added`,
      'success'
    )
  }

  const startAddParent = () => {
    setNewParentId('')
    setNewColor('#6366f1')
    setNewIcon('📁')
    setNewName('')
    addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    setTimeout(() => nameInputRef.current?.focus(), 100)
  }

  const startAddChild = (parentId: string) => {
    const p = categories.find((c) => c.id === parentId)
    setNewParentId(parentId)
    if (p) {
      setNewColor(p.color)
      setNewIcon(p.icon)
    }
    setNewName('')
    addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    setTimeout(() => nameInputRef.current?.focus(), 100)
  }

  /**
   * Save category by stable id. Transactions store categoryId only, so
   * name/color/icon/parent changes apply everywhere immediately.
   */
  const handleSaveCategory = async (updated: Category) => {
    const prev = categories.find((c) => c.id === updated.id)
    await update(updated)

    if (prev && !prev.parentId && prev.color !== updated.color) {
      const children = getChildren(categories, updated.id)
      for (const child of children) {
        if (child.color === prev.color) {
          await update({ ...child, color: updated.color })
        }
      }
    }

    const n = txCountByCategory.get(updated.id) ?? 0
    show(
      n > 0
        ? `Updated “${updated.name}” · ${n} transaction${n === 1 ? '' : 's'} keep this id`
        : `Updated “${updated.name}”`,
      'success'
    )
  }

  const handleDeleteCategory = async (id: string) => {
    const cat = categories.find((c) => c.id === id)
    if (!cat) return
    if (id === UNCATEGORIZED_ID) {
      show('Cannot delete the Uncategorized fallback category', 'error')
      return
    }

    const isParent = !cat.parentId
    const kids = isParent ? getChildren(categories, id) : []
    const n = isParent ? subtreeTxCount(id) : (txCountByCategory.get(id) ?? 0)

    const lines = [
      `Delete ${isParent ? 'parent' : 'subcategory'} “${cat.name}”?`,
      isParent && kids.length > 0
        ? `This also deletes ${kids.length} subcategory(ies): ${kids.map((k) => k.name).join(', ')}.`
        : '',
      n > 0
        ? `${n} transaction(s) will be moved to Other › Uncategorized.`
        : 'No transactions use this category.',
      'Rules pointing here will also move to Uncategorized.',
    ]
      .filter(Boolean)
      .join('\n\n')

    if (!confirm(lines)) return

    try {
      const result = await remove(id)
      await refreshTx()
      const parts = [`Deleted “${cat.name}”`]
      if (result.deletedIds.length > 1) {
        parts.push(`${result.deletedIds.length - 1} subcategories`)
      }
      if (result.reassignedTransactions > 0) {
        parts.push(`${result.reassignedTransactions} txs → Uncategorized`)
      }
      if (result.reassignedRules > 0) {
        parts.push(`${result.reassignedRules} rules updated`)
      }
      show(parts.join(' · '), 'info')
    } catch (err) {
      show(err instanceof Error ? err.message : 'Delete failed', 'error')
    }
  }

  const handleWipe = async () => {
    if (
      !confirm(
        'This will permanently delete ALL local transactions, rules, budgets, and custom categories. Continue?'
      )
    ) {
      return
    }
    await clearAllData()
    await removeAll()
    await refresh()
    await refreshTx()
    show('All local data cleared', 'warning')
  }

  const handleExportAll = () => {
    if (transactions.length === 0) {
      show('No transactions to export', 'warning')
      return
    }
    exportToExcel(transactions, categories)
    show('Exported all transactions', 'success')
  }

  const toggleCloud = () => {
    const next = !cloudEnabled
    setCloudEnabled(next)
    localStorage.setItem('budgett-cloud', String(next))
    show(
      next
        ? 'Cloud sync preference enabled (server required — see README)'
        : 'Cloud sync disabled — fully local mode',
      'info'
    )
  }

  const selectedParent = newParentId
    ? categories.find((c) => c.id === newParentId)
    : null

  return (
    <div className="page-settings">
      <div className="page-header">
        <h1>Settings</h1>
        <p className="text-muted">Categories, data management, and optional cloud sync</p>
      </div>

      <div className="settings-grid">
        <section className="card category-settings">
          <div className="flex justify-between items-center" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <h3>Categories</h3>
              <p className="text-sm text-muted">
                Add, edit, or delete parents and subcategories. Edits keep the same id so existing
                transactions update automatically. Deletes move transactions to{' '}
                <strong>Uncategorized</strong>.
              </p>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={startAddParent}>
              + Parent category
            </button>
          </div>

          <ul className="category-tree">
            {parents.map((parent) => {
              const children = getChildren(categories, parent.id)
              return (
                <li key={parent.id} className="category-tree-parent">
                  <CategoryRowEditor
                    category={parent}
                    categories={categories}
                    txCount={txCountByCategory.get(parent.id) ?? 0}
                    childCount={children.length}
                    onSave={handleSaveCategory}
                    onDelete={handleDeleteCategory}
                    onAddChild={startAddChild}
                  />
                  {children.length > 0 && (
                    <ul className="category-tree-children">
                      {children.map((child) => (
                        <li key={child.id}>
                          <CategoryRowEditor
                            category={child}
                            categories={categories}
                            isChild
                            txCount={txCountByCategory.get(child.id) ?? 0}
                            onSave={handleSaveCategory}
                            onDelete={handleDeleteCategory}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                  {children.length === 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm category-add-child-empty"
                      onClick={() => startAddChild(parent.id)}
                    >
                      + Add subcategory under {parent.name}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>

          <form
            ref={addFormRef}
            className="add-category-form card"
            style={{ marginTop: 16, background: 'var(--color-surface-hover)' }}
            onSubmit={(e) => void handleAddCategory(e)}
          >
            <h4 style={{ marginBottom: 4, fontSize: '0.95rem' }}>
              {newParentId ? 'Add subcategory' : 'Add parent category'}
            </h4>
            <p className="text-xs text-muted" style={{ marginBottom: 10 }}>
              {newParentId && selectedParent
                ? `Creating a child under ${selectedParent.icon} ${selectedParent.name}`
                : 'Leave “Parent” empty for a new top-level category'}
            </p>
            <div className="flex gap-sm" style={{ flexWrap: 'wrap', marginBottom: 8 }}>
              <select
                className="select"
                value={newParentId}
                onChange={(e) => {
                  setNewParentId(e.target.value)
                  if (e.target.value) {
                    const p = categories.find((c) => c.id === e.target.value)
                    if (p) {
                      setNewColor(p.color)
                      setNewIcon(p.icon)
                    }
                  }
                }}
                style={{ maxWidth: 260 }}
                aria-label="Parent category"
              >
                <option value="">Top-level parent (no parent)</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    Child of {p.icon} {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
              <input
                ref={nameInputRef}
                className="input"
                placeholder={newParentId ? 'e.g. Mortgage, Truck payment' : 'e.g. Side hustle'}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                style={{ maxWidth: 220 }}
                required
              />
              <input
                className="input"
                type="color"
                value={newColor}
                onChange={(e) => setNewColor(e.target.value)}
                style={{ width: 48, padding: 4 }}
                title="Color"
              />
              <input
                className="input"
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                style={{ maxWidth: 64 }}
                maxLength={4}
                title="Icon emoji"
              />
              <button className="btn btn-primary btn-sm" type="submit">
                {newParentId ? 'Add subcategory' : 'Add parent'}
              </button>
              {newParentId && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setNewParentId('')
                    setNewName('')
                  }}
                >
                  Clear parent
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="card">
          <h3>Data & privacy</h3>
          <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
            All data is stored in your browser via IndexedDB. Nothing is sent to a server unless
            you enable cloud sync.
          </p>
          <div className="flex flex-col gap-sm">
            <button className="btn btn-secondary" onClick={handleExportAll}>
              📗 Export all to Excel
            </button>
            <button className="btn btn-danger" onClick={() => void handleWipe()}>
              🗑️ Wipe all local data
            </button>
          </div>
          <p className="text-xs text-muted" style={{ marginTop: 12 }}>
            {transactions.length} transactions stored · Instance {generateId().slice(-6)}
          </p>
        </section>

        <section className="card">
          <h3>Optional cloud sync</h3>
          <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
            Cloud backup is opt-in. When enabled and a server is running, data can be encrypted
            with the Web Crypto API before upload. Local mode works fully without this.
          </p>
          <label className="toggle-row flex items-center gap-md">
            <input type="checkbox" checked={cloudEnabled} onChange={toggleCloud} />
            <span>Enable cloud sync preference</span>
          </label>
          {cloudEnabled && (
            <div className="cloud-note text-sm" style={{ marginTop: 12 }}>
              <p className="text-muted">
                Start the optional backend with <code>npm run server</code> (port 4000). Auth
                endpoints: <code>/api/auth/register</code>, <code>/api/auth/login</code>. Sync:{' '}
                <code>/api/sync</code>.
              </p>
            </div>
          )}
        </section>

        <section className="card">
          <h3>About</h3>
          <p className="text-sm text-muted">
            <strong>Budgett</strong> v1.0 — local-first bank transaction categorizer.
          </p>
          <p className="text-sm text-muted" style={{ marginTop: 8 }}>
            Stack: React, TypeScript, Vite, IndexedDB, Recharts.
          </p>
        </section>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
