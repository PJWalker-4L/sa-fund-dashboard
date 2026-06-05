import { useMemo } from 'react'
import LinkedTickerText from './LinkedTickerText'

export type MonoTextBlock =
  | { kind: 'header'; text: string }
  | { kind: 'separator'; text: string }
  | { kind: 'section'; marker: string; title: string }
  | { kind: 'stat'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'body'; text: string }
  | { kind: 'spacer' }

type Variant = 'insight' | 'strategy'

const INSIGHT_SECTION_RE = /^([①②③④⑤])\s+(.+)$/
const BULLET_RE = /^(?:[-•*·]|\d+\.)\s+/
const STAT_RE = /^Shares:\s/
const STRATEGY_LABELS = ['CONVICTION', 'GAPS', 'SIGNAL'] as const

function parseInsightBlocks(text: string): MonoTextBlock[] {
  const blocks: MonoTextBlock[] = []
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

    const section = line.match(INSIGHT_SECTION_RE)
    if (section) {
      sectionCount += 1
      blocks.push({ kind: 'section', marker: section[1], title: section[2] })
      continue
    }

    if (STAT_RE.test(line)) {
      blocks.push({ kind: 'stat', text: line })
      continue
    }

    if (BULLET_RE.test(line) && sectionCount >= 4) {
      blocks.push({ kind: 'bullet', text: line.replace(BULLET_RE, '') })
      continue
    }

    blocks.push({ kind: 'body', text: line })
  }

  return blocks
}

function pushStrategySection(blocks: MonoTextBlock[], title: string, body?: string) {
  blocks.push({ kind: 'section', marker: '', title })
  if (body) {
    blocks.push({ kind: 'body', text: body })
  }
}

function normalizeStrategyText(text: string): string {
  return text
    .replace(/\s*\*\*(CONVICTION|GAPS|SIGNAL)\*\*/gi, '\n\n**$1**')
    .replace(/\s*▸\s*(CONVICTION|GAPS|SIGNAL):/gi, '\n\n▸ $1:')
    .trim()
}

function parseStrategyBlocks(text: string): MonoTextBlock[] {
  const blocks: MonoTextBlock[] = []
  const normalized = normalizeStrategyText(text)

  for (const rawLine of normalized.split('\n')) {
    const line = rawLine.trimEnd()

    if (line === '') {
      blocks.push({ kind: 'spacer' })
      continue
    }

    const md = line.match(/^\*\*([A-Z][A-Z\s]+)\*\*(?:\s+(.*))?$/)
    if (md) {
      pushStrategySection(blocks, md[1].trim(), md[2]?.trim() || undefined)
      continue
    }

    const arrow = line.match(/^▸\s*([A-Z][A-Z\s]+):\s*(.*)$/)
    if (arrow) {
      pushStrategySection(blocks, arrow[1].trim(), arrow[2]?.trim() || undefined)
      continue
    }

    const labelMatch = line.match(/^(CONVICTION|GAPS|SIGNAL):\s*(.*)$/i)
    if (labelMatch) {
      pushStrategySection(blocks, labelMatch[1].toUpperCase(), labelMatch[2]?.trim() || undefined)
      continue
    }

    const bare = line.trim().toUpperCase()
    if ((STRATEGY_LABELS as readonly string[]).includes(bare)) {
      pushStrategySection(blocks, bare)
      continue
    }

    blocks.push({ kind: 'body', text: line })
  }

  return blocks
}

function parseBlocks(text: string, variant: Variant): MonoTextBlock[] {
  return variant === 'strategy' ? parseStrategyBlocks(text) : parseInsightBlocks(text)
}

interface Props {
  text: string
  variant?: Variant
  tickerNames: Record<string, string>
  onTickerClick?: (ticker: string) => void
}

export default function FormattedMonoText({
  text,
  variant = 'insight',
  tickerNames,
  onTickerClick,
}: Props) {
  const blocks = useMemo(() => parseBlocks(text, variant), [text, variant])
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
                {block.marker ? (
                  <span className="insight-section-marker">{block.marker}</span>
                ) : null}
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
