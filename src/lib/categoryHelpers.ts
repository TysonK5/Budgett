import type { Category } from '@/types/transaction'

export function isParent(cat: Category): boolean {
  return cat.parentId === null || cat.parentId === undefined
}

export function getParents(categories: Category[]): Category[] {
  return categories.filter((c) => isParent(c))
}

export function getChildren(categories: Category[], parentId: string): Category[] {
  return categories.filter((c) => c.parentId === parentId)
}

export function hasChildren(categories: Category[], parentId: string): boolean {
  return categories.some((c) => c.parentId === parentId)
}

/** Resolve effective color: child inherits parent color if needed */
export function getCategoryColor(categories: Category[], id: string): string {
  const cat = categories.find((c) => c.id === id)
  if (!cat) return '#94a3b8'
  if (cat.color) return cat.color
  if (cat.parentId) {
    const parent = categories.find((c) => c.id === cat.parentId)
    return parent?.color ?? '#94a3b8'
  }
  return '#94a3b8'
}

/** "Loans › Mortgage" or just "Groceries" */
export function getCategoryLabel(
  categories: Category[] | Map<string, Category>,
  id: string,
  opts: { separator?: string; includeIcon?: boolean } = {}
): string {
  const sep = opts.separator ?? ' › '
  const map =
    categories instanceof Map
      ? categories
      : new Map(categories.map((c) => [c.id, c]))
  const cat = map.get(id)
  if (!cat) return id

  const name = opts.includeIcon ? `${cat.icon} ${cat.name}` : cat.name
  if (cat.parentId) {
    const parent = map.get(cat.parentId)
    if (parent) {
      const parentName = opts.includeIcon ? `${parent.icon} ${parent.name}` : parent.name
      return `${parentName}${sep}${cat.name}`
    }
  }
  return name
}

/** Root (parent) id for a category — used when rolling up charts */
export function getRootCategoryId(
  categories: Category[] | Map<string, Category>,
  id: string
): string {
  const map =
    categories instanceof Map
      ? categories
      : new Map(categories.map((c) => [c.id, c]))
  const cat = map.get(id)
  if (!cat) return id
  return cat.parentId ?? cat.id
}

/**
 * IDs that match a filter selection:
 * - selecting a parent includes parent + all children
 * - selecting a child is exact match only
 */
export function expandCategoryFilter(
  categories: Category[],
  selectedId: string
): Set<string> {
  if (!selectedId) return new Set()
  const ids = new Set<string>([selectedId])
  for (const c of categories) {
    if (c.parentId === selectedId) ids.add(c.id)
  }
  return ids
}

/**
 * Flat list ordered for UI: each parent followed by its children.
 */
export function orderCategoriesHierarchically(categories: Category[]): Category[] {
  const parents = getParents(categories).sort((a, b) => a.name.localeCompare(b.name))
  const result: Category[] = []
  const orphanChildren = categories.filter(
    (c) => c.parentId && !categories.some((p) => p.id === c.parentId)
  )

  for (const parent of parents) {
    result.push(parent)
    const kids = getChildren(categories, parent.id).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
    result.push(...kids)
  }
  // Orphans (missing parent) at end
  result.push(...orphanChildren.sort((a, b) => a.name.localeCompare(b.name)))
  return result
}

/**
 * Options for <select> with optgroups.
 * Parents without children are selectable; parents with children are also selectable
 * (generic bucket) plus each child.
 */
export interface CategorySelectGroup {
  parent: Category
  children: Category[]
}

export function getCategorySelectGroups(categories: Category[]): CategorySelectGroup[] {
  return getParents(categories)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((parent) => ({
      parent,
      children: getChildren(categories, parent.id).sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    }))
}

/** Sum spend for a category id — if parent, includes all children */
export function sumSpendForCategory(
  spendById: Map<string, number>,
  categories: Category[],
  categoryId: string
): number {
  let total = spendById.get(categoryId) ?? 0
  for (const c of categories) {
    if (c.parentId === categoryId) {
      total += spendById.get(c.id) ?? 0
    }
  }
  return total
}

/** Normalize legacy categories missing parentId */
export function normalizeCategory(raw: Category | (Omit<Category, 'parentId'> & { parentId?: string | null })): Category {
  return {
    ...raw,
    parentId: raw.parentId ?? null,
  }
}
