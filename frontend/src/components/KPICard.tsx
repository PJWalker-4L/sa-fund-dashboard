interface Props {
  label: string
  value: string
  sub?: string
  accent?: boolean
  valueColor?: string
}

export default function KPICard({ label, value, sub, accent, valueColor }: Props) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '13px 16px',
      flex: '1 1 0',
      minWidth: 130,
    }}>
      <div style={{
        color: 'var(--text-2)',
        fontSize: 10,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        marginBottom: 7,
        fontWeight: 500,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 24,
        fontWeight: 700,
        color: valueColor ?? 'var(--text-1)',
        fontFamily: 'var(--mono)',
        letterSpacing: '-0.02em',
        lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ color: 'var(--text-2)', fontSize: 11, marginTop: 5 }}>
          {sub}
        </div>
      )}
    </div>
  )
}
