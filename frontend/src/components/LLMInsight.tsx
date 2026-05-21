import { useState } from 'react'
import type { AnalysisResponse } from '../types'
import LinkedTickerText from './LinkedTickerText'

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
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '12px 18px',
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
              borderRadius: 3,
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
        <div style={{
          fontFamily: 'var(--mono)',
          fontSize: 13,
          color: 'var(--text-1)',
          lineHeight: 1.8,
          whiteSpace: 'pre-wrap',
          minHeight: 32,
        }}>
          {isLoading
            ? <span className="pulse" style={{ color: 'var(--text-3)' }}>——</span>
            : data?.analysis
            ? (
              <LinkedTickerText
                text={data.analysis}
                tickerNames={tickerNames}
                onTickerClick={onTickerClick}
              />
            )
            : 'No analysis available.'}
        </div>
      )}
    </div>
  )
}
