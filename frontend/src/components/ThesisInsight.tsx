import { useState } from 'react'
import type { HoldingRow, StrategyResponse } from '../types'
import LinkedTickerText from './LinkedTickerText'

interface Props {
  holdings: HoldingRow[]
  strategy: StrategyResponse | undefined
  isLoading: boolean
  onRefresh: () => void
  tickerNames: Record<string, string>
  onTickerClick?: (ticker: string) => void
}

const LAYERS = [
  {
    key: 'Power',
    label: 'Power',
    color: '#fbbf24',
    desc: 'Nuclear · gas · solar — electricity is bottleneck #1',
  },
  {
    key: 'Silicon',
    label: 'Silicon',
    color: '#00d4ff',
    desc: 'GPU + specialized chips enabling the AI compute stack',
  },
  {
    key: 'GPU Cloud',
    label: 'GPU Cloud',
    color: '#a78bfa',
    desc: 'Pure-play GPU cloud for frontier AI training',
  },
  {
    key: 'AI Infrastructure',
    label: 'AI Infrastructure',
    color: '#34d399',
    desc: 'Data centers + miners converting to high-density AI compute',
  },
  {
    key: 'Optical',
    label: 'Optical',
    color: '#fb923c',
    desc: 'High-bandwidth fiber linking GPU clusters',
  },
  {
    key: 'Storage',
    label: 'Storage',
    color: '#94a3b8',
    desc: 'Memory & storage scales with AI training volumes',
  },
]

function fmtValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}B`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}M`
  return `$${v.toFixed(0)}K`
}

export default function ThesisInsight({ holdings, strategy, isLoading, onRefresh, tickerNames, onTickerClick }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  const totalAum = holdings.reduce((s, h) => s + h.value, 0)

  const layerMap: Record<string, HoldingRow[]> = {}
  for (const h of holdings) {
    if (!h.thesis_role) continue
    if (!layerMap[h.thesis_role]) layerMap[h.thesis_role] = []
    layerMap[h.thesis_role].push(h)
  }

  const layerValue = (key: string) =>
    (layerMap[key] ?? []).reduce((s, h) => s + h.value, 0)

  const layerLongValue = (key: string) =>
    (layerMap[key] ?? [])
      .filter(h => h.putCall !== 'Put')
      .reduce((s, h) => s + h.value, 0)

  const layerPutValue = (key: string) =>
    (layerMap[key] ?? [])
      .filter(h => h.putCall === 'Put')
      .reduce((s, h) => s + h.value, 0)

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '12px 18px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: collapsed ? 0 : 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em' }}>
            ◈ THESIS STACK
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.04em' }}>
            AGI SUPPLY CHAIN · SITUATIONAL AWARENESS PAPER
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={onRefresh}
            style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: 11 }}
          >
            ↻ refresh
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 11 }}
          >
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Layer grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
          }}>
            {LAYERS.map(layer => {
              const positions = layerMap[layer.key] ?? []
              const val = layerValue(layer.key)
              const longVal = layerLongValue(layer.key)
              const putVal = layerPutValue(layer.key)
              const pct = totalAum ? (val / totalAum * 100) : 0
              const longPct = totalAum ? (longVal / totalAum * 100) : 0
              const putPct = totalAum ? (putVal / totalAum * 100) : 0

              return (
                <div key={layer.key} style={{
                  background: 'var(--surface-hi)',
                  border: `1px solid ${positions.length ? layer.color + '33' : 'var(--border)'}`,
                  borderLeft: `3px solid ${positions.length ? layer.color : 'var(--border)'}`,
                  borderRadius: 4,
                  padding: '8px 10px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: layer.color, letterSpacing: '0.05em' }}>
                      {layer.label.toUpperCase()}
                    </span>
                    {positions.length > 0 && (
                      <span style={{ fontSize: 10, color: 'var(--text-2)', fontFamily: 'var(--mono)', textAlign: 'right' }}>
                        {putVal > 0 ? (
                          <>
                            <span>{fmtValue(longVal)} long · {longPct.toFixed(1)}%</span>
                            <br />
                            <span style={{ color: '#f87171' }}>{fmtValue(putVal)} puts · {putPct.toFixed(1)}%</span>
                          </>
                        ) : (
                          <span>{fmtValue(val)} · {pct.toFixed(1)}%</span>
                        )}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', marginBottom: 6, lineHeight: 1.4 }}>
                    {layer.desc}
                  </div>
                  {positions.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {positions.map(h => (
                        <span key={`${h.cusip}_${h.putCall}`} style={{
                          fontSize: 9,
                          fontFamily: 'var(--mono)',
                          fontWeight: 600,
                          color: layer.color,
                          background: layer.color + '15',
                          border: `1px solid ${layer.color}40`,
                          borderRadius: 3,
                          padding: '1px 5px',
                        }}>
                          {h.ticker ?? h.nameOfIssuer.split(' ')[0]}
                          {h.putCall === 'Call' && <span style={{ color: '#00d4ff', marginLeft: 2 }}>C</span>}
                          {h.putCall === 'Put' && <span style={{ color: '#f87171', marginLeft: 2 }}>P</span>}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span style={{ fontSize: 9, color: 'var(--text-3)', fontStyle: 'italic' }}>
                      no position
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* LLM strategy commentary */}
          <div style={{
            borderTop: '1px solid var(--border)',
            paddingTop: 10,
            marginTop: 2,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em' }}>
                ◈ STRATEGY COMMENTARY
              </span>
              {strategy?.cached && (
                <span style={{
                  fontSize: 9, color: 'var(--text-3)',
                  background: 'var(--surface-hi)',
                  padding: '1px 6px', borderRadius: 3, letterSpacing: '0.05em',
                }}>
                  CACHED
                </span>
              )}
              {isLoading && (
                <span className="pulse" style={{ fontSize: 10, color: 'var(--text-3)' }}>
                  analyzing…
                </span>
              )}
            </div>
            <div style={{
              fontFamily: 'var(--mono)',
              fontSize: 13,
              color: 'var(--text-1)',
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
              minHeight: 28,
            }}>
              {isLoading
                ? <span className="pulse" style={{ color: 'var(--text-3)' }}>——</span>
                : strategy?.commentary
                ? (
                  <LinkedTickerText
                    text={strategy.commentary}
                    tickerNames={tickerNames}
                    onTickerClick={onTickerClick}
                  />
                )
                : 'No strategy commentary available.'}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
