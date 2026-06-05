import { useState } from 'react'
import type { AnalysisResponse } from '../types'
import FormattedMonoText from './FormattedMonoText'

interface Props {
  data: AnalysisResponse | undefined
  isLoading: boolean
  onRefresh: () => void
  tickerNames: Record<string, string>
  onTickerClick?: (ticker: string) => void
}

export default function LLMInsight({ data, isLoading, onRefresh, tickerNames, onTickerClick }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="nexus-surface" style={{
      backgroundColor: 'var(--surface)',
      backgroundImage: 'var(--grid)',
      backgroundSize: '42px 42px',
      border: '1px solid var(--border)',
      padding: '12px 18px',
      boxShadow: '0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.025)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: collapsed ? 0 : 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--blue)', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em' }}>
            ◈ AI INSIGHT
          </span>
          {data?.cached && (
            <span style={{
              fontSize: 9,
              color: 'var(--text-3)',
              background: 'var(--surface-hi)',
              padding: '1px 6px',
              letterSpacing: '0.05em',
            }}>
              CACHED
            </span>
          )}
          {isLoading && (
            <span className="pulse" style={{ fontSize: 11, color: 'var(--text-3)' }}>
              analyzing delta…
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={onRefresh}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-2)', cursor: 'pointer', fontSize: 11,
            }}
          >
            ↻ refresh
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-3)', cursor: 'pointer', fontSize: 11,
            }}
          >
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ minHeight: 32 }}>
          {isLoading
            ? <span className="pulse insight-line insight-line--muted">——</span>
            : data?.analysis
            ? (
              <FormattedMonoText
                text={data.analysis}
                variant="insight"
                tickerNames={tickerNames}
                onTickerClick={onTickerClick}
              />
            )
            : <span className="insight-line insight-line--muted">No analysis available.</span>}
        </div>
      )}
    </div>
  )
}
