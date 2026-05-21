import type { FilingMeta } from '../types'

interface Props {
  meta: FilingMeta
  prevMeta: FilingMeta | null
  onRefresh: () => void
  isRefreshing: boolean
  chatOpen: boolean
  onChatToggle: () => void
}

export default function StatusBar({ meta, prevMeta, onRefresh, isRefreshing, chatOpen, onChatToggle }: Props) {
  const period = prevMeta
    ? `${prevMeta.period_of_report} → ${meta.period_of_report}`
    : meta.period_of_report

  return (
    <header style={{
      padding: '8px 16px',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      background: 'var(--surface)',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div style={{ minWidth: 0, flex: '1 1 auto' }}>
        <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.04em', color: 'var(--text-1)' }}>
          Overview
        </div>
        <div style={{
          color: 'var(--text-2)',
          fontSize: 10,
          marginTop: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {meta.fund_name} · {period} · filed {meta.filed}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button
          onClick={onChatToggle}
          style={{
            padding: '5px 11px',
            background: chatOpen ? 'var(--blue)' : 'var(--surface-hi)',
            border: '1px solid var(--border)',
            color: chatOpen ? '#fff' : 'var(--text-2)',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 11,
            letterSpacing: '0.03em',
          }}
        >
          ✦ Chat
        </button>
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          style={{
            padding: '5px 11px',
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
          {isRefreshing ? '↻…' : '↻ Refresh'}
        </button>
      </div>
    </header>
  )
}
