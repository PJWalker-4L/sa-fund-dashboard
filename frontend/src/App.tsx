import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchHoldings, fetchAnalysis, fetchMovers, triggerRefresh, fetchAlpha, checkNewFiling, fetchStrategy } from './api'
import StatusBar from './components/StatusBar'
import KPICard from './components/KPICard'
import BucketChart from './components/BucketChart'
import MoversPanel from './components/MoversPanel'
import LLMInsight from './components/LLMInsight'
import ThesisInsight from './components/ThesisInsight'
import DeltaBadge from './components/DeltaBadge'
import HoldingsTable from './components/HoldingsTable'
import CompanyDrawer from './components/CompanyDrawer'
import ChatPanel from './components/ChatPanel'
import type { HoldingRow } from './types'

export default function App() {
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
  const [selectedHolding, setSelectedHolding] = useState<HoldingRow | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState<string | null>(null)
  const [chatOpen, setChatOpen] = useState(false)
  const qc = useQueryClient()

  function openDrawer(ticker: string, holding: HoldingRow) {
    setSelectedTicker(ticker)
    setSelectedHolding(holding)
  }

  function handleTickerClick(ticker: string) {
    const holding = data?.holdings.find(h => h.ticker === ticker) ?? null
    setSelectedTicker(ticker)
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

  function fmtAUM(v: number): string {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}B`
    if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}M`
    return `$${v.toFixed(0)}K`
  }

  if (isLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh', gap: 14,
      }}>
        <div style={{ color: 'var(--blue)', fontSize: 18, fontWeight: 700, letterSpacing: '0.08em' }}>
          SITUATIONAL AWARENESS
        </div>
        <div className="pulse" style={{ color: 'var(--text-2)', fontSize: 12 }}>
          Fetching 13F data from SEC EDGAR…
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
        <div style={{ color: 'var(--red)', fontSize: 15, fontWeight: 600 }}>Failed to load SEC data</div>
        <div style={{ color: 'var(--text-2)', fontSize: 12, fontFamily: 'var(--mono)' }}>
          {String(error)}
        </div>
        <div style={{ color: 'var(--text-3)', fontSize: 11, marginTop: 8 }}>
          Make sure the backend is running: <code>uvicorn main:app --reload</code> (from /backend)
        </div>
      </div>
    )
  }

  const topShortLabel = data!.put_count > 0
    ? `${data!.put_count} put position${data!.put_count !== 1 ? 's' : ''}`
    : 'no active shorts'

  const topName = data!.top_holding_name
    ? data!.top_holding_name.split(' ').slice(0, 3).join(' ')
    : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <StatusBar
        meta={data!.meta}
        prevMeta={data!.prev_meta}
        onRefresh={() => refresh.mutate()}
        isRefreshing={refresh.isPending}
        chatOpen={chatOpen}
        onChatToggle={() => setChatOpen(o => !o)}
      />

      {filingCheck.data?.has_new && bannerDismissed !== filingCheck.data.latest_accession && (
        <div style={{
          background: 'rgba(251,191,36,0.08)',
          borderBottom: '1px solid rgba(251,191,36,0.25)',
          padding: '8px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}>
          <span style={{ fontSize: 12, color: 'var(--yellow)' }}>
            Neues 13F-HR Filing verfügbar &nbsp;·&nbsp;
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>
              {filingCheck.data.latest_period}
            </span>
            &nbsp;(eingereicht {filingCheck.data.latest_filed})
          </span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              onClick={() => { refresh.mutate(); setBannerDismissed(filingCheck.data!.latest_accession) }}
              disabled={refresh.isPending}
              style={{
                padding: '3px 12px', fontSize: 11, fontWeight: 600,
                background: 'var(--yellow)', color: '#000',
                border: 'none', borderRadius: 3, cursor: 'pointer',
              }}
            >
              {refresh.isPending ? 'Lädt…' : 'Jetzt laden'}
            </button>
            <button
              onClick={() => setBannerDismissed(filingCheck.data!.latest_accession)}
              style={{
                padding: '3px 8px', fontSize: 11,
                background: 'transparent', color: 'var(--text-3)',
                border: '1px solid var(--border)', borderRadius: 3, cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}

      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
      <div style={{
        padding: '18px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1400,
        margin: '0 auto',
        width: '100%',
      }}>

        {/* KPI Strip */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <KPICard
            label="Total 13F AUM"
            value={fmtAUM(data!.total_aum_thousands)}
            sub={`${data!.meta.period_of_report} filing`}
          />
          <KPICard
            label="Holdings"
            value={String(data!.holdings.length)}
            sub={`top ${Math.min(data!.holdings.length, 17)} shown · ${fmtAUM(data!.total_aum_thousands)}`}
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
            sub={
              alphaQuery.data?.portfolio_return != null && alphaQuery.data?.spy_return != null
                ? `portfolio ${alphaQuery.data.portfolio_return >= 0 ? '+' : ''}${alphaQuery.data.portfolio_return.toFixed(1)}% · SPY ${alphaQuery.data.spy_return >= 0 ? '+' : ''}${alphaQuery.data.spy_return.toFixed(1)}%`
                : `since ${data!.meta.period_of_report}`
            }
          />
          <KPICard
            label="Top Holding"
            value={topName}
            sub={data!.top_holding_pct ? `${data!.top_holding_pct}% of AUM` : undefined}
            accent
          />
          <KPICard
            label="Active Shorts"
            value={String(data!.put_count)}
            sub={topShortLabel}
          />
          <KPICard
            label="Call Options"
            value={String(data!.call_count)}
            sub={`${data!.holdings.length > 0 ? Math.round(data!.call_count / data!.holdings.length * 100) : 0}% of portfolio`}
          />
        </div>

        {/* Bucket Chart + Movers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <BucketChart buckets={data!.buckets} holdings={data!.holdings} onPositionClick={openDrawer} />
          {movers.data
            ? <MoversPanel data={movers.data} onTickerClick={handleTickerClick} />
            : (
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span className="pulse" style={{ color: 'var(--text-3)', fontSize: 12 }}>
                  Loading movers…
                </span>
              </div>
            )}
        </div>

        {/* LLM Insight */}
        <LLMInsight
          data={analysis.data}
          isLoading={analysis.isLoading}
          onRefresh={() => qc.invalidateQueries({ queryKey: ['analysis'] })}
        />

        {/* Thesis Stack */}
        <ThesisInsight
          holdings={data!.holdings}
          strategy={strategyQuery.data}
          isLoading={strategyQuery.isLoading}
          onRefresh={() => qc.invalidateQueries({ queryKey: ['strategy'] })}
        />

        {/* Holdings Table */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '10px 18px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Holdings &nbsp;
              <span style={{ color: 'var(--text-3)' }}>
                {statusFilter ? `${data!.holdings.filter(h => h.status === statusFilter).length} shown` : `${data!.holdings.length} positions`}
              </span>
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
        </div>
      </div>
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
