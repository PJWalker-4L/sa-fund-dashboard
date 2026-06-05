import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import type { BucketAllocation, HoldingRow } from '../types'

interface Props {
  buckets: BucketAllocation[]
  holdings: HoldingRow[]
  topN?: number
  onPositionClick?: (ticker: string, holding: HoldingRow) => void
  selectedBucket?: string | null
  onBucketSelect?: (bucket: string | null) => void
}

type Mode = 'buckets' | 'positions'

const COLORS = ['#38bdf8', '#f97316', '#22c55e', '#fbbf24', '#a78bfa', '#2dd4bf', '#f472b6', '#94a3b8', '#fb7185', '#34d399', '#818cf8', '#facc15']

function fmtVal(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}B`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}M`
  return `$${v.toFixed(0)}K`
}

function instrumentLabel(putCall: string | null | undefined): string {
  if (putCall === 'Put') return 'PUT'
  if (putCall === 'Call') return 'CALL'
  return 'SHARE'
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

function bucketColor(bucketName: string, buckets: BucketAllocation[]): string {
  const idx = buckets.findIndex(b => b.label === bucketName)
  return COLORS[(idx >= 0 ? idx : 0) % COLORS.length]
}

export default function BucketChart({
  buckets,
  holdings,
  topN = 10,
  onPositionClick,
  selectedBucket = null,
  onBucketSelect,
}: Props) {
  const [mode, setMode] = useState<Mode>('buckets')

  const bucketData = useMemo(() => buildBucketData(buckets, topN), [buckets, topN])
  const positionData = useMemo(() => buildPositionData(holdings, topN), [holdings, topN])
  const data = mode === 'buckets' ? bucketData : positionData

  const drillHoldings = useMemo(() => {
    if (!selectedBucket || mode !== 'buckets') return []
    return holdings
      .filter(h => (h.bucket ?? 'Other') === selectedBucket)
      .sort((a, b) => b.value - a.value)
  }, [holdings, selectedBucket, mode])

  const drillTotal = drillHoldings.reduce((s, h) => s + h.value, 0)
  const sectorFill = selectedBucket ? bucketColor(selectedBucket, buckets) : null

  useEffect(() => {
    if (!selectedBucket) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onBucketSelect?.(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedBucket, onBucketSelect])

  function handleModeChange(next: Mode) {
    setMode(next)
    if (next === 'positions') onBucketSelect?.(null)
  }

  function toggleBucket(name: string) {
    onBucketSelect?.(selectedBucket === name ? null : name)
  }

  function handlePieClick(entry: { name?: string; ticker?: string | null; holding?: HoldingRow | null }) {
    if (mode === 'buckets' && entry?.name) {
      toggleBucket(entry.name)
      return
    }
    if (mode === 'positions' && onPositionClick && entry?.ticker && entry?.holding) {
      onPositionClick(entry.ticker, entry.holding)
    }
  }

  const totalLabel = mode === 'buckets'
    ? selectedBucket
      ? `${drillHoldings.length} positions · ${fmtVal(drillTotal)}`
      : `${data.length} sectors · ${fmtVal(buckets.reduce((a, b) => a + b.value_thousands, 0))}`
    : `top ${Math.min(holdings.length, topN)} of ${holdings.length} positions`

  const pieCursor = (mode === 'buckets' && onBucketSelect) || (mode === 'positions' && onPositionClick)
    ? 'pointer'
    : 'default'

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      padding: '16px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {selectedBucket && mode === 'buckets' ? (
            <>
              <button
                type="button"
                onClick={() => onBucketSelect?.(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--teal)',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font)',
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                ← All sectors
              </button>
              <span style={{ color: 'var(--border-hi)', fontSize: 10 }}>·</span>
              <span style={{
                fontSize: 11,
                color: 'var(--text-1)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {selectedBucket}
              </span>
            </>
          ) : (
            <span style={{ fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {mode === 'buckets' ? 'Bucket Allocation' : 'Position Allocation'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{totalLabel}</span>
          <div style={{
            display: 'flex',
            background: 'var(--surface-hi)',
            border: '1px solid var(--border)',
            overflow: 'hidden',
          }}>
            {(['buckets', 'positions'] as Mode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => handleModeChange(m)}
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
                style={{ cursor: pieCursor }}
                onClick={(_, index) => {
                  const entry = data[index]
                  if (entry) handlePieClick(entry as { name: string; ticker?: string | null; holding?: HoldingRow | null })
                }}
              >
                {data.map((d, i) => {
                  const dimmed = mode === 'buckets' && selectedBucket && d.name !== selectedBucket
                  const active = mode === 'buckets' && selectedBucket === d.name
                  return (
                    <Cell
                      key={i}
                      fill={d.fill}
                      fillOpacity={dimmed ? 0.28 : 1}
                      stroke={active ? 'var(--teal)' : 'transparent'}
                      strokeWidth={active ? 1.5 : 0}
                    />
                  )
                })}
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

        <div className="bucket-legend">
          {selectedBucket && mode === 'buckets' ? (
            <>
              <div className="bucket-legend-row bucket-legend-header bucket-legend-row--drill">
                <span />
                <span>Position</span>
                <span>Value</span>
                <span>% sector</span>
                <span>Type</span>
              </div>
              {drillHoldings.length === 0 ? (
                <div style={{ padding: '8px 4px', fontSize: 13, color: 'var(--text-3)' }}>
                  No positions in this sector.
                </div>
              ) : (
                drillHoldings.map(h => {
                  const pct = drillTotal > 0 ? Math.round((h.value / drillTotal) * 1000) / 10 : 0
                  const label = h.ticker ?? h.nameOfIssuer.split(' ').slice(0, 2).join(' ')
                  const clickable = Boolean(onPositionClick && h.ticker)
                  return (
                    <div
                      key={`${h.cusip}_${h.putCall ?? 'SHARE'}`}
                      className="bucket-legend-row bucket-legend-row--drill"
                      role={clickable ? 'button' : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      onClick={clickable ? () => onPositionClick!(h.ticker!, h) : undefined}
                      onKeyDown={clickable ? e => { if (e.key === 'Enter') onPositionClick!(h.ticker!, h) } : undefined}
                      style={{ cursor: clickable ? 'pointer' : 'default' }}
                    >
                      <span className="bucket-legend-swatch" style={{ background: sectorFill ?? 'var(--text-3)' }} />
                      <span className="bucket-legend-label bucket-legend-label--mono" title={h.nameOfIssuer}>
                        {label}
                      </span>
                      <span className="bucket-legend-value">{fmtVal(h.value)}</span>
                      <span className="bucket-legend-pct">{pct}%</span>
                      <span className="bucket-legend-type">{instrumentLabel(h.putCall)}</span>
                    </div>
                  )
                })
              )}
            </>
          ) : (
            <>
              <div className="bucket-legend-row bucket-legend-header">
                <span />
                <span>Sector</span>
                <span>Value</span>
                <span>%</span>
              </div>
              {data.map((d) => {
                const pd = d as { name: string; ticker?: string | null; holding?: HoldingRow | null }
                const clickable = mode === 'positions' && onPositionClick && pd.ticker && pd.holding
                const bucketClickable = mode === 'buckets' && onBucketSelect
                const active = mode === 'buckets' && selectedBucket === d.name
                return (
                  <div
                    key={d.name}
                    className={`bucket-legend-row${active ? ' bucket-legend-row--active' : ''}`}
                    role={clickable || bucketClickable ? 'button' : undefined}
                    tabIndex={clickable || bucketClickable ? 0 : undefined}
                    onClick={() => {
                      if (bucketClickable && mode === 'buckets') toggleBucket(d.name)
                      else if (clickable) onPositionClick!(pd.ticker!, pd.holding!)
                    }}
                    onKeyDown={e => {
                      if (e.key !== 'Enter') return
                      if (bucketClickable && mode === 'buckets') toggleBucket(d.name)
                      else if (clickable) onPositionClick!(pd.ticker!, pd.holding!)
                    }}
                    style={{ cursor: clickable || bucketClickable ? 'pointer' : 'default' }}
                  >
                    <span className="bucket-legend-swatch" style={{ background: d.fill }} />
                    <span
                      className={`bucket-legend-label${mode === 'positions' ? ' bucket-legend-label--mono' : ''}`}
                      title={'fullName' in d ? String(d.fullName) : d.name}
                    >
                      {d.name}
                    </span>
                    <span className="bucket-legend-value">{fmtVal(d.value)}</span>
                    <span className="bucket-legend-pct">{d.pct}%</span>
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
