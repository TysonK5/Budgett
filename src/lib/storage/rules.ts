import type { Rule } from '@/types/transaction'
import { getDB } from './db'
import { STORE_RULES } from '@/lib/constants'
import { normalizeRule, primaryKeyword } from '@/lib/rules/evaluate'

export async function getAllRules(): Promise<Rule[]> {
  const db = await getDB()
  const rules = await db.getAll(STORE_RULES)
  return rules
    .map((r) => {
      const n = normalizeRule(r)
      return { ...n, keyword: primaryKeyword(n) || n.keyword }
    })
    .sort((a, b) => a.priority - b.priority)
}

export async function addRule(rule: Rule): Promise<void> {
  const db = await getDB()
  const n = normalizeRule(rule)
  await db.put(STORE_RULES, {
    ...n,
    keyword: primaryKeyword(n) || n.keyword,
  })
}

export async function updateRule(rule: Rule): Promise<void> {
  const db = await getDB()
  const n = normalizeRule(rule)
  await db.put(STORE_RULES, {
    ...n,
    keyword: primaryKeyword(n) || n.keyword,
  })
}

export async function deleteRule(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_RULES, id)
}
