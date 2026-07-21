import { Link } from 'react-router-dom'
import { TransactionTable } from '@/components/TransactionTable'
import { ToastContainer } from '@/components/Toast'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useToast } from '@/hooks/useToast'

export function Transactions() {
  const { transactions, loading, update, remove } = useTransactions()
  const { categories } = useCategories()
  const { toasts, show, dismiss } = useToast()

  const handleCategoryChange = async (id: string, categoryId: string) => {
    const t = transactions.find((x) => x.id === id)
    if (!t) return
    await update({ ...t, categoryId })
    show('Category updated', 'success')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this transaction?')) return
    await remove(id)
    show('Transaction deleted', 'info')
  }

  return (
    <div className="page-transactions">
      <div className="page-header flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Transactions</h1>
          <p className="text-muted">Search, filter, and recategorize your activity</p>
        </div>
        <Link to="/upload" className="btn btn-primary">
          + Upload more
        </Link>
      </div>

      <div className="card">
        {loading ? (
          <div className="skeleton" style={{ height: 200 }} />
        ) : transactions.length === 0 ? (
          <div className="empty-state text-center" style={{ padding: 32 }}>
            <p className="text-muted" style={{ marginBottom: 12 }}>
              No transactions yet.
            </p>
            <Link to="/upload" className="btn btn-primary">
              Upload a statement
            </Link>
          </div>
        ) : (
          <TransactionTable
            transactions={transactions}
            categories={categories}
            onUpdateCategory={(id, cat) => void handleCategoryChange(id, cat)}
            onDelete={(id) => void handleDelete(id)}
          />
        )}
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
