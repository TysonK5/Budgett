interface StatCardProps {
  label: string
  value: string
  sub?: string
  accent?: string
  icon?: string
}

export function StatCard({ label, value, sub, accent, icon }: StatCardProps) {
  return (
    <div className="stat-card card">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted">{label}</span>
        {icon && <span style={{ fontSize: 20 }}>{icon}</span>}
      </div>
      <div className="stat-value" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  )
}
