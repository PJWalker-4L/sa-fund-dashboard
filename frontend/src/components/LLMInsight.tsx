import { useMemo, useState } from 'react'
import type { AnalysisResponse } from '../types'
import LinkedTickerText from './LinkedTickerText'

interface Props {
  data: AnalysisResponse | undefined
  isLoading: boolean
  onRefresh: () => void
  tickerNames: Record<string, string>
  onTickerClick?: (ticker: string) => void
}

type InsightBlock =
  | { kind: 'header'; text: string }
  | { kind: 'separator'; text: string }
  | { kind: 'section'; marker: string; title: string }
  | { kind: 'stat'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'body'; text: string }
  | { kind: 'spacer' }

const SECTION_RE = /^([①②③④⑤])\s+(.+)$/
const BULLET_RE = /^(?:[-•*·]|\d+\.)\s+/
const STAT_RE = /^Shares:\s/

function parseInsightBlocks(text: string): InsightBlock[] {
  const blocks: InsightBlock[] = []
  let sectionCount = 0

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trimEnd()

    if (line === '') {
      blocks.push({ kind: 'spacer' })
      continue
    }

    if (line.startsWith('◈ AI INSIGHT')) {
      blocks.push({ kind: 'header', text: line })
      continue
    }

    if (/^─+$/.test(line.trim())) {
      blocks.push({ kind: 'separator', text: line.trim() })
      continue
    }

    const section = line.match(SECTION_RE)
    if (section) {
      sectionCount += 1
      blocks.push({ kind: 'section', marker: section[1], title: section[2] })
      continue
    }

    if (STAT_RE.test(line)) {
      blocks.push({ kind: 'stat', text: line })
      continue
    }

    const bullet = line.match(BULLET_RE)
    if (bullet && sectionCount >= 4) {
      blocks.push({ kind: 'bullet', text: line.replace(BULLET_RE, '') })
      continue
    }

    blocks.push({ kind: 'body', text: line })
  }

  return blocks
}

function InsightBody({
  text,
  tickerNames,
  onTickerClick,
}: {
  text: string
  tickerNames: Record<string, string>
  onTickerClick?: (ticker: string) => void
}) {
  const blocks = useMemo(() => parseInsightBlocks(text), [text])
  let sectionIndex = 0

  return (
    <div className="insight-text">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'header':
            return (
              <div key={i} className="insight-line insight-line--header">
                {block.text}
              </div>
            )
          case 'separator':
            return (
              <div key={i} className="insight-line insight-line--separator" aria-hidden="true">
                {block.text}
              </div>
            )
          case 'section': {
            sectionIndex += 1
            return (
              <div
                key={i}
                className={`insight-line insight-line--section${sectionIndex > 1 ? ' insight-line--section-gap' : ''}`}
              >
                <span className="insight-section-marker">{block.marker}</span>
                <span>{block.title}</span>
              </div>
            )
          }
          case 'stat':
            return (
              <div key={i} className="insight-line insight-line--stat">
                <LinkedTickerText text={block.text} tickerNames={tickerNames} onTickerClick={onTickerClick} />
              </div>
            )
          case 'bullet':
            return (
              <div key={i} className="insight-line insight-line--bullet">
                <span className="insight-bullet-marker" aria-hidden="true">·</span>
                <span>
                  <LinkedTickerText text={block.text} tickerNames={tickerNames} onTickerClick={onTickerClick} />
                </span>
              </div>
            )
          case 'spacer':
            return <div key={i} className="insight-spacer" aria-hidden="true" />
          case 'body':
            return (
              <div key={i} className="insight-line insight-line--body">
                <LinkedTickerText text={block.text} tickerNames={tickerNames} onTickerClick={onTickerClick} />
              </div>
            )
          default:
            return null
        }
      })}
    </div>
  )
}

export default function LLMInsight({ data, isLoading, onRefresh, tickerNames, onTickerClick }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="nexus-surface" style={{
      backgroundColor: 'var(--surface)',
      backgroundImage: 'var(--grid)',
      backgroundSize: '42px 42px',
      border: '1px solid var(--border)',
      padding: '12px 18px',
      boxShadow: '0 4px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.025)',
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: collapsed ? 0 : 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--blue)', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em' }}>
            ◈ AI INSIGHT
          </span>
          {data?.cached && (
            <span style={{
              fontSize: 9,
              color: 'var(--text-3)',
              background: 'var(--surface-hi)',
              padding: '1px 6px',
              letterSpacing: '0.05em',
            }}>
              CACHED
            </span>
          )}
          {isLoading && (
            <span className="pulse" style={{ fontSize: 11, color: 'var(--text-3)' }}>
              analyzing delta…
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={onRefresh}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-2)', cursor: 'pointer', fontSize: 11,
            }}
          >
            ↻ refresh
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-3)', cursor: 'pointer', fontSize: 11,
            }}
          >
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ minHeight: 32 }}>
          {isLoading
            ? <span className="pulse insight-line insight-line--muted">——</span>
            : data?.analysis
            ? (
              <InsightBody
                text={data.analysis}
                tickerNames={tickerNames}
                onTickerClick={onTickerClick}
              />
            )
            : <span className="insight-line insight-line--muted">No analysis available.</span>}
        </div>
      )}
    </div>
  )
}
