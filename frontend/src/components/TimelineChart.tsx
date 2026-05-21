import {
  ComposedChart,
  Area,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts'
import type { HistoryResponse } from '../types'

interface Props {
  data: HistoryResponse
}

function fmtBillions(thousands: number): string {
  const b = thousands / 1_000_000
  if (b >= 1) return `$${b.toFixed(1)}B`
  const m = thousands / 1_000
  return `$${m.toFixed(0)}M`
}

function fmtAxis(v: number): string {
  if (v >= 1) return `$${v.toFixed(0)}B`
  return `$${(v * 1000).toFixed(0)}M`
}

interface ChartRow {
  quarter: string
  exposureBillions: number
  advBillions: number | null
  shares_pct: number
  calls_pct: number
  puts_pct: number
}

function buildChartRows(data: HistoryResponse): ChartRow[] {
  const advByQuarter = Object.fromEntries(
    data.annotations
      .filter(a => a.value_billions != null)
      .map(a => [a.quarter, a.value_billions!]),
  )
  return data.points.map(p => ({
    quarter: p.quarter,
    exposureBillions: p.total_thousands / 1_000_000,
    advBillions: advByQuarter[p.quarter] ?? null,
    shares_pct: p.shares_pct,
    calls_pct: p.calls_pct,
    puts_pct: p.puts_pct,
  }))
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartRow }> }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div style={{
      background: 'var(--surface-2, #1a1f2e)',
      border: '1px solid var(--border)',
      borderRadius: 4,
      padding: '8px 12px',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--text-1)', fontWeight: 600, marginBottom: 4 }}>{row.quarter}</div>
      <div style={{ color: '#38bdf8' }}>13F Notional: {fmtBillions(row.exposureBillions * 1_000_000)}</div>
      {row.advBillions != null && (
        <div style={{ color: '#fbbf24' }}>Regulatory AUM: ${row.advBillions.toFixed(1)}B</div>
      )}
      <div style={{ color: 'var(--text-3)', marginTop: 4, fontSize: 11 }}>
        Shares {row.shares_pct}% · Calls {row.calls_pct}% · Puts {row.puts_pct}%
      </div>
    </div>
  )
}

export default function TimelineChart({ data }: Props) {
  const rows = buildChartRows(data)

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Portfolio Development — 13F Exposure
        </span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {data.performance_badges.map(b => (
            <span key={b.label} style={{
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 3,
              background: 'rgba(34, 197, 94, 0.12)',
              color: 'var(--green)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
            }}>
              {b.label} +{b.return_pct}%
              {b.benchmark && (
                <span style={{ color: 'var(--text-3)', marginLeft: 4 }}>({b.benchmark})</span>
              )}
            </span>
          ))}
        </div>
      </div>

      <div style={{ padding: '12px 8px 4px', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="quarter"
              tick={{ fill: 'var(--text-3)', fontSize: 11 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={fmtAxis}
              tick={{ fill: 'var(--text-3)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: 'var(--text-3)' }}
              iconType="circle"
              iconSize={8}
            />
            <Area
              type="monotone"
              dataKey="exposureBillions"
              name="13F Notional"
              stroke="#38bdf8"
              fill="rgba(56, 189, 248, 0.15)"
              strokeWidth={2}
              dot={{ r: 4, fill: '#38bdf8', strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
            {rows.some(r => r.advBillions != null) && (
              <Scatter
                dataKey="advBillions"
                name="Regulatory AUM"
                fill="#fbbf24"
                line={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {data.annotations.length > 0 && (
        <div style={{
          padding: '8px 18px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px 16px',
        }}>
          {data.annotations.map(a => (
            <span key={a.quarter + a.kind} style={{ fontSize: 11, color: 'var(--text-3)' }}>
              <span style={{ color: 'var(--text-2)' }}>{a.quarter}</span>
              {' · '}{a.label}: {a.detail}
            </span>
          ))}
        </div>
      )}

      <div style={{
        padding: '8px 18px 12px',
        fontSize: 11,
        color: 'var(--text-3)',
        lineHeight: 1.5,
        fontStyle: 'italic',
      }}>
        {data.disclaimer}
      </div>
    </div>
  )
}
