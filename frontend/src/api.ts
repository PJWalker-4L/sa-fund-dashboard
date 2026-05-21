import type { HoldingsResponse, AnalysisResponse, MoversResponse } from './types'

const ok = (r: Response) => { if (!r.ok) throw new Error(`${r.status} ${r.statusText}`); return r }

export const fetchHoldings = (): Promise<HoldingsResponse> =>
  fetch('/api/holdings').then(ok).then(r => r.json())

export const fetchAnalysis = (): Promise<AnalysisResponse> =>
  fetch('/api/analysis').then(ok).then(r => r.json())

export const fetchMovers = (): Promise<MoversResponse> =>
  fetch('/api/movers').then(ok).then(r => r.json())

export const triggerRefresh = (): Promise<{ status: string; period: string }> =>
  fetch('/api/refresh', { method: 'POST' }).then(ok).then(r => r.json())

export const invalidateStrategyCache = (): Promise<{ status: string; cache: string }> =>
  fetch('/api/invalidate-strategy', { method: 'POST' }).then(ok).then(r => r.json())

export const invalidateAnalysisCache = (): Promise<{ status: string; cache: string }> =>
  fetch('/api/invalidate-analysis', { method: 'POST' }).then(ok).then(r => r.json())

export const fetchAlpha = (): Promise<import('./types').AlphaResponse> =>
  fetch('/api/alpha').then(ok).then(r => r.json())

export const checkNewFiling = (): Promise<import('./types').NewFilingCheck> =>
  fetch('/api/check-new-filing').then(ok).then(r => r.json())

export const fetchCompany = (ticker: string): Promise<import('./types').CompanyInfo> =>
  fetch(`/api/company/${ticker}`).then(ok).then(r => r.json())

export const fetchStrategy = (): Promise<import('./types').StrategyResponse> =>
  fetch('/api/strategy').then(ok).then(r => r.json())

export const fetchHistory = (): Promise<import('./types').HistoryResponse> =>
  fetch('/api/history').then(ok).then(r => r.json())

export const sendChatMessage = (
  message: string,
  history: import('./types').ChatMessage[],
  model: string,
): Promise<import('./types').ChatResponse> =>
  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, model }),
  }).then(ok).then(r => r.json())
