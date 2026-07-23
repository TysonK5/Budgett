import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  Category,
  Rule,
  RuleCondition,
  RuleConditionField,
  RuleJoin,
  RuleLayer,
  Transaction,
} from '@/types/transaction'
import { getCategoryLabel } from '@/lib/categoryHelpers'
import { CategorySelect } from '@/components/CategorySelect'
import { SortableTh } from '@/components/SortableTh'
import {
  findMatchingTransactionsByRule,
  formatCategoryBreakdown,
  groupMatchesBySimilarity,
} from '@/lib/ruleMatchPreview'
import { formatCurrency, generateId } from '@/lib/utils'
import {
  defaultOpForField,
  describeRule,
  emptyCondition,
  emptyLayer,
  normalizeRule,
  opsForField,
  primaryKeyword,
} from '@/lib/rules/evaluate'
import { sortItems, useTableSort } from '@/hooks/useTableSort'

type RulesTableSort = 'rule' | 'category' | 'priority' | 'active'

/** How to apply a rule after saving */
export type RuleApplyMode = 'future' | 'all'

export interface RuleSaveInput {
  categoryId: string
  layerJoin: RuleJoin
  layers: RuleLayer[]
  name?: string
}

/** Prefill from Reports (or other pages) when creating/updating a rule */
export interface RuleEditorPrefill {
  /** Description / summary keyword for the first condition */
  description: string
  /** Optional category to select as THEN */
  categoryId?: string
}

interface RuleEditorProps {
  rules: Rule[]
  categories: Category[]
  transactions?: Transaction[]
  onAddLayered: (input: RuleSaveInput, applyMode: RuleApplyMode) => Promise<void>
  onToggle: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onUpdate?: (rule: Rule, applyMode: RuleApplyMode) => Promise<void>
  onApply?: () => Promise<void>
  /** When set, prefill the form (and open matching rule for edit if found) */
  prefill?: RuleEditorPrefill | null
  /** Wait until rules are loaded before matching existing rules */
  rulesLoading?: boolean
  /** Called after prefill has been applied so the parent can clear location state */
  onPrefillApplied?: () => void
}

function findMatchingRule(rules: Rule[], description: string): Rule | undefined {
  const needle = description.trim().toUpperCase()
  if (!needle) return undefined

  // Exact keyword / condition match first
  for (const rule of rules) {
    const kw = primaryKeyword(rule).toUpperCase()
    if (kw && kw === needle) return rule
    const n = normalizeRule(rule)
    for (const layer of n.layers) {
      for (const c of layer.conditions) {
        if (
          c.field === 'description' &&
          c.value.trim().toUpperCase() === needle
        ) {
          return rule
        }
      }
    }
  }

  // Soft: existing rule keyword is contained in the summary (or vice versa)
  for (const rule of rules) {
    const kw = primaryKeyword(rule).toUpperCase()
    if (kw.length >= 3 && (needle.includes(kw) || kw.includes(needle))) {
      return rule
    }
  }

  return undefined
}

function draftRule(
  layers: RuleLayer[],
  layerJoin: RuleJoin,
  categoryId: string
): Rule {
  return normalizeRule({
    id: 'draft',
    keyword: '',
    categoryId,
    isActive: true,
    priority: 0,
    layerJoin,
    layers,
  })
}

export function RuleEditor({
  rules,
  categories,
  transactions = [],
  onAddLayered,
  onToggle,
  onDelete,
  onUpdate,
  onApply,
  prefill = null,
  rulesLoading = false,
  onPrefillApplied,
}: RuleEditorProps) {
  const defaultCategoryId =
    categories.find((c) => c.parentId === null && c.id !== 'income')?.id ??
    categories[0]?.id ??
    'other-uncategorized'

  const [layerJoin, setLayerJoin] = useState<RuleJoin>('AND')
  const [layers, setLayers] = useState<RuleLayer[]>(() => [emptyLayer('AND')])
  const [categoryId, setCategoryId] = useState(defaultCategoryId)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const lastPrefillRef = useRef<string | null>(null)
  const rulesSort = useTableSort<RulesTableSort>(
    'rules-list',
    { field: 'priority', direction: 'asc' },
    ['rule', 'category', 'priority', 'active'] as const
  )

  const draft = useMemo(
    () => draftRule(layers, layerJoin, categoryId),
    [layers, layerJoin, categoryId]
  )

  // Apply prefill from Reports when navigating with a summary keyword
  useEffect(() => {
    if (!prefill?.description?.trim()) {
      // Allow the same summary to prefill again on a later visit
      if (!prefill) lastPrefillRef.current = null
      return
    }
    if (rulesLoading) return

    const desc = prefill.description.trim()
    const token = `${desc}::${prefill.categoryId ?? ''}`
    if (lastPrefillRef.current === token) return
    lastPrefillRef.current = token

    const existing = findMatchingRule(rules, desc)
    if (existing) {
      const n = normalizeRule(existing)
      setLayers(
        n.layers.map((l) => ({
          ...l,
          id: l.id || generateId(),
          conditions: l.conditions.map((c) => ({
            ...c,
            id: c.id || generateId(),
          })),
        }))
      )
      setLayerJoin(n.layerJoin)
      setCategoryId(prefill.categoryId || n.categoryId)
      setEditingId(n.id)
    } else {
      setLayers([
        {
          id: generateId(),
          join: 'AND',
          conditions: [emptyCondition('description', 'contains', desc)],
        },
      ])
      setLayerJoin('AND')
      setCategoryId(prefill.categoryId || defaultCategoryId)
      setEditingId(null)
    }

    // Scroll form into view after paint
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      const input = formRef.current?.querySelector<HTMLInputElement>(
        'input.input[placeholder="keyword…"]'
      )
      input?.focus()
      input?.select()
    })

    onPrefillApplied?.()
  }, [prefill, rules, rulesLoading, defaultCategoryId, onPrefillApplied])

  const matchPreview = useMemo(() => {
    const hasContent = layers.some((l) =>
      l.conditions.some((c) => c.field === 'type' || c.value.trim().length > 0)
    )
    if (!hasContent) {
      return { matches: [] as Transaction[], groups: [], total: 0 }
    }
    const matches = findMatchingTransactionsByRule(transactions, draft)
    const groups = groupMatchesBySimilarity(matches, categories)
    return { matches, groups, total: matches.length }
  }, [layers, draft, transactions, categories])

  const updateLayer = (layerId: string, patch: Partial<RuleLayer>) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, ...patch } : l))
    )
  }

  const updateCondition = (
    layerId: string,
    condId: string,
    patch: Partial<RuleCondition>
  ) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== layerId) return l
        return {
          ...l,
          conditions: l.conditions.map((c) =>
            c.id === condId ? { ...c, ...patch } : c
          ),
        }
      })
    )
  }

  const addCondition = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) =>
        l.id === layerId
          ? { ...l, conditions: [...l.conditions, emptyCondition()] }
          : l
      )
    )
  }

  const removeCondition = (layerId: string, condId: string) => {
    setLayers((prev) =>
      prev.map((l) => {
        if (l.id !== layerId) return l
        const next = l.conditions.filter((c) => c.id !== condId)
        return {
          ...l,
          conditions: next.length > 0 ? next : [emptyCondition()],
        }
      })
    )
  }

  const addLayer = () => {
    setLayers((prev) => [...prev, emptyLayer('AND')])
  }

  const removeLayer = (layerId: string) => {
    setLayers((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((l) => l.id !== layerId)
    })
  }

  const resetForm = () => {
    setLayers([emptyLayer('AND')])
    setLayerJoin('AND')
    setEditingId(null)
  }

  const loadRuleForEdit = (rule: Rule) => {
    const n = normalizeRule(rule)
    setLayers(n.layers.map((l) => ({
      ...l,
      id: l.id || generateId(),
      conditions: l.conditions.map((c) => ({ ...c, id: c.id || generateId() })),
    })))
    setLayerJoin(n.layerJoin)
    setCategoryId(n.categoryId)
    setEditingId(n.id)
  }

  const canSave = Boolean(
    categoryId &&
      layers.some((l) =>
        l.conditions.some((c) => c.field === 'type' || c.value.trim().length > 0)
      )
  )

  const handleSave = async (applyMode: RuleApplyMode) => {
    if (!canSave) return

    setSaving(true)
    try {
      if (editingId && onUpdate) {
        const existing = rules.find((r) => r.id === editingId)
        await onUpdate(
          normalizeRule({
            id: editingId,
            keyword: primaryKeyword(draft),
            categoryId,
            isActive: existing?.isActive ?? true,
            priority: existing?.priority ?? rules.length,
            layerJoin,
            layers,
          }),
          applyMode
        )
      } else {
        await onAddLayered({ categoryId, layerJoin, layers }, applyMode)
      }
      resetForm()
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    // Default form submit = future only (Enter key)
    e.preventDefault()
    void handleSave('future')
  }

  const catMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  )

  const sortedRules = useMemo(
    () =>
      sortItems(rules, rulesSort.field, rulesSort.direction, (rule, field) => {
        if (field === 'rule') return primaryKeyword(rule) || describeRule(rule)
        if (field === 'category') return getCategoryLabel(catMap, rule.categoryId)
        if (field === 'priority') return rule.priority
        return rule.isActive ? 0 : 1
      }),
    [rules, rulesSort.field, rulesSort.direction, catMap]
  )

  return (
    <div className="rule-editor">
      <form
        ref={formRef}
        className="card rule-form"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <h3>{editingId ? 'Edit rule' : 'Add custom rule'}</h3>
        <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
          Build an <strong>IF</strong> rule with layers. Conditions inside a layer use{' '}
          <strong>AND</strong> (all) or <strong>OR</strong> (any). Multiple layers combine with
          AND/OR between them.
        </p>

        <div className="rule-builder">
          {layers.map((layer, layerIndex) => (
            <div key={layer.id} className="rule-layer">
              {layerIndex > 0 && (
                <div className="rule-layer-join">
                  <span className="text-xs text-muted">combine with previous layer</span>
                  <div className="trend-mode-toggle" role="group" aria-label="Layer join">
                    <button
                      type="button"
                      className={`trend-mode-btn ${layerJoin === 'AND' ? 'active' : ''}`}
                      onClick={() => setLayerJoin('AND')}
                    >
                      AND
                    </button>
                    <button
                      type="button"
                      className={`trend-mode-btn ${layerJoin === 'OR' ? 'active' : ''}`}
                      onClick={() => setLayerJoin('OR')}
                    >
                      OR
                    </button>
                  </div>
                </div>
              )}

              <div className="rule-layer-card">
                <div className="rule-layer-header flex justify-between items-center">
                  <div className="flex items-center gap-sm">
                    <span className="badge badge-info">
                      {layerIndex === 0 ? 'IF' : layerJoin}
                    </span>
                    <span className="text-sm font-medium">
                      Layer {layerIndex + 1}
                    </span>
                    <div className="trend-mode-toggle" role="group" aria-label="Conditions join">
                      <button
                        type="button"
                        className={`trend-mode-btn ${layer.join === 'AND' ? 'active' : ''}`}
                        onClick={() => updateLayer(layer.id, { join: 'AND' })}
                        title="All conditions must match"
                      >
                        ALL (AND)
                      </button>
                      <button
                        type="button"
                        className={`trend-mode-btn ${layer.join === 'OR' ? 'active' : ''}`}
                        onClick={() => updateLayer(layer.id, { join: 'OR' })}
                        title="Any condition may match"
                      >
                        ANY (OR)
                      </button>
                    </div>
                  </div>
                  {layers.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => removeLayer(layer.id)}
                    >
                      Remove layer
                    </button>
                  )}
                </div>

                <div className="rule-conditions">
                  {layer.conditions.map((cond, condIndex) => (
                    <div key={cond.id} className="rule-condition-row">
                      {condIndex > 0 && (
                        <span className="rule-cond-join text-xs font-semibold">
                          {layer.join}
                        </span>
                      )}
                      <select
                        className="select"
                        value={cond.field}
                        onChange={(e) => {
                          const field = e.target.value as RuleConditionField
                          updateCondition(layer.id, cond.id, {
                            field,
                            op: defaultOpForField(field),
                            value: field === 'type' ? 'debit' : '',
                          })
                        }}
                        style={{ maxWidth: 130 }}
                      >
                        <option value="description">Description</option>
                        <option value="amount">Amount</option>
                        <option value="type">Type</option>
                        <option value="date">Date</option>
                      </select>
                      <select
                        className="select"
                        value={cond.op}
                        onChange={(e) =>
                          updateCondition(layer.id, cond.id, {
                            op: e.target.value as RuleCondition['op'],
                          })
                        }
                        style={{ maxWidth: 150 }}
                      >
                        {opsForField(cond.field).map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {cond.field === 'type' ? (
                        <select
                          className="select"
                          value={cond.value || 'debit'}
                          onChange={(e) =>
                            updateCondition(layer.id, cond.id, { value: e.target.value })
                          }
                          style={{ maxWidth: 120 }}
                        >
                          <option value="debit">debit</option>
                          <option value="credit">credit</option>
                        </select>
                      ) : cond.field === 'date' ? (
                        <input
                          className="input"
                          type="date"
                          value={cond.value}
                          onChange={(e) =>
                            updateCondition(layer.id, cond.id, { value: e.target.value })
                          }
                          style={{ maxWidth: 160 }}
                        />
                      ) : cond.field === 'amount' ? (
                        <input
                          className="input"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={cond.value}
                          onChange={(e) =>
                            updateCondition(layer.id, cond.id, { value: e.target.value })
                          }
                          style={{ maxWidth: 120 }}
                        />
                      ) : (
                        <input
                          className="input"
                          placeholder="keyword…"
                          value={cond.value}
                          onChange={(e) =>
                            updateCondition(layer.id, cond.id, { value: e.target.value })
                          }
                          style={{ flex: 1, minWidth: 140 }}
                        />
                      )}
                      <button
                        type="button"
                        className="btn-icon"
                        title="Remove condition"
                        onClick={() => removeCondition(layer.id, cond.id)}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: 8 }}
                  onClick={() => addCondition(layer.id)}
                >
                  + Condition
                </button>
              </div>
            </div>
          ))}

          <button type="button" className="btn btn-secondary btn-sm" onClick={addLayer}>
            + Add layer (AND / OR)
          </button>
        </div>

        <div
          className="flex gap-md items-center"
          style={{ flexWrap: 'wrap', marginTop: 16 }}
        >
          <span className="font-medium text-sm">THEN category</span>
          <CategorySelect
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
            style={{ maxWidth: 260 }}
          />
        </div>

        <div className="rule-save-actions">
          <div className="rule-save-buttons flex gap-sm" style={{ flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary"
              type="submit"
              disabled={saving || !canSave}
              title="Save rule; only new imports / re-categorizations use it"
            >
              {editingId ? 'Save' : 'Save'} — future only
            </button>
            <button
              className="btn btn-primary"
              type="button"
              disabled={saving || !canSave}
              title="Save rule and re-categorize every existing transaction"
              onClick={() => void handleSave('all')}
            >
              {editingId ? 'Save' : 'Save'} — apply to all
              {matchPreview.total > 0 && (
                <span className="rule-match-badge">· {matchPreview.total} match</span>
              )}
            </button>
            {editingId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm} disabled={saving}>
                Cancel edit
              </button>
            )}
          </div>
          <p className="text-xs text-muted" style={{ marginTop: 8 }}>
            <strong>Future only</strong> — stores the rule for new imports (existing txs unchanged).{' '}
            <strong>Apply to all</strong> — also re-runs every rule against all transactions now
            {matchPreview.total > 0
              ? ` (${matchPreview.total} currently match this draft).`
              : '.'}
          </p>
        </div>

        <p className="text-xs text-muted" style={{ marginTop: 10 }}>
          Preview: <code>{describeRule(draft)}</code>
        </p>

        {matchPreview.total > 0 && (
          <div className="rule-match-preview fade-in">
            <div className="rule-match-header flex justify-between items-center">
              <span className="font-medium text-sm">
                {matchPreview.total} matching transaction
                {matchPreview.total === 1 ? '' : 's'}
                <span className="text-muted">
                  {' '}
                  · {matchPreview.groups.length} similar group
                  {matchPreview.groups.length === 1 ? '' : 's'}
                </span>
              </span>
            </div>
            <ul className="rule-match-groups">
              {matchPreview.groups.map((group) => {
                const breakdown = formatCategoryBreakdown(group, categories)
                return (
                  <li key={group.groupKey}>
                    <div className="rule-match-group" style={{ cursor: 'default' }}>
                      <div className="rule-match-group-main">
                        <span className="rule-match-label" title={group.sample}>
                          {group.label || group.sample}
                        </span>
                        <span className="rule-match-count">×{group.count}</span>
                      </div>
                      <div className="rule-match-meta text-xs text-muted">
                        <span>{formatCurrency(group.totalAmount)} total</span>
                        {breakdown && (
                          <>
                            <span className="rule-match-dot">·</span>
                            <span>now: {breakdown}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </form>

      {onApply && rules.length > 0 && (
        <div style={{ margin: '16px 0' }}>
          <button className="btn btn-secondary" onClick={() => void onApply()}>
            Re-apply all rules to transactions
          </button>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Your rules ({rules.length})</h3>
        {rules.length === 0 ? (
          <p className="text-muted text-sm">
            No custom rules yet. Example: IF description contains “MORTGAGE” THEN Housing ›
            Mortgage / Rent. Or combine: IF description contains “AMAZON” AND amount &gt; 100.
          </p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <SortableTh
                  field="rule"
                  activeField={rulesSort.field}
                  direction={rulesSort.direction}
                  onToggle={(f) => rulesSort.toggleSort(f, 'asc')}
                >
                  Rule
                </SortableTh>
                <SortableTh
                  field="category"
                  activeField={rulesSort.field}
                  direction={rulesSort.direction}
                  onToggle={(f) => rulesSort.toggleSort(f, 'asc')}
                >
                  Category
                </SortableTh>
                <SortableTh
                  field="priority"
                  activeField={rulesSort.field}
                  direction={rulesSort.direction}
                  onToggle={(f) => rulesSort.toggleSort(f, 'asc')}
                >
                  Priority
                </SortableTh>
                <SortableTh
                  field="active"
                  activeField={rulesSort.field}
                  direction={rulesSort.direction}
                  onToggle={(f) => rulesSort.toggleSort(f, 'asc')}
                >
                  Active
                </SortableTh>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedRules.map((rule) => {
                const cat = catMap.get(rule.categoryId)
                const label = getCategoryLabel(catMap, rule.categoryId)
                const summary = describeRule(rule)
                const matchCount = findMatchingTransactionsByRule(transactions, rule).length
                return (
                  <tr key={rule.id} className={!rule.isActive ? 'row-disabled' : ''}>
                    <td>
                      <div className="text-sm font-medium" style={{ marginBottom: 2 }}>
                        {primaryKeyword(rule) || 'Complex rule'}
                      </div>
                      <div className="text-xs text-muted" style={{ maxWidth: 360 }}>
                        {summary}
                      </div>
                      {matchCount > 0 && (
                        <span className="badge badge-info" style={{ marginTop: 4 }}>
                          {matchCount} match{matchCount === 1 ? '' : 'es'}
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className="category-pill"
                        style={{
                          background: `${cat?.color ?? '#94a3b8'}22`,
                          color: cat?.color,
                        }}
                      >
                        {cat?.icon} {label}
                      </span>
                    </td>
                    <td>{rule.priority}</td>
                    <td>
                      <button
                        className={`btn btn-sm ${rule.isActive ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => void onToggle(rule.id)}
                      >
                        {rule.isActive ? 'On' : 'Off'}
                      </button>
                    </td>
                    <td>
                      <div className="flex gap-sm">
                        <button
                          className="btn btn-secondary btn-sm"
                          title="Edit rule"
                          onClick={() => loadRuleForEdit(rule)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-icon"
                          title="Delete rule"
                          onClick={() => void onDelete(rule.id)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
