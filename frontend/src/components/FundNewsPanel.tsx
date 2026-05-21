import { useEffect, useMemo, useState } from 'react'
import type { FundNewsResponse, FundNewsItem } from '../types'

interface Props {
  data: FundNewsResponse
  onTickerClick?: (ticker: string) => void
}

type NewsTab = 'keyword' | 'sec' | 'holding'

const PAGE_SIZE = 10

const TABS: { id: NewsTab; label: string }[] = [
  { id: 'keyword', label: 'Press' },
  { id: 'sec', label: 'SEC News' },
  { id: 'holding', label: 'Holdings News' },
]

function fmtDate(ts: number): string {
  if (!ts) return ''
  return new Date(ts * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function NewsRow({ item, onTickerClick }: {
  item: FundNewsItem
  onTickerClick?: (ticker: string) => void
}) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'block',
        padding: '10px 16px',
        borderBottom: '1px solid rgba(17,34,56,0.8)',
        textDecoration: 'none',
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hi)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {(item.ticker) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
          {item.ticker && onTickerClick ? (
            <button
              type="button"
              onClick={e => { e.preventDefault(); e.stopPropagation(); onTickerClick(item.ticker!) }}
              style={{
                fontSize: 9,
                padding: '1px 5px',
                fontWeight: 700,
                background: 'var(--surface-hi)',
                color: 'var(--blue)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              {item.ticker}
            </button>
          ) : item.ticker ? (
            <span style={{ fontSize: 9, color: 'var(--blue)', fontWeight: 700 }}>{item.ticker}</span>
          ) : null}
        </div>
      )}
      <div style={{ fontSize: 11, color: 'var(--text-1)', lineHeight: 1.45, marginBottom: 4, fontFamily: 'var(--font)', fontWeight: 500 }}>
        {item.title}
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-3)', display: 'flex', gap: 6, fontFamily: 'var(--font)', letterSpacing: '0.04em' }}>
        <span style={{ color: 'var(--text-2)' }}>{item.publisher}</span>
        {item.published > 0 && <span>· {fmtDate(item.published)}</span>}
      </div>
    </a>
  )
}

export default function FundNewsPanel({ data, onTickerClick }: Props) {
  const [tab, setTab] = useState<NewsTab>('keyword')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return data.items
      .filter(i => i.source === tab)
      .sort((a, b) => b.published - a.published)
  }, [data.items, tab])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  function selectTab(next: NewsTab) {
    setTab(next)
    setPage(1)
  }

  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      backgroundImage: 'var(--grid)',
      backgroundSize: '42px 42px',
      border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '9px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(180deg, rgba(0,200,224,0.04) 0%, transparent 100%)',
        borderTop: '1px solid rgba(0,200,224,0.2)',
      }}>
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--teal)',
          textShadow: '0 0 10px var(--teal-glow)',
          fontFamily: 'var(--font)',
        }}>
          Fund News Feed
        </span>
        <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
          {filtered.length} articles
        </span>
      </div>

      <div style={{
        padding: '8px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: 6,
      }}>
        {TABS.map(t => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              style={{
                fontSize: 9,
                padding: '4px 10px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                fontFamily: 'var(--font)',
                border: `1px solid ${active ? 'var(--teal)' : 'var(--border-hi)'}`,
                background: active ? 'rgba(0,200,224,0.08)' : 'transparent',
                color: active ? 'var(--teal)' : 'var(--text-3)',
                cursor: 'pointer',
                textTransform: 'uppercase',
                boxShadow: active ? '0 0 8px rgba(0,200,224,0.15)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      <div>
        {pageItems.length === 0 ? (
          <div style={{ padding: 16, fontSize: 12, color: 'var(--text-3)' }}>
            No articles in this category.
          </div>
        ) : (
          pageItems.map(item => (
            <NewsRow
              key={`${item.source}-${item.link}-${item.published}`}
              item={item}
              onTickerClick={onTickerClick}
            />
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          flexWrap: 'wrap',
        }}>
          <button
            type="button"
            disabled={currentPage <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{
              fontSize: 11,
              padding: '4px 10px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: currentPage <= 1 ? 'var(--text-3)' : 'var(--text-2)',
              cursor: currentPage <= 1 ? 'default' : 'pointer',
            }}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              style={{
                fontSize: 11,
                minWidth: 28,
                padding: '4px 8px',
                border: `1px solid ${p === currentPage ? 'var(--blue)' : 'var(--border)'}`,
                background: p === currentPage ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                color: p === currentPage ? 'var(--blue)' : 'var(--text-2)',
                cursor: 'pointer',
                fontWeight: p === currentPage ? 600 : 400,
              }}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            style={{
              fontSize: 11,
              padding: '4px 10px',
              border: '1px solid var(--border)',
              background: 'transparent',
              color: currentPage >= totalPages ? 'var(--text-3)' : 'var(--text-2)',
              cursor: currentPage >= totalPages ? 'default' : 'pointer',
            }}
          >
            ›
          </button>
        </div>
      )}
    </div>
  )
}
