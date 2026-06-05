"""Hybrid fund news feed: SEC filing events, holdings news (yfinance), Google News RSS."""

import json
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Optional

import httpx
import pandas as pd

import company_client
import sec_client
import state_manager
from models import FundNewsItem, FundNewsResponse

_CACHE_FILE = state_manager._DATA / "fund_news_cache.json"
_TTL = 12 * 3600
_CIK_NUM = "2045724"
_USER_AGENT = (
    "SituationalEdge/1.0 (https://github.com/PJWalker-4L/sa-fund-dashboard; "
    "contact: noreply@situational-edge.app)"
)

# Multiple feeds: narrow fund query misses recent ticker-level press (e.g. June 2026).
_GOOGLE_RSS_URLS = [
    "https://news.google.com/rss/search"
    "?q=Leopold+Aschenbrenner+when:14d"
    "&hl=en-US&gl=US&ceid=US:en",
    "https://news.google.com/rss/search"
    "?q=%22Situational+Awareness%22+hedge+fund+OR+13F"
    "&hl=en-US&gl=US&ceid=US:en",
    "https://news.google.com/rss/search"
    "?q=Situational+Awareness+Partners+OR+Leopold+Aschenbrenner+hedge+fund+OR+"
    "Situational+Awareness+LP+13F"
    "&hl=en-US&gl=US&ceid=US:en",
]
_PRESS_LIMIT = 25

_KEYWORD_BOOST = (
    "situational awareness",
    "aschenbrenner",
    "13f",
    "hedge fund",
)

# Google RSS when:14d also surfaces low-quality aggregators / video-spam titles.
_LOW_QUALITY_PUBLISHERS = (
    "mshale",
    "sekbernews",
    "harianbasis",
    "blockon",
)
_SPAM_TITLE_RE = re.compile(
    r"\([A-Za-z0-9]{6,}\)|release date|vs celta|vs atl",
    re.IGNORECASE,
)


def _load_cache(*, allow_stale: bool = False) -> Optional[dict]:
    if not _CACHE_FILE.exists():
        return None
    payload = json.loads(_CACHE_FILE.read_text(encoding="utf-8"))
    if not allow_stale and time.time() - payload.get("ts", 0) > _TTL:
        return None
    return payload.get("data")


def _save_cache(data: dict) -> None:
    _CACHE_FILE.parent.mkdir(exist_ok=True)
    _CACHE_FILE.write_text(
        json.dumps({"ts": time.time(), "data": data}, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def invalidate_fund_news_cache() -> None:
    if _CACHE_FILE.exists():
        _CACHE_FILE.unlink()


def _parse_date_ts(raw: str) -> int:
    if not raw:
        return 0
    raw = raw.strip()
    try:
        return int(datetime.fromisoformat(raw.replace("Z", "+00:00")).timestamp())
    except ValueError:
        pass
    try:
        return int(parsedate_to_datetime(raw).timestamp())
    except Exception:
        pass
    for fmt in ("%Y-%m-%d", "%Y-%m-%d %H:%M:%S"):
        try:
            return int(datetime.strptime(raw[:19], fmt).replace(tzinfo=timezone.utc).timestamp())
        except ValueError:
            continue
    return 0


def _sec_filing_url(accession: str) -> str:
    return (
        f"https://www.sec.gov/Archives/edgar/data/{_CIK_NUM}/"
        f"{accession}/{accession}-index.htm"
    )


def _fmt_notional(thousands: float) -> str:
    billions = thousands / 1_000_000
    if billions >= 1:
        return f"${billions:.1f}B"
    return f"${thousands / 1_000:.0f}M"


# --- Step 1: SEC filing events ---

def _sec_filing_events() -> list[FundNewsItem]:
    summaries = sec_client.fetch_all_filing_summaries()
    items: list[FundNewsItem] = []
    for s in reversed(summaries):
        quarter = s["quarter"]
        notional = _fmt_notional(s["total_thousands"])
        filed_ts = _parse_date_ts(s["filed"])
        items.append(FundNewsItem(
            title=f"13F-HR filed — {quarter} ({notional} reported notional)",
            link=_sec_filing_url(s["accession_number"]),
            publisher="SEC EDGAR",
            published=filed_ts,
            source="sec",
            ticker=None,
            relevance_score=100,
        ))
    return items


# --- Step 2: Holdings news (yfinance) ---

def _top_tickers(curr_df: pd.DataFrame, n: int = 10) -> list[str]:
    totals: dict[str, float] = {}
    for _, row in curr_df.iterrows():
        ticker = str(row.get("ticker") or "").strip().upper()
        if not ticker:
            continue
        totals[ticker] = totals.get(ticker, 0.0) + float(row.get("value") or 0)
    ranked = sorted(totals.items(), key=lambda x: -x[1])
    return [t for t, _ in ranked[:n]]


def _holdings_news(curr_df: pd.DataFrame) -> list[FundNewsItem]:
    items: list[FundNewsItem] = []
    for ticker in _top_tickers(curr_df):
        for raw in company_client.get_ticker_news(ticker, limit=2):
            title = raw.get("title", "").strip()
            if not title:
                continue
            items.append(FundNewsItem(
                title=title,
                link=raw.get("link") or "",
                publisher=raw.get("publisher") or "Yahoo Finance",
                published=int(raw.get("published") or 0),
                source="holding",
                ticker=ticker,
                relevance_score=40,
            ))
    return items


# --- Step 3: Google News RSS (fund keywords) ---

def _keyword_relevance(title: str) -> int:
    lower = title.lower()
    score = 50
    for kw in _KEYWORD_BOOST:
        if kw in lower:
            score += 15
    return min(score, 95)


def _is_quality_press(item: FundNewsItem) -> bool:
    pub = item.publisher.lower()
    if any(bad in pub for bad in _LOW_QUALITY_PUBLISHERS):
        return False
    if _SPAM_TITLE_RE.search(item.title):
        return False
    return _keyword_relevance(item.title) >= 50


def _http_get(url: str) -> httpx.Response:
    import ssl
    import truststore
    ctx = truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    return httpx.get(
        url,
        headers={"User-Agent": _USER_AGENT},
        timeout=15.0,
        follow_redirects=True,
        verify=ctx,
    )


def _rss_channel_items(root: ET.Element) -> list[FundNewsItem]:
    channel = root.find("channel")
    if channel is None:
        return []

    items: list[FundNewsItem] = []
    for item in channel.findall("item"):
        title_el = item.find("title")
        link_el = item.find("link")
        pub_el = item.find("pubDate")
        source_el = item.find("source")

        title = (title_el.text or "").strip() if title_el is not None else ""
        link = (link_el.text or "").strip() if link_el is not None else ""
        if not title or not link:
            continue

        publisher = (source_el.text or "Google News").strip() if source_el is not None else "Google News"
        published = _parse_date_ts(pub_el.text if pub_el is not None else "")

        items.append(FundNewsItem(
            title=title,
            link=link,
            publisher=publisher,
            published=published,
            source="keyword",
            ticker=None,
            relevance_score=_keyword_relevance(title),
        ))
    return items


def _google_news_rss() -> list[FundNewsItem]:
    merged: list[FundNewsItem] = []
    seen: set[str] = set()

    for url in _GOOGLE_RSS_URLS:
        try:
            resp = _http_get(url)
            resp.raise_for_status()
            root = ET.fromstring(resp.text)
        except Exception as exc:
            print(f"[WARN] Google News RSS fetch failed: {type(exc).__name__}: {exc}", flush=True)
            continue

        for item in _rss_channel_items(root):
            key = f"{item.title.lower().strip()}|{item.link.split('?')[0].lower().strip()}"
            if key in seen:
                continue
            seen.add(key)
            merged.append(item)

    quality = [i for i in merged if _is_quality_press(i)]
    if len(quality) < 8:
        # Keep feed usable if filters are too aggressive for a given news cycle.
        quality = merged
    quality.sort(key=lambda i: (i.published, i.relevance_score), reverse=True)
    return quality[:_PRESS_LIMIT]


# --- Merge, dedupe, rank ---

def _normalize_key(title: str, link: str) -> str:
    t = re.sub(r"\s+", " ", title.lower().strip())
    link_key = link.split("?")[0].lower().strip()
    return f"{t}|{link_key}"


def _dedupe(items: list[FundNewsItem]) -> list[FundNewsItem]:
    seen: set[str] = set()
    out: list[FundNewsItem] = []
    for item in items:
        key = _normalize_key(item.title, item.link)
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


def _rank(items: list[FundNewsItem]) -> list[FundNewsItem]:
    return sorted(
        items,
        key=lambda i: (i.relevance_score, i.published),
        reverse=True,
    )


def _build_fresh(curr_df: pd.DataFrame) -> FundNewsResponse:
    # Built sequentially: SEC → holdings → keyword RSS
    sec_items = _sec_filing_events()
    holding_items = _holdings_news(curr_df)
    keyword_items = _google_news_rss()

    # Rank within each source so tab filters keep full category lists (no global top-N cut).
    merged = (
        _rank(sec_items)
        + _rank(holding_items)
        + _rank(keyword_items)
    )
    merged = _dedupe(merged)
    return FundNewsResponse(
        items=merged,
        sec_count=len(sec_items),
        holding_count=len(holding_items),
        keyword_count=len(keyword_items),
    )


def build_fund_news(curr_df: pd.DataFrame) -> FundNewsResponse:
    cached = _load_cache()
    if cached:
        return FundNewsResponse(**cached)

    try:
        result = _build_fresh(curr_df)
        _save_cache(result.model_dump())
        return result
    except Exception:
        stale = _load_cache(allow_stale=True)
        if stale:
            print("[WARN] Fund news rebuild failed; serving stale cache", flush=True)
            return FundNewsResponse(**stale)
        raise
