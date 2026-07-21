import { Link } from 'react-router-dom'
import { useTransactions } from '@/hooks/useTransactions'
import { formatCurrency } from '@/lib/utils'
import { useCharts } from '@/hooks/useCharts'
import { useCategories } from '@/hooks/useCategories'

export function Home() {
  const { transactions, loading } = useTransactions()
  const { categories } = useCategories()
  const { totals } = useCharts(transactions, categories)
  const hasData = transactions.length > 0

  return (
    <div className="home-page">
      <section className="hero card">
        <div className="hero-content">
          <h1>Take control of your spending</h1>
          <p className="hero-sub">
            Upload bank statements, auto-categorize transactions, track budgets, and export
            reports — all stored locally in your browser. No account required.
          </p>
          <div className="flex gap-md" style={{ flexWrap: 'wrap', marginTop: 24 }}>
            <Link to="/upload" className="btn btn-primary btn-lg">
              📁 Upload statement
            </Link>
            {hasData && (
              <Link to="/dashboard" className="btn btn-secondary btn-lg">
                📊 View dashboard
              </Link>
            )}
          </div>
        </div>
        <div className="hero-stats">
          {!loading && hasData ? (
            <>
              <div className="hero-stat">
                <span className="text-sm text-muted">Transactions</span>
                <strong>{totals.count}</strong>
              </div>
              <div className="hero-stat">
                <span className="text-sm text-muted">Spending</span>
                <strong>{formatCurrency(totals.spending)}</strong>
              </div>
              <div className="hero-stat">
                <span className="text-sm text-muted">Income</span>
                <strong style={{ color: 'var(--color-success)' }}>
                  {formatCurrency(totals.income)}
                </strong>
              </div>
            </>
          ) : (
            <div className="hero-stat">
              <span className="text-sm text-muted">Get started</span>
              <strong>Upload a CSV</strong>
            </div>
          )}
        </div>
      </section>

      <section className="features-grid">
        <div className="card feature-card">
          <div className="feature-icon">📁</div>
          <h3>Smart import</h3>
          <p className="text-sm text-muted">
            Drop CSV or TSV bank exports. Auto-detects columns, dates, and delimiters from common
            bank formats.
          </p>
        </div>
        <div className="card feature-card">
          <div className="feature-icon">🏷️</div>
          <h3>Auto-categorize</h3>
          <p className="text-sm text-muted">
            50+ built-in merchant rules plus custom keywords you define. Unmatched items land in
            Other.
          </p>
        </div>
        <div className="card feature-card">
          <div className="feature-icon">📊</div>
          <h3>Visual insights</h3>
          <p className="text-sm text-muted">
            Pie, bar, and trend charts with budget progress bars so you know where money goes.
          </p>
        </div>
        <div className="card feature-card">
          <div className="feature-icon">🔒</div>
          <h3>Private by default</h3>
          <p className="text-sm text-muted">
            Everything stays in IndexedDB on your device. Optional cloud sync is opt-in only.
          </p>
        </div>
      </section>

      <section className="card onboarding-steps">
        <h2>How it works</h2>
        <ol className="steps-list">
          <li>
            <strong>Upload</strong> a bank statement CSV from your online banking export.
          </li>
          <li>
            <strong>Review</strong> auto-categorized transactions and fix any that look wrong.
          </li>
          <li>
            <strong>Create rules</strong> for merchants you use often (e.g. “STARBUCKS” → Dining).
          </li>
          <li>
            <strong>Set budgets</strong> per category and watch progress on the dashboard.
          </li>
          <li>
            <strong>Export</strong> Excel or PDF reports when you need them.
          </li>
        </ol>
        <Link to="/upload" className="btn btn-primary" style={{ marginTop: 16 }}>
          Start with an upload →
        </Link>
      </section>
    </div>
  )
}
