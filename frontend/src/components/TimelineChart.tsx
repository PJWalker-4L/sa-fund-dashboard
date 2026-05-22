import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { HistoryResponse } from '../types'

const CHART_W = 860
const CHART_H = 220
const ML = 52
const MR = 16
const MT = 16
const MB = 32
const PW = CHART_W - ML - MR
const PH = CHART_H - MT - MB

const C_SHARES = '#00c8e0'
const C_CALLS  = '#3ab0ff'
const C_PUTS   = '#f97316'

interface ChartRow {
  quarter: string
  exposureBillions: number
  advBillions: number | null
  shares_pct: number
  calls_pct: number
  puts_pct: number
}

function buildRows(data: HistoryResponse): ChartRow[] {
  const advMap = Object.fromEntries(
    data.annotations.filter(a => a.value_billions != null).map(a => [a.quarter, a.value_billions!]),
  )
  return data.points.map(p => ({
    quarter: p.quarter,
    exposureBillions: p.total_thousands / 1_000_000,
    advBillions: advMap[p.quarter] ?? null,
    shares_pct: p.shares_pct,
    calls_pct: p.calls_pct,
    puts_pct: p.puts_pct,
  }))
}

function fmtVal(thousands: number): string {
  const b = thousands / 1_000_000
  if (b >= 1) return `$${b.toFixed(1)}B`
  return `$${(thousands / 1_000).toFixed(0)}M`
}

function fmtTick(v: number): string {
  if (v >= 1) return `$${v.toFixed(0)}B`
  return `$${(v * 1000).toFixed(0)}M`
}

interface Props { data: HistoryResponse }

export default function TimelineChart({ data }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  const rows  = useMemo(() => buildRows(data), [data])
  const maxV  = useMemo(() => Math.max(...rows.map(r => r.exposureBillions)) * 1.22, [rows])
  const n     = rows.length

  const xOf  = (i: number) => ML + (i + 0.5) * (PW / n)
  const yOf  = (v: number) => MT + PH - (v / maxV) * PH
  const barW = Math.max(14, (PW / n) * 0.52)
  const baseY = MT + PH

  const ticks = [0.25, 0.5, 0.75, 1.0].map(t => t * maxV)

  const pts      = rows.map((r, i) => [xOf(i), yOf(r.exposureBillions)] as [number, number])
  const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const areaPath = linePath + ` L${pts[n - 1][0]},${baseY} L${pts[0][0]},${baseY} Z`

  const hovRow = hovered !== null ? rows[hovered] : null

  return (
    <div
      className="nexus-surface"
      style={{
        backgroundColor: 'var(--surface)',
        backgroundImage: 'var(--grid)',
        backgroundSize: '42px 42px',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        boxShadow: '0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.02)',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{
        padding: '9px 16px',
        borderBottom: '1px solid var(--border)',
        borderTop: '1px solid rgba(0,200,224,0.2)',
        background: 'linear-gradient(180deg, rgba(0,200,224,0.04) 0%, transparent 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.16em',
            textTransform: 'uppercase', color: 'var(--teal)',
            textShadow: '0 0 10px var(--teal-glow)', fontFamily: 'var(--font)',
          }}>
            Quarterly Exposure
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            {([['SH', C_SHARES], ['CALL', C_CALLS], ['PUT', C_PUTS]] as const).map(([label, color]) => (
              <span key={label} style={{
                fontSize: 8, padding: '1px 5px', fontWeight: 700,
                letterSpacing: '0.08em', fontFamily: 'var(--font)',
                border: `1px solid ${color}55`, color,
                background: `${color}18`,
              }}>{label}</span>
            ))}
          </div>
        </div>

        {data.performance_badges.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {data.performance_badges.map(b => (
              <span key={b.label} style={{
                fontSize: 9, padding: '2px 8px', fontFamily: 'var(--mono)',
                fontWeight: 600, letterSpacing: '0.04em',
                background: 'rgba(28,212,124,0.08)', color: 'var(--green)',
                border: '1px solid rgba(28,212,124,0.2)',
                textShadow: '0 0 8px rgba(28,212,124,0.3)',
              }}>
                {b.label} +{b.return_pct}%
                {b.benchmark && (
                  <span style={{ color: 'var(--text-3)', marginLeft: 4, fontWeight: 400 }}>
                    vs {b.benchmark}
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── SVG Chart ──────────────────────────────────────────── */}
      <div style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id="tl-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#00c8e0" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#00c8e0" stopOpacity="0.005" />
            </linearGradient>
            <filter id="tl-glow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="dot-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Grid lines */}
          {ticks.map((v, i) => {
            const y = yOf(v)
            return (
              <g key={i}>
                <line
                  x1={ML} y1={y} x2={CHART_W - MR} y2={y}
                  stroke="rgba(0,200,224,0.07)" strokeWidth={1} strokeDasharray="4 8"
                />
                <text
                  x={ML - 7} y={y + 3.5} textAnchor="end"
                  fill="rgba(0,200,224,0.28)" fontSize={9}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {fmtTick(v)}
                </text>
              </g>
            )
          })}

          {/* Left edge rule */}
          <line
            x1={ML} y1={MT} x2={ML} y2={baseY}
            stroke="rgba(0,200,224,0.1)" strokeWidth={1}
          />

          {/* Baseline */}
          <line
            x1={ML} y1={baseY} x2={CHART_W - MR} y2={baseY}
            stroke="rgba(0,200,224,0.18)" strokeWidth={1}
          />

          {/* Stacked bars */}
          {rows.map((r, i) => {
            const x      = xOf(i) - barW / 2
            const totalH = (r.exposureBillions / maxV) * PH
            const putsH  = (r.puts_pct  / 100) * totalH
            const callsH = (r.calls_pct / 100) * totalH
            const sharesH = (r.shares_pct / 100) * totalH
            const isHov  = hovered === i

            return (
              <g key={r.quarter} onMouseEnter={() => setHovered(i)} style={{ cursor: 'crosshair' }}>
                {/* Column highlight */}
                {isHov && (
                  <rect
                    x={x - 3} y={MT} width={barW + 6} height={PH}
                    fill="rgba(0,200,224,0.04)"
                  />
                )}

                {/* Vertical hover rule */}
                {isHov && (
                  <line
                    x1={xOf(i)} y1={MT} x2={xOf(i)} y2={baseY}
                    stroke="rgba(0,200,224,0.18)" strokeWidth={1} strokeDasharray="3 5"
                  />
                )}

                {/* Puts segment — bottom */}
                <motion.rect
                  x={x} width={barW}
                  y={baseY - putsH} height={Math.max(0, putsH)}
                  fill={isHov ? 'rgba(249,115,22,0.32)' : 'rgba(249,115,22,0.18)'}
                  stroke="rgba(249,115,22,0.55)" strokeWidth={0.5}
                  style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.75, delay: i * 0.09, ease: [0.23, 1, 0.32, 1] }}
                />

                {/* Calls segment — middle */}
                <motion.rect
                  x={x} width={barW}
                  y={baseY - putsH - callsH} height={Math.max(0, callsH)}
                  fill={isHov ? 'rgba(58,176,255,0.32)' : 'rgba(58,176,255,0.18)'}
                  stroke="rgba(58,176,255,0.55)" strokeWidth={0.5}
                  style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.75, delay: i * 0.09 + 0.06, ease: [0.23, 1, 0.32, 1] }}
                />

                {/* Shares segment — top */}
                <motion.rect
                  x={x} width={barW}
                  y={baseY - totalH} height={Math.max(0, sharesH)}
                  fill={isHov ? 'rgba(0,200,224,0.28)' : 'rgba(0,200,224,0.14)'}
                  stroke="rgba(0,200,224,0.5)" strokeWidth={0.5}
                  style={{ transformBox: 'fill-box', transformOrigin: '50% 100%' }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.75, delay: i * 0.09 + 0.12, ease: [0.23, 1, 0.32, 1] }}
                />

                {/* Top value label on hover */}
                {isHov && (
                  <text
                    x={xOf(i)} y={baseY - totalH - 6}
                    textAnchor="middle" fill="#00c8e0"
                    fontSize={9} fontFamily="JetBrains Mono, monospace" fontWeight="600"
                  >
                    {fmtVal(r.exposureBillions * 1_000_000)}
                  </text>
                )}
              </g>
            )
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#tl-area)" />

          {/* Glow line */}
          <path
            d={linePath} fill="none"
            stroke="rgba(0,200,224,0.35)" strokeWidth={4}
            filter="url(#tl-glow)"
            strokeLinecap="round" strokeLinejoin="round"
          />
          {/* Crisp line */}
          <path
            d={linePath} fill="none"
            stroke="#00c8e0" strokeWidth={1.5}
            strokeLinecap="round" strokeLinejoin="round"
          />

          {/* ADV dots */}
          {rows.map((r, i) => r.advBillions != null && (
            <g key={`adv-${i}`}>
              <circle cx={xOf(i)} cy={yOf(r.advBillions)} r={4}
                fill="none" stroke="rgba(251,191,36,0.35)" strokeWidth={4}
              />
              <circle cx={xOf(i)} cy={yOf(r.advBillions)} r={3}
                fill="#fbbf24"
              />
            </g>
          ))}

          {/* Data point dots */}
          {rows.map((r, i) => (
            <circle
              key={r.quarter}
              cx={xOf(i)} cy={yOf(r.exposureBillions)}
              r={hovered === i ? 5 : 3}
              fill={hovered === i ? '#00c8e0' : 'var(--surface)'}
              stroke="#00c8e0" strokeWidth={1.5}
              filter={hovered === i ? 'url(#dot-glow)' : undefined}
              style={{ transition: 'r 0.15s ease, fill 0.15s ease' }}
            />
          ))}

          {/* Pulsing ring on latest point */}
          <motion.circle
            cx={xOf(n - 1)} cy={yOf(rows[n - 1].exposureBillions)}
            r={10} fill="none" stroke="rgba(0,200,224,0.35)" strokeWidth={1}
            animate={{ r: [7, 13, 7], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* X-axis labels */}
          {rows.map((r, i) => (
            <text
              key={r.quarter}
              x={xOf(i)} y={CHART_H - 7}
              textAnchor="middle"
              fill={hovered === i ? 'rgba(0,200,224,0.9)' : 'rgba(0,200,224,0.3)'}
              fontSize={9} fontFamily="JetBrains Mono, monospace"
              style={{ transition: 'fill 0.15s' }}
            >
              {r.quarter}
            </text>
          ))}
        </svg>

        {/* ── Hover tooltip ── */}
        {hovRow !== null && hovered !== null && (
          <div style={{
            position: 'absolute',
            top: 8,
            ...(xOf(hovered) / CHART_W > 0.62
              ? { right: 16 }
              : { left: `calc(${(xOf(hovered) / CHART_W) * 100}% + 14px)` }),
            background: 'rgba(2,8,18,0.97)',
            border: '1px solid rgba(0,200,224,0.22)',
            padding: '9px 13px',
            pointerEvents: 'none',
            minWidth: 168,
            zIndex: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,200,224,0.05)',
          }}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 10,
              color: 'var(--teal)', fontWeight: 700,
              letterSpacing: '0.14em', marginBottom: 5,
            }}>
              {hovRow.quarter}
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 18,
              color: 'var(--text-1)', fontWeight: 600,
              lineHeight: 1, marginBottom: 8,
              textShadow: '0 0 14px rgba(0,200,224,0.2)',
            }}>
              {fmtVal(hovRow.exposureBillions * 1_000_000)}
            </div>
            {hovRow.advBillions != null && (
              <div style={{
                fontFamily: 'var(--mono)', fontSize: 10,
                color: '#fbbf24', marginBottom: 7,
                letterSpacing: '0.05em',
              }}>
                ADV ${hovRow.advBillions.toFixed(1)}B
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {([
                ['SHARES', hovRow.shares_pct, C_SHARES],
                ['CALLS',  hovRow.calls_pct,  C_CALLS],
                ['PUTS',   hovRow.puts_pct,   C_PUTS],
              ] as const).map(([label, pct, color]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{
                    fontSize: 8, color, fontFamily: 'var(--font)',
                    fontWeight: 700, letterSpacing: '0.1em', width: 34,
                  }}>{label}</span>
                  <div style={{
                    flex: 1, height: 2,
                    background: 'rgba(255,255,255,0.06)',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{
                      position: 'absolute', top: 0, left: 0,
                      height: '100%', width: `${pct}%`,
                      background: color, opacity: 0.75,
                    }} />
                  </div>
                  <span style={{
                    fontSize: 9, color,
                    fontFamily: 'var(--mono)', width: 28, textAlign: 'right',
                  }}>{pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Annotations ─────────────────────────────────────────── */}
      {data.annotations.length > 0 && (
        <div style={{
          padding: '6px 16px',
          borderTop: '1px solid var(--border)',
          display: 'flex', flexWrap: 'wrap', gap: '3px 14px',
        }}>
          {data.annotations.map(a => (
            <span key={a.quarter + a.kind} style={{
              fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--font)',
            }}>
              <span style={{ color: 'rgba(0,200,224,0.45)' }}>{a.quarter}</span>
              {' · '}{a.label}: {a.detail}
            </span>
          ))}
        </div>
      )}

      {/* ── Disclaimer ──────────────────────────────────────────── */}
      <div style={{
        padding: '4px 16px 10px',
        fontSize: 9, color: 'var(--text-3)',
        fontFamily: 'var(--font)', opacity: 0.55, lineHeight: 1.45,
      }}>
        {data.disclaimer}
      </div>
    </div>
  )
}
