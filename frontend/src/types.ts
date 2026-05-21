export interface HoldingRow {
  nameOfIssuer: string
  cusip: string
  ticker: string | null
  titleOfClass: string | null
  value: number
  sshPrnamt: number
  sshPrntype: string | null
  putCall: string | null
  status: string | null
  value_change: number | null
  shares_change: number | null
  pct_change: number | null
  bucket: string | null
  thesis_role: string | null
}

export interface DeltaSummary {
  new_count: number
  closed_count: number
  increased_count: number
  decreased_count: number
}

export interface FilingMeta {
  accession_number: string
  period_of_report: string
  filed: string
  cik: string
  fund_name: string
}

export interface BucketAllocation {
  label: string
  value_thousands: number
  pct: number
}

export interface HoldingsResponse {
  meta: FilingMeta
  prev_meta: FilingMeta | null
  holdings: HoldingRow[]
  delta: DeltaSummary
  total_aum_thousands: number
  top_holding_name: string | null
  top_holding_pct: number | null
  call_count: number
  put_count: number
  share_count: number
  buckets: BucketAllocation[]
}

export interface NewsItem {
  title: string
  link: string
  publisher: string
  published: number
}

export interface CompanyInfo {
  ticker: string
  name: string
  sector: string
  industry: string
  country: string
  website: string
  summary: string
  news: NewsItem[]
}

export interface NewFilingCheck {
  has_new: boolean
  latest_period: string
  latest_filed: string
  latest_accession: string
  current_accession: string
}

export interface AlphaResponse {
  alpha: number | null
  portfolio_return: number | null
  spy_return: number | null
  period: string
  covered: number
  total: number
  error?: string
}

export interface AnalysisResponse {
  analysis: string
  cached: boolean
  filing_pair: string
}

export interface MoverItem {
  issuer: string
  cusip: string
  ticker: string | null
  putCall: string | null
  pct_change: number
  value_change_thousands: number
}

export interface MoversResponse {
  gainers: MoverItem[]
  losers: MoverItem[]
  period: string
}

export interface StrategyResponse {
  commentary: string
  cached: boolean
  filing_key: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatResponse {
  response: string
}

export interface HistoryPoint {
  quarter: string
  period_of_report: string
  accession_number: string
  total_thousands: number
  shares_thousands: number
  calls_thousands: number
  puts_thousands: number
  shares_pct: number
  calls_pct: number
  puts_pct: number
}

export interface HistoryAnnotation {
  quarter: string
  kind: string
  label: string
  detail: string
  value_billions: number | null
}

export interface PerformanceBadge {
  label: string
  return_pct: number
  benchmark: string | null
}

export interface HistoryResponse {
  points: HistoryPoint[]
  annotations: HistoryAnnotation[]
  performance_badges: PerformanceBadge[]
  disclaimer: string
}

export interface FundNewsItem {
  title: string
  link: string
  publisher: string
  published: number
  source: 'sec' | 'holding' | 'keyword'
  ticker: string | null
  relevance_score: number
}

export interface FundNewsResponse {
  items: FundNewsItem[]
  sec_count: number
  holding_count: number
  keyword_count: number
}

export interface HoldingsMapPoint {
  ticker: string
  name: string
  value: number
  putCall: string | null
  city: string
  country: string
  lat: number
  lng: number
  thesis_role: string | null
}

export interface HoldingsMapResponse {
  points: HoldingsMapPoint[]
  unmapped: string[]
  period_of_report: string
}
