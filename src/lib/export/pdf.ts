import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Category, Transaction } from '@/types/transaction'
import { formatCurrency, formatDate, periodLabel } from '@/lib/utils'
import { getCategoryLabel } from '@/lib/categoryHelpers'

export interface ReportOptions {
  period?: string
  title?: string
}

export function exportToPdf(
  transactions: Transaction[],
  categories: Category[],
  options: ReportOptions = {}
): void {
  const catMap = new Map(categories.map((c) => [c.id, c]))
  const doc = new jsPDF()
  const title = options.title ?? 'Budgett Spending Report'
  const period = options.period

  doc.setFontSize(18)
  doc.text(title, 14, 20)
  doc.setFontSize(11)
  doc.setTextColor(100)
  doc.text(
    period ? `Period: ${periodLabel(period)}` : `Generated: ${new Date().toLocaleDateString()}`,
    14,
    28
  )
  doc.setTextColor(0)

  // Filter by period if provided
  let filtered = transactions
  if (period) {
    filtered = transactions.filter((t) => t.date.startsWith(period))
  }

  // Summary by category
  const spending = new Map<string, number>()
  let totalDebit = 0
  let totalCredit = 0

  for (const t of filtered) {
    if (t.type === 'credit') {
      totalCredit += t.amount
    } else {
      totalDebit += t.amount
      spending.set(t.categoryId, (spending.get(t.categoryId) ?? 0) + t.amount)
    }
  }

  doc.setFontSize(13)
  doc.text('Summary', 14, 40)
  doc.setFontSize(10)
  doc.text(`Total Spending: ${formatCurrency(totalDebit)}`, 14, 48)
  doc.text(`Total Income: ${formatCurrency(totalCredit)}`, 14, 54)
  doc.text(`Net: ${formatCurrency(totalCredit - totalDebit)}`, 14, 60)
  doc.text(`Transactions: ${filtered.length}`, 14, 66)

  const categoryRows = Array.from(spending.entries())
    .map(([id, amount]) => {
      const pct = totalDebit > 0 ? ((amount / totalDebit) * 100).toFixed(1) : '0'
      return [getCategoryLabel(catMap, id), formatCurrency(amount), `${pct}%`]
    })
    .sort((a, b) => parseFloat(b[1].replace(/[^0-9.-]/g, '')) - parseFloat(a[1].replace(/[^0-9.-]/g, '')))

  autoTable(doc, {
    startY: 72,
    head: [['Category', 'Amount', '% of Spend']],
    body: categoryRows,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const afterSummary = (doc as any).lastAutoTable?.finalY ?? 100

  doc.setFontSize(13)
  doc.text('Transactions', 14, afterSummary + 12)

  const txRows = filtered
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 100)
    .map((t) => [
      formatDate(t.date),
      t.description.slice(0, 40),
      formatCurrency(t.amount),
      t.type,
      getCategoryLabel(catMap, t.categoryId),
    ])

  autoTable(doc, {
    startY: afterSummary + 16,
    head: [['Date', 'Description', 'Amount', 'Type', 'Category']],
    body: txRows,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 8 },
  })

  if (filtered.length > 100) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const y = (doc as any).lastAutoTable?.finalY ?? 270
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(`Showing first 100 of ${filtered.length} transactions`, 14, y + 8)
  }

  const fname = period
    ? `budgett-report-${period}.pdf`
    : `budgett-report-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(fname)
}
