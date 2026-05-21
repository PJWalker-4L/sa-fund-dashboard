import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCompany } from '../api'
import type { HoldingRow } from '../types'

interface Props {
  ticker: string | null
  holding: HoldingRow | null
  totalAum: number
  onClose: () => void
}

function fmt(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}B`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}M`
  return `$${v.toFixed(0)}K`
}

function fmtDate(ts: number): string {
  if (!ts) return ''
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function Skeleton({ width = '100%', height = 12 }: { width?: string; height?: number }) {
  return (
    <div className="pulse" style={{
      width, height,
      background: 'var(--border)',
      display: 'inline-block',
    }} />
  )
}

export default function CompanyDrawer({ ticker, holding, totalAum, onClose }: Props) {
  const isOpen = ticker !== null && ticker.trim() !== ''

  const { data, isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['company', ticker],
    queryFn: () => fetchCompany(ticker!),
    enabled: isOpen,
    staleTime: 24 * 60 * 60_000,
    retry: 1,
  })

  const loading = isPending || isFetching

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const pct = holding && totalAum > 0
    ? Math.round((holding.value / totalAum) * 1000) / 10
    : null

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 40,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.2s ease',
        }}
      />

      {/* Drawer */}
      <div className="drawer-panel" style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.25s ease',
        overflowY: 'auto',
      }}>

        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexShrink: 0,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16, color: 'var(--blue)' }}>
                {ticker ?? '—'}
              </span>
              {holding?.putCall && (
                <span style={{
                  fontSize: 9, padding: '1px 6px',
                  background: 'rgba(56,189,248,0.15)', color: 'var(--blue)',
                  fontWeight: 700, letterSpacing: '0.05em',
                }}>
                  {holding.putCall.toUpperCase()}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>
              {loading ? <Skeleton width="160px" /> : (data?.name ?? ticker)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-3)', cursor: 'pointer',
              fontSize: 18, lineHeight: 1, padding: '2px 4px',
              marginTop: -2,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Position Stats */}
        {holding && (
          <div style={{
            display: 'flex', gap: 0,
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}>
            {[
              { label: 'Value', value: fmt(holding.value) },
              { label: 'Weight', value: pct != null ? `${pct}%` : '—' },
              { label: 'Shares', value: holding.sshPrnamt >= 1e6 ? `${(holding.sshPrnamt / 1e6).toFixed(2)}M` : `${(holding.sshPrnamt / 1e3).toFixed(1)}K` },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, padding: '10px 14px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>
                  {s.label}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                  {s.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Sector / Industry */}
        {isError && (
          <div style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border)',
            fontSize: 12,
            color: 'var(--red)',
            lineHeight: 1.5,
          }}>
            Unternehmensdaten konnten nicht geladen werden.
            {error instanceof Error ? ` (${error.message})` : ''}
            <button
              onClick={() => refetch()}
              style={{
                display: 'block', marginTop: 8,
                padding: '4px 10px', fontSize: 11, fontWeight: 600,
                background: 'transparent', color: 'var(--blue)',
                border: '1px solid var(--border)', cursor: 'pointer',
              }}
            >
              Erneut versuchen
            </button>
          </div>
        )}
        <div style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>Sector</div>
            <div style={{ fontSize: 12, color: 'var(--text-1)' }}>
              {loading ? <Skeleton width="80px" /> : (data?.sector ?? '—')}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 3 }}>Industry</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
              {loading ? <Skeleton width="100px" /> : (data?.industry ?? '—')}
            </div>
          </div>
        </div>

        {/* About */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            About
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skeleton width="100%" height={10} />
              <Skeleton width="90%" height={10} />
              <Skeleton width="95%" height={10} />
              <Skeleton width="80%" height={10} />
            </div>
          ) : (
            <p style={{
              fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7,
              margin: 0,
            }}>
              {data?.summary || 'No description available.'}
            </p>
          )}
          {!loading && data?.website && (
            <a
              href={data.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block', marginTop: 8,
                fontSize: 11, color: 'var(--blue)',
                textDecoration: 'none',
              }}
            >
              {data.website.replace(/^https?:\/\//, '')} ↗
            </a>
          )}
        </div>

        {/* News */}
        <div style={{ padding: '14px 18px', flex: 1 }}>
          <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
            Top News
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ padding: '10px 12px', background: 'var(--surface-hi)'}}>
                  <Skeleton width="90%" height={10} />
                  <div style={{ marginTop: 6 }}><Skeleton width="50%" height={9} /></div>
                </div>
              ))}
            </div>
          ) : !data?.news.length ? (
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>No recent news available.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {data.news.map((n, i) => (
                <a
                  key={i}
                  href={n.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'block',
                    padding: '10px 12px',
                    background: 'var(--surface-hi)',
                    border: '1px solid var(--border)',
                    textDecoration: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--blue)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.5, marginBottom: 5 }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', gap: 8 }}>
                    <span>{n.publisher}</span>
                    {n.published > 0 && <span>· {fmtDate(n.published)}</span>}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
