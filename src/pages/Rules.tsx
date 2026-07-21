import { RuleEditor, type RuleApplyMode } from '@/components/RuleEditor'
import { ToastContainer } from '@/components/Toast'
import { useRules } from '@/hooks/useRules'
import { useCategories } from '@/hooks/useCategories'
import { useTransactions } from '@/hooks/useTransactions'
import { useToast } from '@/hooks/useToast'
import { DEFAULT_KEYWORD_RULES } from '@/lib/categorizer/defaultRules'
import { describeRule, primaryKeyword } from '@/lib/rules/evaluate'
import type { Rule } from '@/types/transaction'

export function Rules() {
  const { rules, addLayered, update, toggle, remove } = useRules()
  const { categories } = useCategories()
  const { transactions, recategorize } = useTransactions()
  const { toasts, show, dismiss } = useToast()

  const applyIfNeeded = async (nextRules: Rule[], applyMode: RuleApplyMode) => {
    if (applyMode !== 'all') return
    await recategorize(nextRules)
  }

  return (
    <div className="page-rules">
      <div className="page-header">
        <h1>Categorization rules</h1>
        <p className="text-muted">
          Layered IF / AND / OR rules take priority over the {DEFAULT_KEYWORD_RULES.length}{' '}
          built-in merchant mappings.
        </p>
      </div>

      <RuleEditor
        rules={rules}
        categories={categories}
        transactions={transactions}
        onAddLayered={async (input, applyMode) => {
          const rule = await addLayered(input)
          const label = primaryKeyword(rule) || describeRule(rule).slice(0, 60)
          if (applyMode === 'all') {
            // Include the new rule — state may not have flushed yet
            const nextRules = [...rules.filter((r) => r.id !== rule.id), rule].sort(
              (a, b) => a.priority - b.priority
            )
            await applyIfNeeded(nextRules, applyMode)
            show(`Rule saved & applied to all transactions: ${label}`, 'success')
          } else {
            show(`Rule saved for future transactions: ${label}`, 'success')
          }
        }}
        onUpdate={async (rule, applyMode) => {
          await update(rule)
          const label = primaryKeyword(rule) || describeRule(rule).slice(0, 60)
          if (applyMode === 'all') {
            const nextRules = rules
              .map((r) => (r.id === rule.id ? rule : r))
              .sort((a, b) => a.priority - b.priority)
            await applyIfNeeded(nextRules, applyMode)
            show(`Rule updated & applied to all transactions: ${label}`, 'success')
          } else {
            show(`Rule updated (future only): ${label}`, 'success')
          }
        }}
        onToggle={async (id) => {
          await toggle(id)
          show('Rule updated', 'info')
        }}
        onDelete={async (id) => {
          if (!confirm('Delete this rule?')) return
          await remove(id)
          show('Rule deleted', 'info')
        }}
        onApply={async () => {
          await recategorize(rules)
          show('All transactions re-categorized', 'success')
        }}
      />

      <div className="card" style={{ marginTop: 24 }}>
        <h3 style={{ marginBottom: 8 }}>How layers work</h3>
        <ul className="tips-list text-sm text-muted">
          <li>
            <strong>IF</strong> starts the first layer. Conditions inside a layer are combined
            with <strong>ALL (AND)</strong> or <strong>ANY (OR)</strong>.
          </li>
          <li>
            Add another layer and choose <strong>AND</strong> or <strong>OR</strong> between
            layers (e.g. description match AND amount &gt; 50).
          </li>
          <li>
            Conditions can use description, amount, type (debit/credit), or date.
          </li>
          <li>
            <strong>Save — future only</strong> stores the rule for new imports.{' '}
            <strong>Save — apply to all</strong> also re-categorizes existing transactions.
          </li>
        </ul>
        <div className="default-rules-sample" style={{ marginTop: 8 }}>
          {DEFAULT_KEYWORD_RULES.slice(0, 16).map((r) => (
            <span key={r.keyword} className="badge badge-info" style={{ margin: 2 }}>
              {r.keyword} → {r.categoryId}
            </span>
          ))}
          <span className="text-sm text-muted">…and more</span>
        </div>
      </div>

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  )
}
