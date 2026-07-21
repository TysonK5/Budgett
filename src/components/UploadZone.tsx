import { useCallback, useRef, useState } from 'react'
import { parseCSV } from '@/lib/parser/csvParser'
import { parsePDF } from '@/lib/parser/pdfParser'
import { filterDuplicates, normalizeTransactions } from '@/lib/parser/normalizer'
import { categorizeTransactions } from '@/lib/categorizer'
import type { Rule, Transaction } from '@/types/transaction'

interface UploadZoneProps {
  existing: Transaction[]
  rules: Rule[]
  onImport: (transactions: Transaction[]) => Promise<void>
  onMessage: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
}

export function UploadZone({ existing, rules, onImport, onMessage }: UploadZoneProps) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<Transaction[] | null>(null)
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(
    async (file: File) => {
      setLoading(true)
      setPreview(null)
      setParseErrors([])

      try {
        const name = file.name.toLowerCase()
        let rows
        let errors: string[] = []

        if (name.endsWith('.pdf')) {
          const result = await parsePDF(file)
          rows = result.rows
          errors = result.errors
        } else if (
          name.endsWith('.csv') ||
          name.endsWith('.tsv') ||
          name.endsWith('.txt') ||
          file.type.includes('csv') ||
          file.type.includes('tab')
        ) {
          const text = await file.text()
          const result = parseCSV(text)
          rows = result.rows
          errors = result.errors
        } else {
          onMessage('Unsupported file type. Please upload CSV, TSV, or PDF.', 'error')
          setLoading(false)
          return
        }

        setParseErrors(errors)

        if (!rows || rows.length === 0) {
          onMessage(
            errors[0] ?? 'No transactions found in file. Check the format and try again.',
            'error'
          )
          setLoading(false)
          return
        }

        const normalized = normalizeTransactions(rows)
        const unique = filterDuplicates(normalized, existing)
        const categorized = categorizeTransactions(unique, rules)

        if (categorized.length === 0) {
          onMessage('All transactions in this file already exist.', 'warning')
          setLoading(false)
          return
        }

        setPreview(categorized)
        if (errors.length > 0) {
          onMessage(
            `Parsed ${categorized.length} transactions with ${errors.length} warning(s).`,
            'warning'
          )
        } else {
          onMessage(`Ready to import ${categorized.length} transactions.`, 'info')
        }
      } catch (e) {
        onMessage(e instanceof Error ? e.message : 'Failed to parse file', 'error')
      } finally {
        setLoading(false)
      }
    },
    [existing, rules, onMessage]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) void processFile(file)
    },
    [processFile]
  )

  const handleConfirm = async () => {
    if (!preview?.length) return
    setLoading(true)
    try {
      await onImport(preview)
      onMessage(`Imported ${preview.length} transactions successfully.`, 'success')
      setPreview(null)
      setParseErrors([])
    } catch {
      onMessage('Failed to save transactions.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="upload-zone-wrap">
      <div
        className={`upload-zone ${dragging ? 'dragging' : ''} ${loading ? 'loading' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.tsv,.txt,.pdf,text/csv,text/tab-separated-values,application/pdf"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void processFile(file)
            e.target.value = ''
          }}
        />
        <div className="upload-icon">{loading ? '⏳' : '📁'}</div>
        <h3>{loading ? 'Parsing…' : 'Drop bank statement here'}</h3>
        <p className="text-muted text-sm">
          or click to browse · CSV, TSV, or PDF
        </p>
      </div>

      {parseErrors.length > 0 && (
        <div className="card upload-errors">
          <h4>Parse notes</h4>
          <ul>
            {parseErrors.slice(0, 8).map((err, i) => (
              <li key={i} className="text-sm text-muted">
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview && preview.length > 0 && (
        <div className="card upload-preview fade-in">
          <div className="flex justify-between items-center gap-md" style={{ marginBottom: 12 }}>
            <div>
              <h3>Preview</h3>
              <p className="text-sm text-muted">
                {preview.length} new transactions ready to import
              </p>
            </div>
            <div className="flex gap-sm">
              <button className="btn btn-secondary" onClick={() => setPreview(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => void handleConfirm()} disabled={loading}>
                Import all
              </button>
            </div>
          </div>
          <div className="preview-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Type</th>
                  <th>Category</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 15).map((t) => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>{t.description}</td>
                    <td className={t.type === 'credit' ? 'amount-credit' : 'amount-debit'}>
                      {t.type === 'credit' ? '+' : '-'}${t.amount.toFixed(2)}
                    </td>
                    <td>{t.type}</td>
                    <td>
                      <span className="badge badge-info">{t.categoryId}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 15 && (
              <p className="text-sm text-muted" style={{ marginTop: 8 }}>
                …and {preview.length - 15} more
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
