import { useState, type ReactNode } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchHoldings, fetchAnalysis, fetchMovers, triggerRefresh, fetchAlpha,
  checkNewFiling, fetchStrategy, invalidateStrategyCache, invalidateAnalysisCache,
  fetchHistory, fetchFundNews, fetchHoldingsMap,
} from './api'
import Header, { type DashboardTab } from './components/Header'
import KPICard from './components/KPICard'
import BucketChart from './components/BucketChart'
import MoversPanel from './components/MoversPanel'
import LLMInsight from './components/LLMInsight'
import ThesisInsight from './components/ThesisInsight'
import DeltaBadge from './components/DeltaBadge'
import HoldingsTable from './components/HoldingsTable'
import CompanyDrawer from './components/CompanyDrawer'
import ChatPanel from './components/ChatPanel'
import TimelineChart from './components/TimelineChart'
import FundNewsPanel from './components/FundNewsPanel'
import HoldingsMap from './components/HoldingsMap'
import TerminalGreeting from './components/TerminalGreeting'
import AboutPage from './components/AboutPage'
import AboutHintBanner, {
  dismissAboutHintSession,
  isAboutHintDismissed,
} from './components/AboutHintBanner'
import { buildTickerNameMap } from './components/LinkedTickerText'
import type { HoldingRow } from './types'

const THESIS_LAYERS = ['Power', 'Silicon', 'GPU Cloud', 'AI Infrastructure', 'Optical', 'Storage'] as const

function fmtAUM(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}B`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}M`
  return `$${v.toFixed(0)}K`
}

function PanelShell({ label, children, flush }: { label: string; children: ReactNode; flush?: boolean }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <span className="section-label">{label}</span>
      </div>
      <div className={flush ? 'panel-body panel-body-flush' : 'panel-body'}>
        {children}
      </div>
    </section>
  )
}

export default function App() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
  const [selectedHolding, setSelectedHolding] = useState<HoldingRow | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<DashboardTab>('portfolio')
  const [centerView, setCenterView] = useState<'map' | 'timeline'>('map')
  const [aboutHintVisible, setAboutHintVisible] = useState(() => !isAboutHintDismissed())
  const qc = useQueryClient()

  function dismissAboutHint() {
    dismissAboutHintSession()
    setAboutHintVisible(false)
  }

  function handleTabChange(tab: DashboardTab) {
    setActiveTab(tab)
    if (tab === 'about') dismissAboutHint()
  }

  function openDrawer(ticker: string, holding: HoldingRow) {
    setSelectedTicker(ticker)
    setSelectedHolding(holding)
  }

  function handleTickerClick(ticker: string) {
    const key = ticker.trim()
    if (!key) return
    const holding = data?.holdings.find(h => h.ticker === key) ?? null
    setSelectedTicker(key)
    setSelectedHolding(holding)
  }

  function closeDrawer() {
    setSelectedTicker(null)
    setSelectedHolding(null)
  }

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['holdings'],
    queryFn: fetchHoldings,
    staleTime: 5 * 60_000,
  })
  const analysis = useQuery({
    queryKey: ['analysis'],
    queryFn: fetchAnalysis,
    staleTime: Infinity,
  })
  const movers = useQuery({
    queryKey: ['movers'],
    queryFn: fetchMovers,
    staleTime: 5 * 60_000,
    enabled: !!data,
  })
  const alphaQuery = useQuery({
    queryKey: ['alpha'],
    queryFn: fetchAlpha,
    staleTime: 60 * 60_000,
    enabled: !!data,
  })
  const strategyQuery = useQuery({
    queryKey: ['strategy'],
    queryFn: fetchStrategy,
    staleTime: Infinity,
    enabled: !!data,
  })
  const history = useQuery({
    queryKey: ['history'],
    queryFn: fetchHistory,
    staleTime: 4 * 3600_000,
  })
  const fundNews = useQuery({
    queryKey: ['fund-news'],
    queryFn: fetchFundNews,
    staleTime: 12 * 3600_000,
    refetchInterval: 12 * 3600_000,
    refetchOnWindowFocus: true,
    enabled: !!data,
  })
  const holdingsMap = useQuery({
    queryKey: ['holdings-map'],
    queryFn: fetchHoldingsMap,
    staleTime: 5 * 60_000,
    enabled: !!data,
  })
  const filingCheck = useQuery({
    queryKey: ['filing-check'],
    queryFn: checkNewFiling,
    staleTime: 5 * 60_000,
    refetchInterval: 30 * 60_000,
  })
  const refresh = useMutation({
    mutationFn: triggerRefresh,
    onSuccess: () => qc.invalidateQueries(),
  })
  const refreshStrategy = useMutation({
    mutationFn: async () => {
      await invalidateStrategyCache()
      await qc.invalidateQueries({ queryKey: ['strategy'] })
    },
  })
  const refreshAnalysis = useMutation({
    mutationFn: async () => {
      await invalidateAnalysisCache()
      await qc.invalidateQueries({ queryKey: ['analysis'] })
    },
  })

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh', gap: 16,
      }}>
        {/* Corner accents on loading box */}
        <div style={{ position: 'relative', padding: '32px 48px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
          {/* TL accent */}
          <div style={{ position: 'absolute', top: -1, left: -1, width: 12, height: 12, borderTop: '1px solid var(--teal)', borderLeft: '1px solid var(--teal)' }} />
          {/* BR accent */}
          <div style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, borderBottom: '1px solid rgba(0,200,224,0.4)', borderRight: '1px solid rgba(0,200,224,0.4)' }} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16, justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16, letterSpacing: '0.18em', color: 'var(--text-1)' }}>SITUATIONAL</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16, letterSpacing: '0.18em', color: 'var(--teal)', textShadow: '0 0 14px var(--teal-glow)' }}>EDGE</span>
          </div>
          <div className="pulse" style={{ color: 'var(--text-3)', fontSize: 10, letterSpacing: '0.12em', textAlign: 'center', fontFamily: 'var(--font)', textTransform: 'uppercase' }}>
            Fetching 13F data from SEC EDGAR…
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh', gap: 10,
      }}>
        <div style={{ color: 'var(--red)', fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', fontFamily: 'var(--font)', textTransform: 'uppercase' }}>
          SEC Data Unavailable
        </div>
        <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>
          {String(error)}
        </div>
      </div>
    )
  }

  const putsNotional = data!.holdings
    .filter(h => h.putCall === 'Put')
    .reduce((sum, h) => sum + h.value, 0)
  const putsPct = data!.total_aum_thousands > 0
    ? Math.round(putsNotional / data!.total_aum_thousands * 100)
    : 0
  const topPutLabel = `${putsPct}% of 13F notional`
  const tickerNames = buildTickerNameMap(data!.holdings)
  const topName = data!.top_holding_name
    ? data!.top_holding_name.split(' ').slice(0, 3).join(' ')
    : '—'

  const layerCounts = THESIS_LAYERS.map(layer => ({
    layer,
    count: data!.holdings.filter(h => h.thesis_role === layer).length,
    value: data!.holdings.filter(h => h.thesis_role === layer).reduce((s, h) => s + h.value, 0),
  })).filter(l => l.count > 0)

  const kpiStrip = (
    <>
      <KPICard label="Total 13F AUM" value={fmtAUM(data!.total_aum_thousands)} sub={`${data!.meta.period_of_report} filing`} />
      <KPICard label="Holdings" value={String(data!.holdings.length)} sub={fmtAUM(data!.total_aum_thousands)} />
      <KPICard
        label="Alpha vs S&P 500"
        value={
          alphaQuery.isLoading ? '…' :
          alphaQuery.data?.alpha == null ? '—' :
          `${alphaQuery.data.alpha >= 0 ? '+' : ''}${alphaQuery.data.alpha.toFixed(1)}%`
        }
        valueColor={
          alphaQuery.data?.alpha == null ? undefined :
          alphaQuery.data.alpha >= 0 ? 'var(--green)' : 'var(--red)'
        }
        sub={alphaQuery.data?.portfolio_return != null ? `vs SPY ${alphaQuery.data.spy_return?.toFixed(1)}%` : undefined}
      />
      <KPICard label="Top Holding" value={topName} sub={data!.top_holding_pct ? `${data!.top_holding_pct}% of AUM` : undefined} />
      <KPICard label="Put Options" value={String(data!.put_count)} sub={topPutLabel} />
      <KPICard label="Call Options" value={String(data!.call_count)} sub={`${data!.holdings.length > 0 ? Math.round(data!.call_count / data!.holdings.length * 100) : 0}%`} />
    </>
  )

  const timelineBlock = history.data
    ? <TimelineChart data={history.data} />
    : (
      <div className="panel" style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="pulse" style={{ color: 'var(--text-3)', fontSize: 12 }}>Loading timeline…</span>
      </div>
    )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header
        meta={data!.meta}
        prevMeta={data!.prev_meta}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onRefresh={() => refresh.mutate()}
        isRefreshing={refresh.isPending}
        chatOpen={chatOpen}
        onChatToggle={() => setChatOpen(o => !o)}
        highlightAboutTab={aboutHintVisible}
      />

      {aboutHintVisible && activeTab === 'portfolio' && (
        <AboutHintBanner
          onDismiss={dismissAboutHint}
          onOpenAbout={() => handleTabChange('about')}
        />
      )}

      {filingCheck.data?.has_new && bannerDismissed !== filingCheck.data.latest_accession && (
        <div className="filing-banner" style={{
          background: 'rgba(245,192,48,0.06)',
          borderBottom: '1px solid rgba(245,192,48,0.2)',
          padding: '7px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--yellow)', boxShadow: '0 0 6px rgba(245,192,48,0.6)', flexShrink: 0 }} />
            <span style={{ fontSize: 10, color: 'var(--yellow)', fontFamily: 'var(--font)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              New 13F-HR Filing
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-2)' }}>
              {filingCheck.data.latest_period} · filed {filingCheck.data.latest_filed}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => { refresh.mutate(); setBannerDismissed(filingCheck.data!.latest_accession) }}
              disabled={refresh.isPending}
              style={{
                padding: '3px 12px',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontFamily: 'var(--font)',
                background: 'rgba(245,192,48,0.15)',
                color: 'var(--yellow)',
                border: '1px solid rgba(245,192,48,0.35)',
                cursor: 'pointer',
              }}
            >
              {refresh.isPending ? '↻ …' : 'Load Now'}
            </button>
            <button
              onClick={() => setBannerDismissed(filingCheck.data!.latest_accession)}
              style={{ padding: '3px 8px', fontSize: 10, background: 'transparent', color: 'var(--text-3)', border: '1px solid var(--border)', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}

        <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          {activeTab === 'portfolio' && (
            <div className="three-col-grid">
              {/* ── LEFT: Portfolio Status ── */}
              <div className="col-left" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="col-header">
                  <span className="col-header-label">Portfolio Status</span>
                </div>
                <KPICard
                  label="Total 13F AUM"
                  value={fmtAUM(data!.total_aum_thousands)}
                  sub={`${data!.meta.period_of_report} filing`}
                  status="ACTIVE"
                />
                <KPICard
                  label="Holdings"
                  value={String(data!.holdings.length)}
                  sub={fmtAUM(data!.total_aum_thousands) + ' total notional'}
                  status="NOMINAL"
                />
                <KPICard
                  label="Alpha vs S&P 500"
                  value={
                    alphaQuery.isLoading ? '…' :
                    alphaQuery.data?.alpha == null ? '—' :
                    `${alphaQuery.data.alpha >= 0 ? '+' : ''}${alphaQuery.data.alpha.toFixed(1)}%`
                  }
                  valueColor={
                    alphaQuery.data?.alpha == null ? undefined :
                    alphaQuery.data.alpha >= 0 ? 'var(--green)' : 'var(--red)'
                  }
                  sub={alphaQuery.data?.spy_return != null ? `SPY ${alphaQuery.data.spy_return >= 0 ? '+' : ''}${alphaQuery.data.spy_return.toFixed(1)}%` : undefined}
                  status={alphaQuery.data?.alpha != null ? (alphaQuery.data.alpha >= 0 ? 'OUTPERFORM' : 'LAGGING') : undefined}
                  statusWarn={alphaQuery.data?.alpha != null && alphaQuery.data.alpha < 0}
                />
                <KPICard
                  label="Top Holding"
                  value={topName}
                  sub={data!.top_holding_pct ? `${data!.top_holding_pct}% of AUM` : undefined}
                  barPct={data!.top_holding_pct ?? undefined}
                />
                <KPICard
                  label="Put Options"
                  value={String(data!.put_count)}
                  sub={topPutLabel}
                  barPct={putsPct}
                  barWarn={putsPct > 50}
                  status={putsPct > 50 ? 'ELEVATED' : 'NOMINAL'}
                  statusWarn={putsPct > 50}
                />
                <KPICard
                  label="Call Options"
                  value={String(data!.call_count)}
                  sub={`${data!.holdings.length > 0 ? Math.round(data!.call_count / data!.holdings.length * 100) : 0}% of portfolio`}
                />
                <div style={{ borderTop: '1px solid var(--border)', padding: '10px 16px' }}>
                  <div className="col-header-label" style={{ marginBottom: 8 }}>Thesis Layers</div>
                  {layerCounts.map(l => (
                    <div key={l.layer} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 10, letterSpacing: '0.06em', color: 'var(--text-3)' }}>{l.layer.toUpperCase()}</span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-1)' }}>
                        {l.count} · {fmtAUM(l.value)}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '10px 16px', marginTop: 'auto' }}>
                  <div className="col-header-label" style={{ marginBottom: 8 }}>QoQ Delta</div>
                  <DeltaBadge
                    newCount={data!.delta.new_count}
                    closedCount={data!.delta.closed_count}
                    increasedCount={data!.delta.increased_count}
                    decreasedCount={data!.delta.decreased_count}
                    filter={statusFilter}
                    onFilter={setStatusFilter}
                  />
                </div>
              </div>

              {/* ── CENTER: Map / Timeline ── */}
              <div className="col-center" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="col-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="col-header-label">
                    {centerView === 'map' ? 'Holdings Geography' : '13F Exposure — Quarterly Timeline'}
                  </span>
                  <div className="view-toggle" role="group" aria-label="Center panel view">
                    <button
                      type="button"
                      className={`view-toggle-btn${centerView === 'map' ? ' active' : ''}`}
                      onClick={() => setCenterView('map')}
                    >
                      Map
                    </button>
                    <button
                      type="button"
                      className={`view-toggle-btn${centerView === 'timeline' ? ' active' : ''}`}
                      onClick={() => setCenterView('timeline')}
                    >
                      Timeline
                    </button>
                  </div>
                </div>
                <div style={{ padding: centerView === 'map' ? 0 : 12, flex: 1, minHeight: 0 }}>
                  {centerView === 'map' ? (
                    <div style={{ position: 'relative' }}>
                      <HoldingsMap
                        points={holdingsMap.data?.points ?? []}
                        unmapped={holdingsMap.data?.unmapped ?? []}
                        loading={holdingsMap.isLoading}
                        onTickerClick={handleTickerClick}
                        embedded
                      />
                      <TerminalGreeting />
                    </div>
                  ) : (
                    timelineBlock
                  )}
                </div>
              </div>

              {/* ── RIGHT: Signals ── */}
              <div className="col-right" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                <div className="col-header">
                  <span className="col-header-label">Signals</span>
                </div>
                {movers.data
                  ? <MoversPanel data={movers.data} onTickerClick={handleTickerClick} />
                  : <div style={{ padding: 24, textAlign: 'center' }}><span className="pulse" style={{ color: 'var(--text-3)', fontSize: 12 }}>Loading movers…</span></div>}
                {fundNews.data
                  ? <FundNewsPanel data={fundNews.data} onTickerClick={handleTickerClick} />
                  : <div style={{ padding: 24, textAlign: 'center' }}><span className="pulse" style={{ color: 'var(--text-3)', fontSize: 12 }}>Loading news…</span></div>}
              </div>
            </div>
          )}

          {activeTab === 'about' && <AboutPage />}

          {activeTab === 'indicators' && (
            <div className="page-content">
              {timelineBlock}
              <BucketChart buckets={data!.buckets} holdings={data!.holdings} onPositionClick={openDrawer} />
              <div className="kpi-grid">{kpiStrip}</div>
              <LLMInsight
                data={analysis.data}
                isLoading={analysis.isLoading || refreshAnalysis.isPending}
                onRefresh={() => refreshAnalysis.mutate()}
                tickerNames={tickerNames}
                onTickerClick={handleTickerClick}
              />
              <ThesisInsight
                holdings={data!.holdings}
                strategy={strategyQuery.data}
                isLoading={strategyQuery.isLoading || refreshStrategy.isPending}
                onRefresh={() => refreshStrategy.mutate()}
                tickerNames={tickerNames}
                onTickerClick={handleTickerClick}
              />
              <PanelShell label="Holdings" flush>
                <div style={{
                  padding: '10px 16px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                    {statusFilter
                      ? `${data!.holdings.filter(h => h.status === statusFilter).length} shown`
                      : `${data!.holdings.length} positions`}
                  </span>
                  <DeltaBadge
                    newCount={data!.delta.new_count}
                    closedCount={data!.delta.closed_count}
                    increasedCount={data!.delta.increased_count}
                    decreasedCount={data!.delta.decreased_count}
                    filter={statusFilter}
                    onFilter={setStatusFilter}
                  />
                </div>
                <HoldingsTable holdings={data!.holdings} statusFilter={statusFilter} onTickerClick={handleTickerClick} />
              </PanelShell>
            </div>
          )}
        </main>
      </div>

      <CompanyDrawer
        ticker={selectedTicker}
        holding={selectedHolding}
        totalAum={data!.total_aum_thousands}
        onClose={closeDrawer}
      />
    </div>
  )
}
