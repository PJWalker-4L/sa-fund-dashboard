import type { FilingMeta } from '../types'

interface Props {
  meta: FilingMeta
  prevMeta: FilingMeta | null
  onRefresh: () => void
  isRefreshing: boolean
}

export default function StatusBar({ meta, prevMeta, onRefresh, isRefreshing }: Props) {
  const period = prevMeta
    ? `${prevMeta.period_of_report} → ${meta.period_of_report}`
    : meta.period_of_report

  return (
    <header style={{
      padding: '10px 24px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      background: 'var(--surface)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', color: 'var(--text-1)' }}>
          Overview
        </div>
        <div style={{ color: 'var(--text-2)', fontSize: 11, marginTop: 1 }}>
          {meta.fund_name} &nbsp;·&nbsp; {period} 13F positions
          &nbsp;·&nbsp; real prices through last close · filed {meta.filed}
        </div>
      </div>
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        style={{
          padding: '5px 14px',
          background: 'var(--surface-hi)',
          border: '1px solid var(--border)',
          color: isRefreshing ? 'var(--text-3)' : 'var(--text-2)',
          borderRadius: 4,
          cursor: isRefreshing ? 'not-allowed' : 'pointer',
          fontSize: 11,
          letterSpacing: '0.03em',
          transition: 'color 0.15s',
        }}
      >
        {isRefreshing ? 'Refreshing…' : '↻  Refresh Data'}
      </button>
    </header>
  )
}
