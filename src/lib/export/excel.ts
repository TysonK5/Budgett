import * as XLSX from 'xlsx'
import type { Category, Transaction } from '@/types/transaction'
import { formatDate } from '@/lib/utils'
import { getCategoryLabel, getRootCategoryId } from '@/lib/categoryHelpers'

export function exportToExcel(
  transactions: Transaction[],
  categories: Category[],
  filename = 'budgett-transactions.xlsx'
): void {
  const catMap = new Map(categories.map((c) => [c.id, c]))

  const rows = transactions.map((t) => {
    const cat = catMap.get(t.categoryId)
    const parentId = cat?.parentId ? cat.parentId : getRootCategoryId(catMap, t.categoryId)
    const parent = catMap.get(parentId)
    const isChild = Boolean(cat?.parentId)
    return {
      Date: formatDate(t.date),
      Description: t.description,
      Amount: t.amount,
      Type: t.type,
      'Parent category': parent?.name ?? '',
      Subcategory: isChild ? cat?.name ?? '' : '',
      Category: getCategoryLabel(catMap, t.categoryId),
    }
  })

  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [
    { wch: 14 },
    { wch: 40 },
    { wch: 12 },
    { wch: 10 },
    { wch: 16 },
    { wch: 18 },
    { wch: 28 },
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions')
  XLSX.writeFile(wb, filename)
}
