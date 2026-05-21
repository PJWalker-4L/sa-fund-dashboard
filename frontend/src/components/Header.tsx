import type { FilingMeta } from '../types'

export type DashboardTab = 'portfolio' | 'indicators'

interface Props {
  meta: FilingMeta
  prevMeta: FilingMeta | null
  activeTab: DashboardTab
  onTabChange: (tab: DashboardTab) => void
  onRefresh: () => void
  isRefreshing: boolean
  chatOpen: boolean
  onChatToggle: () => void
}

const TABS: { id: DashboardTab; label: string }[] = [
  { id: 'portfolio', label: 'Portfolio Overview' },
  { id: 'indicators', label: 'Market Indicators' },
]

export default function Header({
  meta,
  prevMeta,
  activeTab,
  onTabChange,
  onRefresh,
  isRefreshing,
  chatOpen,
  onChatToggle,
}: Props) {
  const period = prevMeta
    ? `${prevMeta.period_of_report} → ${meta.period_of_report}`
    : meta.period_of_report

  return (
    <header style={{
      backgroundColor: 'var(--surface)',
      backgroundImage: 'var(--grid)',
      backgroundSize: '42px 42px',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 20,
      boxShadow: '0 4px 32px rgba(0,0,0,0.7)',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '0 16px',
        height: 46,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          {/* Corner accent marks for the brand area */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
            <span style={{
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.18em',
              color: 'var(--text-1)',
              fontFamily: 'var(--mono)',
              textTransform: 'uppercase',
            }}>
              SITUATIONAL
            </span>
            <span style={{
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '0.18em',
              color: 'var(--teal)',
              fontFamily: 'var(--mono)',
              textTransform: 'uppercase',
              marginLeft: 7,
              textShadow: '0 0 12px var(--teal-glow)',
            }}>
              EDGE
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 18, background: 'var(--border-hi)' }} />

          {/* Meta strip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minWidth: 0,
            overflow: 'hidden',
          }}>
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--text-3)',
              fontFamily: 'var(--font)',
            }}>
              {meta.fund_name?.split(' ').slice(0, 2).join(' ')}
            </span>
            <span style={{ color: 'var(--border-hi)', fontSize: 10 }}>·</span>
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: 10,
              color: 'var(--text-2)',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
            }}>
              {period}
            </span>
            <span style={{ color: 'var(--border-hi)', fontSize: 10 }}>·</span>
            <span style={{
              fontSize: 9,
              color: 'var(--text-3)',
              letterSpacing: '0.06em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontFamily: 'var(--font)',
            }}>
              FILED {meta.filed}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          {/* Live indicator dot */}
          <div style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: 'var(--teal)',
            boxShadow: '0 0 6px var(--teal-glow)',
            animation: 'glow-pulse 2.5s ease-in-out infinite',
          }} />

          <button
            onClick={onChatToggle}
            style={{
              padding: '4px 12px',
              height: 26,
              background: chatOpen ? 'rgba(0,200,224,0.12)' : 'transparent',
              border: `1px solid ${chatOpen ? 'var(--teal)' : 'var(--border-hi)'}`,
              color: chatOpen ? 'var(--teal)' : 'var(--text-2)',
              cursor: 'pointer',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.12em',
              fontFamily: 'var(--font)',
              textTransform: 'uppercase',
              transition: 'all 0.15s',
              boxShadow: chatOpen ? '0 0 10px rgba(0,200,224,0.2)' : 'none',
            }}
          >
            ✦ Chat
          </button>
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            style={{
              padding: '4px 12px',
              height: 26,
              background: 'transparent',
              border: '1px solid var(--border-hi)',
              color: isRefreshing ? 'var(--text-3)' : 'var(--text-2)',
              cursor: isRefreshing ? 'not-allowed' : 'pointer',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.12em',
              fontFamily: 'var(--font)',
              textTransform: 'uppercase',
              transition: 'all 0.15s',
            }}
          >
            {isRefreshing ? '↻ …' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <nav className="tab-bar" aria-label="Dashboard sections">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            className={`tab-item${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
