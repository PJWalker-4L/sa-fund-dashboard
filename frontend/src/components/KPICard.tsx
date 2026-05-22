interface Props {
  label: string
  value: string
  sub?: string
  valueColor?: string
  status?: string
  statusWarn?: boolean
  barPct?: number
  barWarn?: boolean
  accent?: boolean
}

export default function KPICard({ label, value, sub, valueColor, status, statusWarn, barPct, barWarn }: Props) {
  // Long company names / wide strings get smaller font
  const valueSize = value.length > 10 ? 15 : value.length > 6 ? 20 : 24

  return (
    <div className="kpi-row">
      <div className="kpi-row-header">
        <span className="kpi-row-label">{label}</span>
        {status && (
          <span className={`kpi-row-status${statusWarn ? ' warn' : ''}`}>{status}</span>
        )}
      </div>
      <div
        className="kpi-row-value"
        style={{
          fontSize: valueSize,
          ...(valueColor ? { color: valueColor } : {}),
        }}
      >
        {value}
      </div>
      {sub && <div className="kpi-row-sub">{sub}</div>}
      {barPct !== undefined && (
        <div className="kpi-bar">
          <div
            className={`kpi-bar-fill${barWarn ? ' warn' : ''}`}
            style={{ width: `${Math.min(100, Math.max(0, barPct))}%` }}
          />
        </div>
      )}
    </div>
  )
}
