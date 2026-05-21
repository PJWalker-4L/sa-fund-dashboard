interface Props {
  newCount: number
  closedCount: number
  increasedCount: number
  decreasedCount: number
  filter: string | null
  onFilter: (f: string | null) => void
}

const BADGES = [
  { key: 'NEW',       label: (n: number) => `+${n} New`,       color: 'var(--green)'  },
  { key: 'CLOSED',    label: (n: number) => `−${n} Closed`,    color: 'var(--red)'    },
  { key: 'INCREASED', label: (n: number) => `↑${n} Increased`, color: 'var(--yellow)' },
  { key: 'DECREASED', label: (n: number) => `↓${n} Decreased`, color: 'var(--orange)' },
]

export default function DeltaBadge({ newCount, closedCount, increasedCount, decreasedCount, filter, onFilter }: Props) {
  const counts: Record<string, number> = {
    NEW: newCount,
    CLOSED: closedCount,
    INCREASED: increasedCount,
    DECREASED: decreasedCount,
  }

  const any = Object.values(counts).some(n => n > 0)
  if (!any) return null

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
      {BADGES.map(b => {
        const n = counts[b.key]
        if (n === 0) return null
        const active = filter === b.key
        return (
          <button
            key={b.key}
            onClick={() => onFilter(active ? null : b.key)}
            style={{
              padding: '2px 10px',
              border: `1px solid ${b.color}40`,
              background: active ? b.color + '22' : 'transparent',
              color: active ? b.color : b.color + 'bb',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.03em',
              transition: 'all 0.15s',
            }}
          >
            {b.label(n)}
          </button>
        )
      })}
      {filter && (
        <button
          onClick={() => onFilter(null)}
          style={{
            padding: '2px 8px',
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-3)',
            cursor: 'pointer',
            fontSize: 10,
          }}
        >
          ✕ clear
        </button>
      )}
    </div>
  )
}
