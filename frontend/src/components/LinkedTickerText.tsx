import { Fragment, useMemo } from 'react'

interface Props {
  text: string
  tickerNames: Record<string, string>
  onTickerClick?: (ticker: string) => void
}

function buildTickerPattern(tickers: string[]): RegExp | null {
  if (tickers.length === 0) return null
  const sorted = [...tickers].sort((a, b) => b.length - a.length)
  const escaped = sorted.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return new RegExp(`\\b(${escaped.join('|')})\\b`, 'g')
}

type Segment = { type: 'text' | 'ticker'; value: string }

function parseTickerSegments(text: string, pattern: RegExp | null): Segment[] {
  if (!pattern) return [{ type: 'text', value: text }]

  const segments: Segment[] = []
  let lastIndex = 0
  const re = new RegExp(pattern.source, pattern.flags)
  let match: RegExpExecArray | null

  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'ticker', value: match[1] })
    lastIndex = re.lastIndex
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: text }]
}

export default function LinkedTickerText({ text, tickerNames, onTickerClick }: Props) {
  const pattern = useMemo(
    () => buildTickerPattern(Object.keys(tickerNames)),
    [tickerNames],
  )

  const segments = useMemo(
    () => parseTickerSegments(text, pattern),
    [text, pattern],
  )

  return (
    <>
      {segments.map((seg, i) =>
        seg.type === 'ticker' ? (
          <span
            key={i}
            title={tickerNames[seg.value] ?? seg.value}
            onClick={onTickerClick ? () => onTickerClick(seg.value) : undefined}
            style={{
              color: 'var(--blue)',
              fontWeight: 600,
              cursor: onTickerClick ? 'pointer' : 'default',
              textDecoration: onTickerClick ? 'underline' : undefined,
              textDecorationColor: 'rgba(56,189,248,0.35)',
            }}
          >
            {seg.value}
          </span>
        ) : (
          <Fragment key={i}>{seg.value}</Fragment>
        ),
      )}
    </>
  )
}

export function buildTickerNameMap(holdings: { ticker?: string | null; nameOfIssuer: string }[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const h of holdings) {
    if (h.ticker && !map[h.ticker]) {
      map[h.ticker] = h.nameOfIssuer
    }
  }
  return map
}
