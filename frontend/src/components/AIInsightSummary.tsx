import type { ReactNode } from 'react'
import type { AnalysisResponse } from '../types'
import { parseAnalysisSummary } from '../lib/analysis-parse'
import LinkedTickerText from './LinkedTickerText'

interface Props {
  data: AnalysisResponse | undefined
  isLoading: boolean
  isError?: boolean
  errorMessage?: string
  tickerNames: Record<string, string>
  onTickerClick?: (ticker: string) => void
  onViewFull: () => void
}

const ROW_LABELS = {
  mix: {
    label: 'Instrument split',
    title: 'How this quarter’s 13F is divided: stock holdings (Shares), call options (Calls), and put options (Puts).',
  },
  read: {
    label: 'What it means',
    title: 'One-line read of the instrument split in this filing (shares, calls, and puts).',
  },
  stacked: {
    label: 'Stacked long',
    title: 'Names with both shares and calls on the same ticker and no offsetting puts — combined bullish expression.',
  },
  moves: {
    label: 'Quarter moves',
    title: 'Largest position changes vs the prior 13F (new, increased, decreased, or closed lines).',
  },
} as const

function SummaryLine({
  row,
  children,
}: {
  row: keyof typeof ROW_LABELS
  children: ReactNode
}) {
  const { label, title } = ROW_LABELS[row]
  return (
    <div className="insight-summary-line" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', lineHeight: 1.55 }}>
      <span
        title={title}
        style={{
          flexShrink: 0,
          width: 104,
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--text-3)',
          paddingTop: 2,
          lineHeight: 1.35,
          cursor: 'help',
        }}
      >
        {label}
      </span>
      <div style={{
        flex: 1,
        fontFamily: 'var(--mono)',
        fontSize: 11,
        color: 'var(--text-2)',
      }}>
        {children}
      </div>
    </div>
  )
}

export default function AIInsightSummary({
  data,
  isLoading,
  isError,
  errorMessage,
  tickerNames,
  onTickerClick,
  onViewFull,
}: Props) {
  const summary = data?.analysis ? parseAnalysisSummary(data.analysis) : null

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'linear-gradient(180deg, rgba(0,200,224,0.03) 0%, transparent 100%)',
      flexShrink: 0,
    }}>
      <div style={{
        padding: '8px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span className="col-header-label">AI Insight</span>
          {summary?.periodLabel && (
            <span style={{
              fontFamily: 'var(--mono)',
              fontSize: 9,
              color: 'var(--text-3)',
              letterSpacing: '0.04em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {summary.periodLabel}
            </span>
          )}
          {data?.cached && (
            <span style={{
              fontSize: 8,
              color: 'var(--text-3)',
              background: 'var(--surface-hi)',
              padding: '1px 5px',
              letterSpacing: '0.05em',
            }}>
              CACHED
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onViewFull}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--teal)',
            cursor: 'pointer',
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font)',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Full insight →
        </button>
      </div>

      <div style={{ padding: '12px 16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isLoading && (
          <span className="pulse" style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)' }}>
            Analyzing delta…
          </span>
        )}

        {!isLoading && isError && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--orange)' }}>
            {errorMessage ?? 'Analysis request failed.'} Check that the API is running and LLM keys or GROQ_MODEL in .env.local are set.
          </span>
        )}

        {!isLoading && !isError && !summary && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)' }}>
            No analysis available.
          </span>
        )}

        {!isLoading && summary && (
          <>
            <p style={{
              margin: 0,
              fontSize: 10,
              lineHeight: 1.45,
              color: 'var(--text-3)',
              fontFamily: 'var(--font)',
            }}>
              Filing mix, how to read it, and the biggest quarter-over-quarter position changes (from 13F data).
            </p>
            {summary.instrumentMix && (
              <SummaryLine row="mix">
                <LinkedTickerText
                  text={summary.instrumentMix}
                  tickerNames={tickerNames}
                  onTickerClick={onTickerClick}
                />
              </SummaryLine>
            )}
            {summary.expressionNote && (
              <SummaryLine row="read">
                <LinkedTickerText
                  text={summary.expressionNote}
                  tickerNames={tickerNames}
                  onTickerClick={onTickerClick}
                />
              </SummaryLine>
            )}
            {summary.stackedLines.length > 0 && (
              <SummaryLine row="stacked">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {summary.stackedLines.map(line => (
                    <LinkedTickerText
                      key={line}
                      text={line}
                      tickerNames={tickerNames}
                      onTickerClick={onTickerClick}
                    />
                  ))}
                </div>
              </SummaryLine>
            )}
            {summary.keyMoves.length > 0 && (
              <SummaryLine row="moves">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {summary.keyMoves.map(line => (
                    <LinkedTickerText
                      key={line}
                      text={line}
                      tickerNames={tickerNames}
                      onTickerClick={onTickerClick}
                    />
                  ))}
                </div>
              </SummaryLine>
            )}
          </>
        )}
      </div>
    </div>
  )
}
