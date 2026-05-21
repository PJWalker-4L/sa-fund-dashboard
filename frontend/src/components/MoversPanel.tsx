import type { MoversResponse, MoverItem } from '../types'

interface Props {
  data: MoversResponse
  onTickerClick?: (ticker: string) => void
}

function abbrev(name: string, max = 18): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name
}

function MoverRow({
  item,
  isGainer,
  onTickerClick,
}: {
  item: MoverItem
  isGainer: boolean
  onTickerClick?: (t: string) => void
}) {
  const color = isGainer ? 'var(--green)' : 'var(--red)'
  const sign = isGainer ? '+' : ''
  const typeLabel = item.putCall ? item.putCall.slice(0, 4).toUpperCase() : 'SH'
  const clickable = !!(item.ticker && onTickerClick)

  const badgeStyle: React.CSSProperties = item.putCall === 'Put'
    ? { background: 'rgba(249,115,22,0.1)', color: 'var(--orange)', border: '1px solid rgba(249,115,22,0.25)' }
    : item.putCall === 'Call'
    ? { background: 'rgba(48,184,245,0.1)', color: 'var(--blue)', border: '1px solid rgba(48,184,245,0.25)' }
    : { background: 'var(--surface-hi)', color: 'var(--text-3)', border: '1px solid var(--border)' }

  return (
    <div
      onClick={clickable ? () => onTickerClick!(item.ticker!) : undefined}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '5px 0',
        borderBottom: '1px solid rgba(17,34,56,0.8)',
        cursor: clickable ? 'pointer' : 'default',
        transition: 'background 0.1s',
        gap: 6,
      }}
      onMouseEnter={e => { if (clickable) (e.currentTarget as HTMLElement).style.background = 'var(--surface-hi)' }}
      onMouseLeave={e => { if (clickable) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--text-1)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {abbrev(item.issuer)}
        </span>
        <span style={{ fontSize: 8, padding: '1px 4px', flexShrink: 0, ...badgeStyle }}>
          {typeLabel}
        </span>
      </div>
      <span style={{
        fontFamily: 'var(--mono)',
        fontSize: 11,
        fontWeight: 700,
        color,
        flexShrink: 0,
        textShadow: isGainer
          ? '0 0 8px rgba(28,212,124,0.4)'
          : '0 0 8px rgba(240,68,68,0.4)',
      }}>
        {sign}{item.pct_change.toFixed(1)}%
      </span>
    </div>
  )
}

function MoverList({
  items,
  isGainer,
  onTickerClick,
}: {
  items: MoverItem[]
  isGainer: boolean
  onTickerClick?: (t: string) => void
}) {
  const color = isGainer ? 'var(--green)' : 'var(--red)'
  const label = isGainer ? 'GAINERS' : 'LOSERS'

  return (
    <div>
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.14em',
        color,
        fontFamily: 'var(--font)',
        textTransform: 'uppercase',
        marginBottom: 6,
        textShadow: isGainer ? '0 0 8px rgba(28,212,124,0.35)' : '0 0 8px rgba(240,68,68,0.35)',
      }}>
        {label}
      </div>
      {items.length === 0
        ? <span style={{ color: 'var(--text-3)', fontSize: 11 }}>—</span>
        : items.map((item, i) => (
            <MoverRow key={i} item={item} isGainer={isGainer} onTickerClick={onTickerClick} />
          ))}
    </div>
  )
}

export default function MoversPanel({ data, onTickerClick }: Props) {
  return (
    <div className="nexus-surface" style={{
      backgroundColor: 'var(--surface)',
      backgroundImage: 'var(--grid)',
      backgroundSize: '42px 42px',
      border: '1px solid var(--border)',
      padding: '12px 16px',
      boxShadow: '0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.025)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 10,
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
          Quarter Movers
        </span>
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: 9,
          color: 'var(--text-3)',
        }}>
          {data.period}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <MoverList items={data.gainers} isGainer={true} onTickerClick={onTickerClick} />
        <MoverList items={data.losers} isGainer={false} onTickerClick={onTickerClick} />
      </div>
    </div>
  )
}
