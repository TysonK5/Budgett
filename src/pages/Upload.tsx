import { UploadZone } from '@/components/UploadZone'
import { ToastContainer } from '@/components/Toast'
import { useTransactions } from '@/hooks/useTransactions'
import { useRules } from '@/hooks/useRules'
import { useToast } from '@/hooks/useToast'
import type { Transaction } from '@/types/transaction'
import { Link } from 'react-router-dom'

export function Upload() {
  const { transactions, addMany } = useTransactions()
  const { rules } = useRules()
  const { toasts, show, dismiss } = useToast()

  const handleImport = async (items: Transaction[]) => {
    await addMany(items)
  }

  return (
    <div className="page-upload">
      <div className="page-header">
        <h1>Upload statement</h1>
        <p className="text-muted">
          Import transactions from a CSV/TSV bank export. PDF support is experimental.
        </p>
      </div>

      <UploadZone
        existing={transactions}
        rules={rules}
        onImport={handleImport}
        onMessage={show}
      />

      <div className="card" style={{ marginTop: 24 }}>
        <h3>Tips for best results</h3>
        <ul className="tips-list text-sm text-muted">
          <li>Prefer CSV/TSV downloads from your bank over PDF statements.</li>
          <li>
            Supported columns: Date / Transaction Date, Description / Memo / Payee, Amount or
            Debit/Credit.
          </li>
          <li>Duplicate rows (same date, description, amount) are skipped automatically.</li>
          <li>
            After import, refine categories on the{' '}
            <Link to="/transactions">Transactions</Link> page or add{' '}
            <Link to="/rules">custom rules</Link>.
          </li>
        </ul>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
