import type { ReactNode } from 'react'
import type { AnalysisResponse } from '../types'
import { parseAnalysisSummary } from '../lib/analysis-parse'
import LinkedTickerText from './LinkedTickerText'

interface Props {
  data: AnalysisResponse | undefined
  isLoading: boolean
  tickerNames: Record<string, string>
  onTickerClick?: (ticker: string) => void
  onViewFull: () => void
}

function SummaryLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', lineHeight: 1.55 }}>
      <span style={{
        flexShrink: 0,
        width: 72,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'var(--text-3)',
        paddingTop: 2,
      }}>
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

        {!isLoading && !summary && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-3)' }}>
            No analysis available.
          </span>
        )}

        {!isLoading && summary && (
          <>
            {summary.instrumentMix && (
              <SummaryLine label="Mix">
                <LinkedTickerText
                  text={summary.instrumentMix}
                  tickerNames={tickerNames}
                  onTickerClick={onTickerClick}
                />
              </SummaryLine>
            )}
            {summary.expressionNote && (
              <SummaryLine label="Read">
                <LinkedTickerText
                  text={summary.expressionNote}
                  tickerNames={tickerNames}
                  onTickerClick={onTickerClick}
                />
              </SummaryLine>
            )}
            {summary.stackedLines.length > 0 && (
              <SummaryLine label="Stacked">
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
              <SummaryLine label="Moves">
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
