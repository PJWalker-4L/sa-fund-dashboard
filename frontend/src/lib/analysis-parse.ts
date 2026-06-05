export interface AnalysisSummary {
  periodLabel: string | null
  instrumentMix: string | null
  expressionNote: string | null
  stackedLines: string[]
  keyMoves: string[]
}

const SECTION_MARKERS = ['①', '②', '③', '④', '⑤'] as const

function splitSections(text: string): Map<string, string> {
  const sections = new Map<string, string>()
  if (!text.trim()) return sections

  for (let i = 0; i < SECTION_MARKERS.length; i++) {
    const marker = SECTION_MARKERS[i]
    const start = text.indexOf(marker)
    if (start < 0) continue
    const end = i + 1 < SECTION_MARKERS.length
      ? SECTION_MARKERS.slice(i + 1).map(m => text.indexOf(m, start + 1)).filter(idx => idx >= 0).sort((a, b) => a - b)[0]
      : undefined
    const body = text.slice(start, end).replace(/^[^\n]*\n?/, '').trim()
    sections.set(marker, body)
  }
  return sections
}

function firstLine(section: string): string | null {
  const line = section.split('\n').map(l => l.trim()).find(Boolean)
  return line ?? null
}

function expressionNoteFromSection(section: string): string | null {
  const lines = section.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return null
  const note = lines.find(line =>
    !line.startsWith('Shares:')
    && !line.includes('13F notional reflects the value of the underlying equity')
    && !line.includes('Capital at risk is lower'),
  )
  return note ?? null
}

function stackedLinesFromSection(section: string, limit: number): string[] {
  return section
    .split('\n')
    .map(l => l.trim())
    .filter(line => /^[A-Z]{1,5}\b/.test(line) && /holds|Combined bullish/i.test(line))
    .slice(0, limit)
}

function keyMovesFromSection(section: string, limit: number): string[] {
  const bullets = section
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .filter(line =>
      /^[-•*]/.test(line)
      || /^\*\*/.test(line)
      || /^[A-Z]{1,5}\b.*(?:Put|Call|Share)/i.test(line),
    )
    .map(line => line.replace(/^[-•*]\s*/, '').replace(/\*\*/g, ''))

  if (bullets.length > 0) return bullets.slice(0, limit)

  return section
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('④') && !/^KEY MOVES/i.test(l))
    .slice(0, limit)
}

export function parseAnalysisSummary(text: string): AnalysisSummary | null {
  if (!text.trim()) return null

  const titleMatch = text.match(/◈\s*AI INSIGHT\s*—\s*([^\n]+)/i)
  const periodLabel = titleMatch?.[1]?.trim() ?? null

  const sections = splitSections(text)
  const expression = sections.get('①') ?? ''
  const stacked = sections.get('②') ?? ''
  const keyMovesSection = sections.get('④') ?? ''

  const instrumentMix = expression ? firstLine(expression) : null
  const expressionNote = expression ? expressionNoteFromSection(expression) : null
  const stackedLines = stacked ? stackedLinesFromSection(stacked, 2) : []
  const keyMoves = keyMovesSection ? keyMovesFromSection(keyMovesSection, 3) : []

  if (!instrumentMix && stackedLines.length === 0 && keyMoves.length === 0) {
    return null
  }

  return {
    periodLabel,
    instrumentMix,
    expressionNote,
    stackedLines,
    keyMoves,
  }
}
