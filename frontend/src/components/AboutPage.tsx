const PILLARS = [
  {
    title: 'Data Decoding',
    body:
      'Direct SEC 13F XML parsing with full Put/Call instrument awareness; QoQ delta tracking, quarterly AUM timeline with regulatory caveats, and a hybrid Fund News Feed (SEC filings, holdings news, press).',
  },
  {
    title: 'Thesis Mapping',
    body:
      'Every position mapped to one of six bottleneck layers from the SA paper (Power, Silicon, GPU Cloud, AI Infrastructure, Optical, Storage). AI Insight (5-block, deterministic + LLM) and Strategy Commentary decode key moves, stacked conviction, and mixed expressions.',
  },
  {
    title: 'Portfolio Intelligence',
    body:
      'Interactive holdings map, movers, company context, and an instrument-aware chat with deterministic portfolio facts before LLM interpretation — so bearish put books are not misread as bullish holdings.',
  },
] as const

export default function AboutPage() {
  return (
    <div className="page-content" style={{ maxWidth: 760, margin: '0 auto' }}>
      <section
        className="panel"
        style={{
          backgroundColor: 'var(--surface)',
          backgroundImage: 'var(--grid)',
          backgroundSize: '42px 42px',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        <div
          className="panel-header"
          style={{
            borderTop: '1px solid rgba(0,200,224,0.2)',
            background: 'linear-gradient(180deg, rgba(0,200,224,0.05) 0%, transparent 100%)',
          }}
        >
          <span className="section-label">About</span>
        </div>

        <div className="panel-body" style={{ padding: '28px 32px 32px', display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div>
            <p
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--teal)',
                textShadow: '0 0 10px var(--teal-glow)',
                marginBottom: 14,
              }}
            >
              Thesis intelligence for the AGI decade
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.65, color: 'var(--text-1)', marginBottom: 14 }}>
              An analytical intelligence dashboard for tech-industry professionals tracking Leopold
              Aschenbrenner&apos;s Situational Awareness Partners LP — a hedge fund whose latest 13F
              reports substantial notional exposure (~$13.7B, not identical to regulatory AUM).
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-2)' }}>
              Built on the thesis that the binding constraint of the AGI decade is not software, but
              physical bottlenecks: power, chips, cooling, and memory. The trades are public — but
              buried in delayed SEC filings, opaque options notionals, and a long foundational essay.
            </p>
          </div>

          <div>
            <h2
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: 'var(--text-3)',
                marginBottom: 16,
              }}
            >
              What it does
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {PILLARS.map(p => (
                <div
                  key={p.title}
                  style={{
                    padding: '14px 16px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--blue)',
                      marginBottom: 8,
                    }}
                  >
                    {p.title}
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-2)' }}>{p.body}</p>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--text-1)', fontWeight: 500 }}>
            The result is not a trading tool. It is the map sophisticated investors need to form
            their own conviction about where AGI capex is likely to flow next.
          </p>

          <p
            style={{
              fontSize: 10,
              color: 'var(--text-3)',
              letterSpacing: '0.04em',
              lineHeight: 1.5,
              fontFamily: 'var(--mono)',
            }}
          >
            Dark-only interface · monospace data display · compliance-aware framing · no
            recommendations · no copy-trading signals
          </p>

          <div
            style={{
              padding: '14px 16px',
              border: '1px solid var(--border)',
              borderLeft: '2px solid var(--border-hi)',
              background: 'rgba(3,12,26,0.6)',
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--text-3)',
                marginBottom: 8,
              }}
            >
              Disclaimer
            </div>
            <p
              style={{
                fontSize: 11,
                lineHeight: 1.6,
                color: 'var(--text-3)',
                fontFamily: 'var(--mono)',
              }}
            >
              Situational Edge is an analytical dashboard for educational and research use. It does
              not provide investment advice, manage assets, or encourage copying any fund&apos;s
              trades. 13F data is filed with a regulatory lag; options notionals and thesis labels
              are interpretive. Past filings do not predict future results.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
