import type { MoversResponse, MoverItem } from '../types'

interface Props {
  data: MoversResponse
  onTickerClick?: (ticker: string) => void
}

function abbrev(name: string, max = 16): string {
  const words = name.split(' ')
  if (words.length >= 2 && name.length > max) return words[0].slice(0, max)
  return name.slice(0, max)
}

function MoverRow({ item, isGainer, onTickerClick }: { item: MoverItem; isGainer: boolean; onTickerClick?: (t: string) => void }) {
  const color = isGainer ? 'var(--green)' : 'var(--red)'
  const sign = isGainer ? '+' : ''
  const typeLabel = item.putCall ? item.putCall.slice(0, 4).toUpperCase() : 'SH'
  const clickable = !!(item.ticker && onTickerClick)

  return (
    <div
      onClick={clickable ? () => onTickerClick!(item.ticker!) : undefined}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '5px 0',
        borderBottom: '1px solid var(--border)',
        cursor: clickable ? 'pointer' : 'default',
        borderRadius: 3,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (clickable) e.currentTarget.style.background = 'var(--surface-hi)' }}
      onMouseLeave={e => { if (clickable) e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--blue)' }}>
          {abbrev(item.issuer)}
        </span>
        <span style={{
          fontSize: 9,
          padding: '1px 5px',
          borderRadius: 3,
          background: 'var(--surface-hi)',
          color: 'var(--text-3)',
          letterSpacing: '0.05em',
        }}>
          {typeLabel}
        </span>
      </div>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color }}>
        {sign}{item.pct_change.toFixed(2)}%
      </span>
    </div>
  )
}

export default function MoversPanel({ data, onTickerClick }: Props) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 6,
      padding: '16px 20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Quarter Movers
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{data.period}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--green)', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 6 }}>
            GAINERS
          </div>
          {data.gainers.length === 0
            ? <span style={{ color: 'var(--text-3)', fontSize: 11 }}>—</span>
            : data.gainers.map((g, i) => (
                <MoverRow key={i} item={g} isGainer={true} onTickerClick={onTickerClick} />
              ))}
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--red)', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 6 }}>
            LOSERS
          </div>
          {data.losers.length === 0
            ? <span style={{ color: 'var(--text-3)', fontSize: 11 }}>—</span>
            : data.losers.map((l, i) => (
                <MoverRow key={i} item={l} isGainer={false} onTickerClick={onTickerClick} />
              ))}
        </div>
      </div>
    </div>
  )
}
