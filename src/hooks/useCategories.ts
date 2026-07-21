import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Category } from '@/types/transaction'
import * as storage from '@/lib/storage/categories'
import { generateId } from '@/lib/utils'
import {
  getCategoryLabel,
  getChildren,
  getParents,
  orderCategoriesHierarchically,
} from '@/lib/categoryHelpers'
import type { DeleteCategoryResult } from '@/lib/storage/categories'

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const data = await storage.getAllCategories()
    setCategories(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const parents = useMemo(() => getParents(categories), [categories])
  const ordered = useMemo(() => orderCategoriesHierarchically(categories), [categories])

  const add = useCallback(
    async (
      name: string,
      color: string,
      icon: string,
      parentId: string | null = null
    ) => {
      let finalColor = color
      let finalIcon = icon
      if (parentId) {
        const parent = categories.find((c) => c.id === parentId)
        if (parent) {
          if (!color || color === '#6366f1') finalColor = parent.color
          if (!icon || icon === '📌') finalIcon = parent.icon
        }
      }
      const category: Category = {
        id: generateId(),
        name,
        color: finalColor,
        icon: finalIcon,
        isSystem: false,
        parentId,
      }
      await storage.addCategory(category)
      setCategories((prev) => [...prev, category])
      return category
    },
    [categories]
  )

  const update = useCallback(async (category: Category) => {
    await storage.updateCategory(category)
    setCategories((prev) => prev.map((c) => (c.id === category.id ? category : c)))
  }, [])

  const remove = useCallback(async (id: string): Promise<DeleteCategoryResult> => {
    const result = await storage.deleteCategory(id)
    const data = await storage.getAllCategories()
    setCategories(data)
    return result
  }, [])

  const getById = useCallback(
    (id: string) => categories.find((c) => c.id === id),
    [categories]
  )

  const labelFor = useCallback(
    (id: string) => getCategoryLabel(categories, id, { includeIcon: true }),
    [categories]
  )

  const childrenOf = useCallback(
    (parentId: string) => getChildren(categories, parentId),
    [categories]
  )

  return {
    categories,
    parents,
    ordered,
    loading,
    refresh,
    add,
    update,
    remove,
    getById,
    labelFor,
    childrenOf,
  }
}
