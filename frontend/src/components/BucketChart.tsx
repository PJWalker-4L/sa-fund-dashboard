import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { BucketAllocation, HoldingRow } from '../types'

interface Props {
  buckets: BucketAllocation[]
  holdings: HoldingRow[]
  topN?: number
  onPositionClick?: (ticker: string, holding: HoldingRow) => void
}

type Mode = 'buckets' | 'positions'

const COLORS = ['#38bdf8', '#f97316', '#22c55e', '#fbbf24', '#a78bfa', '#2dd4bf', '#f472b6', '#94a3b8', '#fb7185', '#34d399', '#818cf8', '#facc15']

function fmtVal(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}B`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}M`
  return `$${v.toFixed(0)}K`
}

function buildBucketData(buckets: BucketAllocation[], topN: number) {
  return buckets.slice(0, topN).map((b, i) => ({
    name: b.label,
    value: b.value_thousands,
    pct: b.pct,
    fill: COLORS[i % COLORS.length],
  }))
}

function buildPositionData(holdings: HoldingRow[], topN: number) {
  const sorted = [...holdings].sort((a, b) => b.value - a.value)
  const total = sorted.reduce((s, h) => s + h.value, 0)
  const top = sorted.slice(0, topN)
  const otherValue = sorted.slice(topN).reduce((s, h) => s + h.value, 0)

  const data: Array<{
    name: string; fullName: string; value: number; pct: number; fill: string; ticker: string | null; holding: HoldingRow | null
  }> = top.map((h, i) => ({
    name: h.ticker ?? h.nameOfIssuer.split(' ')[0],
    fullName: h.nameOfIssuer,
    value: h.value,
    pct: total > 0 ? Math.round((h.value / total) * 1000) / 10 : 0,
    fill: COLORS[i % COLORS.length],
    ticker: h.ticker,
    holding: h,
  }))

  if (otherValue > 0) {
    data.push({
      name: 'Other',
      fullName: `${sorted.length - topN} other positions`,
      value: otherValue,
      pct: total > 0 ? Math.round((otherValue / total) * 1000) / 10 : 0,
      fill: '#374151',
      ticker: null,
      holding: null,
    })
  }

  return data
}

export default function BucketChart({ buckets, holdings, topN = 10, onPositionClick }: Props) {
  const [mode, setMode] = useState<Mode>('buckets')

  const data = mode === 'buckets'
    ? buildBucketData(buckets, topN)
    : buildPositionData(holdings, topN)

  const totalLabel = mode === 'buckets'
    ? `${data.length} sectors · ${fmtVal(buckets.reduce((a, b) => a + b.value_thousands, 0))}`
    : `top ${Math.min(holdings.length, topN)} of ${holdings.length} positions`

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      padding: '16px 20px',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {mode === 'buckets' ? 'Bucket Allocation' : 'Position Allocation'}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{totalLabel}</span>

          {/* Toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--surface-hi)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}>
            {(['buckets', 'positions'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: '3px 9px',
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  background: mode === m ? 'var(--border)' : 'transparent',
                  color: mode === m ? 'var(--text-1)' : 'var(--text-3)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textTransform: 'uppercase',
                }}
              >
                {m === 'buckets' ? 'Sectors' : 'Positions'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart + Legend */}
      <div className="bucket-chart-layout">
        <div className="bucket-pie" style={{ flex: '0 0 180px' }}>
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={52}
                outerRadius={78}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
                style={{ cursor: mode === 'positions' && onPositionClick ? 'pointer' : 'default' }}
                onClick={mode === 'positions' && onPositionClick
                  ? (entry) => { if (entry?.ticker && entry?.holding) onPositionClick(entry.ticker, entry.holding) }
                  : undefined
                }
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: number) => [fmtVal(val), 'Value']}
                labelFormatter={(label) => {
                  const item = data.find(d => d.name === label)
                  return item && 'fullName' in item ? item.fullName : label
                }}
                contentStyle={{
                  background: 'var(--surface-hi)',
                  border: '1px solid var(--border)',
                  fontSize: 11,
                  color: 'var(--text-1)',
                }}
                itemStyle={{ color: 'var(--text-1)' }}
                labelStyle={{ color: 'var(--text-2)', fontWeight: 600 }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          maxHeight: 180,
          overflowY: 'auto',
        }}>
          {data.map((d) => {
            const pd = d as { name: string; ticker?: string | null; holding?: HoldingRow | null }
            const clickable = mode === 'positions' && onPositionClick && pd.ticker && pd.holding
            return (
              <div
                key={d.name}
                onClick={clickable ? () => onPositionClick!(pd.ticker!, pd.holding!) : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  cursor: clickable ? 'pointer' : 'default',
                  padding: '2px 4px',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (clickable) e.currentTarget.style.background = 'var(--surface-hi)' }}
                onMouseLeave={e => { if (clickable) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{
                  width: 7, height: 7,
                  background: d.fill, flexShrink: 0,
                }} />
                <span style={{
                  color: 'var(--text-2)',
                  fontSize: 11,
                  flex: 1,
                  fontFamily: mode === 'positions' ? 'var(--mono)' : 'var(--font)',
                  fontWeight: mode === 'positions' ? 600 : 400,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {d.name}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-1)' }}>
                  {fmtVal(d.value)}
                </span>
                <span style={{
                  fontFamily: 'var(--mono)',
                  fontSize: 10,
                  color: 'var(--text-3)',
                  minWidth: 36,
                  textAlign: 'right',
                }}>
                  {d.pct}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
