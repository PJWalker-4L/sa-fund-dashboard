import type { MoversResponse, MoverItem } from '../types'

interface Props {
  data: MoversResponse
  onTickerClick?: (ticker: string) => void
}

function abbrev(name: string, max = 18): string {
  return name.length > max ? name.slice(0, max - 1) + '…' : name
}

/** SEC `value` fields are reported in $ thousands. */
function fmtNotionalThousands(v: number): string {
  const abs = Math.abs(v)
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(2)}B`
  if (abs >= 1_000) return `$${(abs / 1_000).toFixed(1)}M`
  return `$${abs.toFixed(0)}K`
}

function fmtValueDeltaThousands(thousands: number): string {
  const sign = thousands >= 0 ? '+' : '−'
  return `${sign}${fmtNotionalThousands(thousands)}`
}

function moverRowTitle(item: MoverItem): string {
  const base =
    'Change in reported 13F position value vs prior quarter (same CUSIP + Put/Call). Not stock price return.'
  const dollars = fmtValueDeltaThousands(item.value_change_thousands)
  if (item.delta_status === 'new') return `New filing line: ${dollars}. ${base}`
  if (item.delta_status === 'closed') return `Full exit: ${dollars}. ${base}`
  const pct = `${item.pct_change > 0 ? '+' : ''}${item.pct_change.toFixed(1)}% QoQ exposure`
  return `${dollars} (${pct}). ${base}`
}

function MoverRow({
  item,
  isAdds,
  onTickerClick,
}: {
  item: MoverItem
  isAdds: boolean
  onTickerClick?: (t: string) => void
}) {
  const color = isAdds ? 'var(--green)' : 'var(--red)'
  const typeLabel = item.putCall ? item.putCall.slice(0, 4).toUpperCase() : 'SH'
  const clickable = !!(item.ticker && onTickerClick)
  const showPct = item.delta_status === 'increased' || item.delta_status === 'decreased'
  const statusTag = item.delta_status === 'new' ? 'NEW' : item.delta_status === 'closed' ? 'EXIT' : null
  const dollarLabel = fmtValueDeltaThousands(item.value_change_thousands)
  const pctLabel = showPct
    ? `${item.pct_change > 0 ? '+' : ''}${item.pct_change.toFixed(1)}%`
    : null

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
      <div
        title={moverRowTitle(item)}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          flexShrink: 0,
          gap: 2,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {statusTag && (
            <span style={{
              fontFamily: 'var(--font)',
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--text-3)',
            }}>
              {statusTag}
            </span>
          )}
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: 11,
            fontWeight: 700,
            color,
            textShadow: isAdds
              ? '0 0 8px rgba(28,212,124,0.4)'
              : '0 0 8px rgba(240,68,68,0.4)',
          }}>
            {dollarLabel}
          </span>
        </div>
        {pctLabel && (
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: 10,
            fontWeight: 600,
            color: 'var(--text-3)',
          }}>
            {pctLabel}
          </span>
        )}
      </div>
    </div>
  )
}

function MoverList({
  items,
  isAdds,
  onTickerClick,
}: {
  items: MoverItem[]
  isAdds: boolean
  onTickerClick?: (t: string) => void
}) {
  const color = isAdds ? 'var(--green)' : 'var(--red)'
  const label = isAdds ? 'Largest adds' : 'Largest cuts'

  return (
    <div>
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.12em',
        color,
        fontFamily: 'var(--font)',
        textTransform: 'uppercase',
        marginBottom: 6,
        textShadow: isAdds ? '0 0 8px rgba(28,212,124,0.35)' : '0 0 8px rgba(240,68,68,0.35)',
      }}>
        {label}
      </div>
      {items.length === 0
        ? <span style={{ color: 'var(--text-3)', fontSize: 11 }}>—</span>
        : items.map((item, i) => (
            <MoverRow key={i} item={item} isAdds={isAdds} onTickerClick={onTickerClick} />
          ))}
    </div>
  )
}

export default function MoversPanel({ data, onTickerClick }: Props) {
  return (
    <div className="nexus-surface surface-compact-mobile" style={{
      backgroundColor: 'var(--surface)',
      backgroundImage: 'var(--grid)',
      backgroundSize: '42px 42px',
      border: '1px solid var(--border)',
      padding: '12px 16px',
      boxShadow: '0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.025)',
    }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 8,
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
            13F position changes
          </span>
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: 9,
            color: 'var(--text-3)',
            flexShrink: 0,
          }}>
            {data.period}
          </span>
        </div>
        <p style={{
          margin: '6px 0 0',
          fontSize: 10,
          lineHeight: 1.45,
          color: 'var(--text-3)',
          fontFamily: 'var(--font)',
        }}>
          Largest adds and cuts vs prior quarter — reported filing exposure, not stock performance.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <MoverList items={data.gainers} isAdds={true} onTickerClick={onTickerClick} />
        <MoverList items={data.losers} isAdds={false} onTickerClick={onTickerClick} />
      </div>
    </div>
  )
}