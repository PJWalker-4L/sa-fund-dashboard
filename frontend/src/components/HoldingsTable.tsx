import { useState, useMemo } from 'react'
import type { HoldingRow } from '../types'

interface Props {
  holdings: HoldingRow[]
  statusFilter: string | null
  onTickerClick?: (ticker: string) => void
}

type SortKey = 'value' | 'nameOfIssuer' | 'sshPrnamt' | 'pct_change'

const STATUS_BORDER: Record<string, string> = {
  NEW:       'var(--green)',
  CLOSED:    'var(--red)',
  INCREASED: 'var(--yellow)',
  DECREASED: 'var(--orange)',
  UNCHANGED: 'transparent',
}

function fmtValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}B`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}M`
  return `$${v.toFixed(0)}K`
}

function fmtShares(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toFixed(0)
}

function PctCell({ h }: { h: HoldingRow }) {
  if (h.status === 'NEW') return <span style={{ color: 'var(--green)', fontSize: 10, fontWeight: 700 }}>NEW</span>
  if (h.status === 'CLOSED') return <span style={{ color: 'var(--red)', fontSize: 10, fontWeight: 700 }}>CLOSED</span>
  if (h.pct_change == null) return <span style={{ color: 'var(--text-3)' }}>—</span>
  const c = h.pct_change > 0 ? 'var(--yellow)' : h.pct_change < 0 ? 'var(--orange)' : 'var(--text-3)'
  return (
    <span style={{ color: c, fontFamily: 'var(--mono)', fontSize: 12 }}>
      {h.pct_change > 0 ? '+' : ''}{h.pct_change.toFixed(1)}%
    </span>
  )
}

export default function HoldingsTable({ holdings, statusFilter, onTickerClick }: Props) {
  const totalAum = useMemo(() => holdings.reduce((s, h) => s + h.value, 0), [holdings])
  const [sortKey, setSortKey] = useState<SortKey>('value')
  const [sortDir, setSortDir] = useState<1 | -1>(-1)

  const handleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => (d === 1 ? -1 : 1))
    else { setSortKey(k); setSortDir(-1) }
  }

  const rows = useMemo(() => {
    const filtered = statusFilter
      ? holdings.filter(h => h.status === statusFilter)
      : holdings
    return [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? 0
      const bv = b[sortKey] ?? 0
      if (typeof av === 'string') return sortDir * (av as string).localeCompare(bv as string)
      return sortDir * ((av as number) - (bv as number))
    })
  }, [holdings, statusFilter, sortKey, sortDir])

  function Th({ k, label, align = 'left' }: { k: SortKey; label: string; align?: string }) {
    return (
      <th
        onClick={() => handleSort(k)}
        style={{
          padding: '8px 12px',
          textAlign: align as 'left' | 'right',
          cursor: 'pointer',
          color: sortKey === k ? 'var(--blue)' : 'var(--text-2)',
          fontSize: 10,
          letterSpacing: '0.08em',
          fontWeight: 600,
          userSelect: 'none',
          borderBottom: '1px solid var(--border)',
          whiteSpace: 'nowrap',
        }}
      >
        {label} {sortKey === k ? (sortDir === -1 ? '▼' : '▲') : ''}
      </th>
    )
  }

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
        <thead>
          <tr style={{ background: 'var(--surface)' }}>
            <th style={{ width: 3, borderBottom: '1px solid var(--border)', padding: 0 }} />
            <Th k="nameOfIssuer" label="ISSUER" />
            <th style={{ padding: '8px 12px', fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }}>
              TYPE
            </th>
            <Th k="sshPrnamt" label="SHARES" align="right" />
            <Th k="value" label="VALUE" align="right" />
            <th style={{ padding: '8px 12px', fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)', textAlign: 'right', whiteSpace: 'nowrap' }}>
              % AUM
            </th>
            <Th k="pct_change" label="Δ QoQ" align="right" />
          </tr>
        </thead>
        <tbody>
          {rows.map((h, i) => {
            const border = STATUS_BORDER[h.status ?? 'UNCHANGED'] ?? 'transparent'
            const isChanged = h.status && h.status !== 'UNCHANGED'
            return (
              <tr
                key={h.cusip + (h.putCall ?? '')}
                style={{
                  background: i % 2 === 0 ? 'var(--bg)' : 'var(--surface)',
                  borderLeft: `3px solid ${border}`,
                  opacity: h.status === 'CLOSED' ? 0.55 : 1,
                  transition: 'background 0.1s',
                }}
              >
                <td style={{ width: 3 }} />
                <td style={{ padding: '7px 12px', maxWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {h.ticker && (
                      <span
                        onClick={onTickerClick ? (e) => { e.stopPropagation(); onTickerClick(h.ticker!) } : undefined}
                        style={{
                          fontFamily: 'var(--mono)',
                          fontSize: 11,
                          fontWeight: 700,
                          color: 'var(--blue)',
                          minWidth: 36,
                          cursor: onTickerClick ? 'pointer' : 'default',
                          textDecoration: onTickerClick ? 'underline' : 'none',
                          textDecorationColor: 'rgba(56,189,248,0.4)',
                        }}
                      >
                        {h.ticker}
                      </span>
                    )}
                    <span style={{
                      fontWeight: isChanged ? 600 : 400,
                      fontSize: 12,
                      color: 'var(--text-2)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {h.nameOfIssuer}
                    </span>
                  </div>
                </td>
                <td style={{ padding: '7px 8px' }}>
                  {h.putCall ? (
                    <span style={{
                      fontSize: 10,
                      padding: '2px 6px',
                      background: h.putCall === 'Call'
                        ? 'rgba(56,189,248,0.12)'
                        : 'rgba(249,115,22,0.12)',
                      color: h.putCall === 'Call' ? 'var(--blue)' : 'var(--orange)',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                    }}>
                      {h.putCall.toUpperCase()}
                    </span>
                  ) : (
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>SHARE</span>
                  )}
                </td>
                <td style={{ padding: '7px 12px', fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'right', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                  {fmtShares(h.sshPrnamt)}
                </td>
                <td style={{ padding: '7px 12px', fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {fmtValue(h.value)}
                </td>
                <td style={{ padding: '7px 12px', fontFamily: 'var(--mono)', fontSize: 12, textAlign: 'right', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                  {totalAum > 0 ? (h.value / totalAum * 100).toFixed(1) + '%' : '—'}
                </td>
                <td style={{ padding: '7px 12px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <PctCell h={h} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
          No positions match this filter.
        </div>
      )}
    </div>
  )
}
