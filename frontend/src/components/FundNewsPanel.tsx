import { useEffect, useMemo, useState } from 'react'
import type { FundNewsResponse, FundNewsItem } from '../types'

interface Props {
  data: FundNewsResponse
  onTickerClick?: (ticker: string) => void
}

type NewsTab = 'keyword' | 'sec' | 'holding'

const PAGE_SIZE = 10

const TABS: { id: NewsTab; label: string }[] = [
  { id: 'keyword', label: 'Presse' },
  { id: 'sec', label: 'SEC-Nachrichten' },
  { id: 'holding', label: 'Holdings-News' },
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
        padding: '12px 18px',
        borderBottom: '1px solid var(--border)',
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
                borderRadius: 3,
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
      <div style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.5, marginBottom: 4 }}>
        {item.title}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-3)', display: 'flex', gap: 8 }}>
        <span>{item.publisher}</span>
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
          Fund News Feed
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
          {filtered.length} article{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div style={{
        padding: '8px 18px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
      }}>
        {TABS.map(t => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => selectTab(t.id)}
              style={{
                fontSize: 11,
                padding: '5px 12px',
                borderRadius: 4,
                border: `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
                background: active ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                color: active ? 'var(--blue)' : 'var(--text-2)',
                cursor: 'pointer',
                fontWeight: active ? 600 : 400,
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
              borderRadius: 4,
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
                borderRadius: 4,
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
              borderRadius: 4,
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
