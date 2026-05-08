from pydantic import BaseModel
from typing import Optional


class HoldingRow(BaseModel):
    nameOfIssuer: str
    cusip: str
    ticker: Optional[str] = None
    titleOfClass: Optional[str] = None
    value: float  # thousands of USD
    sshPrnamt: float
    sshPrntype: Optional[str] = None
    putCall: Optional[str] = None
    status: Optional[str] = None
    value_change: Optional[float] = None
    shares_change: Optional[float] = None
    pct_change: Optional[float] = None
    bucket: Optional[str] = None


class DeltaSummary(BaseModel):
    new_count: int
    closed_count: int
    increased_count: int
    decreased_count: int


class FilingMeta(BaseModel):
    accession_number: str
    period_of_report: str
    filed: str
    cik: str = "0002038540"
    fund_name: str = "Situational Awareness Partners LP"


class BucketAllocation(BaseModel):
    label: str
    value_thousands: float
    pct: float


class HoldingsResponse(BaseModel):
    meta: FilingMeta
    prev_meta: Optional[FilingMeta] = None
    holdings: list[HoldingRow]
    delta: DeltaSummary
    total_aum_thousands: float
    top_holding_name: Optional[str] = None
    top_holding_pct: Optional[float] = None
    call_count: int
    put_count: int
    share_count: int
    buckets: list[BucketAllocation]


class NewsItem(BaseModel):
    title: str
    link: str
    publisher: str
    published: int


class CompanyInfoResponse(BaseModel):
    ticker: str
    name: str
    sector: str
    industry: str
    country: str
    website: str
    summary: str
    news: list[NewsItem]


class AlphaResponse(BaseModel):
    alpha: Optional[float] = None
    portfolio_return: Optional[float] = None
    spy_return: Optional[float] = None
    period: str
    covered: int = 0
    total: int = 0
    error: Optional[str] = None


class AnalysisResponse(BaseModel):
    analysis: str
    cached: bool
    filing_pair: str


class MoverItem(BaseModel):
    issuer: str
    cusip: str
    ticker: Optional[str] = None
    putCall: Optional[str] = None
    pct_change: float
    value_change_thousands: float


class MoversResponse(BaseModel):
    gainers: list[MoverItem]
    losers: list[MoverItem]
    period: str
