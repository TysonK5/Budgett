import { useCallback, useEffect, useState } from 'react'
import type { Rule, RuleJoin, RuleLayer } from '@/types/transaction'
import * as storage from '@/lib/storage/rules'
import { generateId } from '@/lib/utils'
import { emptyLayer, normalizeRule, primaryKeyword } from '@/lib/rules/evaluate'

export function useRules() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const data = await storage.getAllRules()
    setRules(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /** Simple keyword rule (legacy helper) */
  const add = useCallback(
    async (keyword: string, categoryId: string) => {
      const layer = emptyLayer('AND')
      layer.conditions[0] = {
        ...layer.conditions[0],
        field: 'description',
        op: 'contains',
        value: keyword.trim(),
      }
      const rule: Rule = {
        id: generateId(),
        keyword: keyword.trim(),
        categoryId,
        isActive: true,
        priority: rules.length,
        layerJoin: 'AND',
        layers: [layer],
      }
      await storage.addRule(rule)
      setRules((prev) => [...prev, rule].sort((a, b) => a.priority - b.priority))
      return rule
    },
    [rules.length]
  )

  /** Full layered rule */
  const addLayered = useCallback(
    async (input: {
      categoryId: string
      layerJoin: RuleJoin
      layers: RuleLayer[]
      name?: string
    }) => {
      const layers = input.layers
      const rule: Rule = normalizeRule({
        id: generateId(),
        keyword: '',
        categoryId: input.categoryId,
        isActive: true,
        priority: rules.length,
        layerJoin: input.layerJoin,
        layers,
        name: input.name,
      })
      rule.keyword = primaryKeyword(rule)
      await storage.addRule(rule)
      setRules((prev) => [...prev, rule].sort((a, b) => a.priority - b.priority))
      return rule
    },
    [rules.length]
  )

  const update = useCallback(async (rule: Rule) => {
    const n = normalizeRule(rule)
    n.keyword = primaryKeyword(n)
    await storage.updateRule(n)
    setRules((prev) =>
      prev.map((r) => (r.id === n.id ? n : r)).sort((a, b) => a.priority - b.priority)
    )
  }, [])

  const remove = useCallback(async (id: string) => {
    await storage.deleteRule(id)
    setRules((prev) => prev.filter((r) => r.id !== id))
  }, [])

  const toggle = useCallback(
    async (id: string) => {
      const rule = rules.find((r) => r.id === id)
      if (!rule) return
      const updated = { ...rule, isActive: !rule.isActive }
      await storage.updateRule(updated)
      setRules((prev) => prev.map((r) => (r.id === id ? updated : r)))
    },
    [rules]
  )

  return { rules, loading, refresh, add, addLayered, update, remove, toggle }
}
