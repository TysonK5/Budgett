import {
  DATE_PRESET_OPTIONS,
  useDateRange,
  type DatePreset,
} from '@/context/DateRangeContext'

/**
 * Sticky page-level date range control (upper right).
 * Choice is persisted via DateRangeProvider.
 */
export function GlobalDateRangeBar() {
  const {
    preset,
    customStart,
    customEnd,
    label,
    setPreset,
    setCustomStart,
    setCustomEnd,
    clear,
  } = useDateRange()

  const isFiltered = preset !== 'all'

  return (
    <div className="global-date-bar" role="region" aria-label="Date range filter">
      <div className="global-date-bar-inner">
        <span className="global-date-bar-label text-xs text-muted" title={label}>
          {isFiltered ? (
            <>
              <span className="global-date-bar-active-dot" aria-hidden />
              {label}
            </>
          ) : (
            'Date range'
          )}
        </span>

        <select
          className="select select-sm global-date-preset"
          value={preset}
          onChange={(e) => setPreset(e.target.value as DatePreset)}
          aria-label="Date range preset"
        >
          {DATE_PRESET_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {preset === 'custom' && (
          <div className="global-date-custom flex items-center gap-sm">
            <input
              type="date"
              className="input select-sm global-date-input"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              aria-label="Start date"
            />
            <span className="text-xs text-muted">to</span>
            <input
              type="date"
              className="input select-sm global-date-input"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              aria-label="End date"
            />
          </div>
        )}

        {isFiltered && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={clear}
            title="Clear date filter (all time)"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
