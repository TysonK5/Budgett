import type {
  Rule,
  RuleCondition,
  RuleConditionField,
  RuleConditionOp,
  RuleJoin,
  RuleLayer,
  Transaction,
} from '@/types/transaction'
import { generateId } from '@/lib/utils'

export function emptyCondition(
  field: RuleConditionField = 'description',
  op: RuleConditionOp = 'contains',
  value = ''
): RuleCondition {
  return { id: generateId(), field, op, value }
}

export function emptyLayer(join: RuleJoin = 'AND'): RuleLayer {
  return {
    id: generateId(),
    join,
    conditions: [emptyCondition()],
  }
}

/** Normalize legacy keyword-only rules into layered form */
export function normalizeRule(rule: Rule): Rule & {
  layerJoin: RuleJoin
  layers: RuleLayer[]
} {
  const layerJoin: RuleJoin = rule.layerJoin ?? 'AND'
  let layers = rule.layers

  if (!layers || layers.length === 0) {
    const kw = (rule.keyword ?? '').trim()
    layers = [
      {
        id: generateId(),
        join: 'AND',
        conditions: kw
          ? [emptyCondition('description', 'contains', kw)]
          : [emptyCondition()],
      },
    ]
  }

  // Ensure each layer has at least empty structure
  layers = layers.map((layer) => ({
    ...layer,
    id: layer.id || generateId(),
    join: layer.join === 'OR' ? 'OR' : 'AND',
    conditions:
      layer.conditions?.length > 0
        ? layer.conditions.map((c) => ({
            ...c,
            id: c.id || generateId(),
            value: c.value ?? '',
          }))
        : [emptyCondition()],
  }))

  return { ...rule, layerJoin, layers }
}

/** Human-readable summary of a rule */
export function describeRule(rule: Rule): string {
  const n = normalizeRule(rule)
  const layerParts = n.layers.map((layer, i) => {
    const conds = layer.conditions
      .filter((c) => c.value.trim() !== '' || c.field === 'type')
      .map(describeCondition)
    if (conds.length === 0) return i === 0 ? 'IF (empty)' : '(empty)'
    const inner = conds.join(` ${layer.join} `)
    const prefix = i === 0 ? 'IF ' : `${n.layerJoin} `
    return `${prefix}(${inner})`
  })
  return layerParts.join(' ')
}

export function describeCondition(c: RuleCondition): string {
  const f = c.field
  const opLabel: Record<string, string> = {
    contains: 'contains',
    not_contains: 'does not contain',
    equals: 'equals',
    starts_with: 'starts with',
    ends_with: 'ends with',
    eq: '=',
    gt: '>',
    gte: '≥',
    lt: '<',
    lte: '≤',
    is: 'is',
    before: 'before',
    after: 'after',
  }
  return `${f} ${opLabel[c.op] ?? c.op} “${c.value}”`
}

function evalCondition(c: RuleCondition, tx: Transaction): boolean {
  const value = c.value.trim()
  // Type "is" can have empty only if invalid
  if (c.field !== 'type' && value === '') return false

  switch (c.field) {
    case 'description': {
      const desc = tx.description.toUpperCase()
      const v = value.toUpperCase()
      switch (c.op) {
        case 'contains':
          return desc.includes(v)
        case 'not_contains':
          return !desc.includes(v)
        case 'equals':
          return desc === v
        case 'starts_with':
          return desc.startsWith(v)
        case 'ends_with':
          return desc.endsWith(v)
        default:
          return desc.includes(v)
      }
    }
    case 'amount': {
      const n = parseFloat(value.replace(/[$,]/g, ''))
      if (isNaN(n)) return false
      const amt = tx.amount
      switch (c.op) {
        case 'eq':
          return Math.abs(amt - n) < 0.001
        case 'gt':
          return amt > n
        case 'gte':
          return amt >= n
        case 'lt':
          return amt < n
        case 'lte':
          return amt <= n
        default:
          return Math.abs(amt - n) < 0.001
      }
    }
    case 'type': {
      const t = value.toLowerCase() as 'debit' | 'credit'
      return tx.type === t
    }
    case 'date': {
      const d = tx.date.slice(0, 10)
      const v = value.slice(0, 10)
      switch (c.op) {
        case 'eq':
        case 'equals':
          return d === v
        case 'before':
          return d < v
        case 'after':
          return d > v
        default:
          return d === v
      }
    }
    default:
      return false
  }
}

function evalLayer(layer: RuleLayer, tx: Transaction): boolean {
  const active = layer.conditions.filter(
    (c) => c.field === 'type' || c.value.trim() !== ''
  )
  if (active.length === 0) return false
  if (layer.join === 'OR') {
    return active.some((c) => evalCondition(c, tx))
  }
  return active.every((c) => evalCondition(c, tx))
}

/** Does this rule match the transaction? */
export function ruleMatches(rule: Rule, tx: Transaction): boolean {
  if (!rule.isActive) return false
  const n = normalizeRule(rule)
  const layerResults = n.layers.map((layer) => evalLayer(layer, tx))
  // Skip rules that have no evaluable content
  if (layerResults.every((_result, i) => {
    const active = n.layers[i].conditions.filter(
      (c) => c.field === 'type' || c.value.trim() !== ''
    )
    return active.length === 0
  })) {
    return false
  }
  if (n.layerJoin === 'OR') return layerResults.some(Boolean)
  return layerResults.every(Boolean)
}

/** Operators available for a field */
export function opsForField(field: RuleConditionField): Array<{
  value: RuleConditionOp
  label: string
}> {
  switch (field) {
    case 'description':
      return [
        { value: 'contains', label: 'contains' },
        { value: 'not_contains', label: 'does not contain' },
        { value: 'equals', label: 'equals' },
        { value: 'starts_with', label: 'starts with' },
        { value: 'ends_with', label: 'ends with' },
      ]
    case 'amount':
      return [
        { value: 'eq', label: '=' },
        { value: 'gt', label: '>' },
        { value: 'gte', label: '≥' },
        { value: 'lt', label: '<' },
        { value: 'lte', label: '≤' },
      ]
    case 'type':
      return [{ value: 'is', label: 'is' }]
    case 'date':
      return [
        { value: 'eq', label: 'on' },
        { value: 'before', label: 'before' },
        { value: 'after', label: 'after' },
      ]
  }
}

export function defaultOpForField(field: RuleConditionField): RuleConditionOp {
  return opsForField(field)[0].value
}

/** Primary keyword for display / legacy field */
export function primaryKeyword(rule: Rule): string {
  const n = normalizeRule(rule)
  for (const layer of n.layers) {
    for (const c of layer.conditions) {
      if (c.field === 'description' && c.value.trim()) return c.value.trim()
    }
  }
  return rule.keyword?.trim() || ''
}
