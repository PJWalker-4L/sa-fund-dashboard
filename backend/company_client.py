import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from pathlib import Path

from state_manager import _DATA

_CACHE_FILE = _DATA / "company_cache.json"
_TTL = 24 * 3600
_YF_TIMEOUT = 20
_EXEC = ThreadPoolExecutor(max_workers=2, thread_name_prefix="yf-company")

# yfinance 1.x uses curl_cffi for HTTP; it ignores Python's ssl module / truststore.
# Patch Session.__init__ so every new session is created with verify=False,
# which lets requests pass through corporate SSL interception proxies.
try:
    from curl_cffi import requests as _cffi_req
    _orig_session_init = _cffi_req.Session.__init__

    def _session_init_no_verify(self, *args, **kwargs):
        kwargs.setdefault("verify", False)
        _orig_session_init(self, *args, **kwargs)

    _cffi_req.Session.__init__ = _session_init_no_verify
except Exception:
    pass

import yfinance as _yf


def _load_cache() -> dict:
    if _CACHE_FILE.exists():
        return json.loads(_CACHE_FILE.read_text(encoding="utf-8"))
    return {}


def _save_cache(cache: dict) -> None:
    _CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
    _CACHE_FILE.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")


def _truncate(text: str, max_chars: int = 480) -> str:
    if not text or len(text) <= max_chars:
        return text
    cut = text[:max_chars]
    last_dot = cut.rfind(".")
    return cut[:last_dot + 1] if last_dot > 50 else cut


def _normalize_news_item(item: dict) -> dict:
    published = item.get("published", 0)
    try:
        published = int(published or 0)
    except (TypeError, ValueError):
        published = 0
    return {
        "title": str(item.get("title") or ""),
        "link": str(item.get("link") or ""),
        "publisher": str(item.get("publisher") or ""),
        "published": published,
    }


def _parse_news_item(n: dict) -> dict:
    c = n.get("content") or {}
    if c:
        pub_date = c.get("pubDate", "")
        try:
            from datetime import datetime
            ts = int(datetime.fromisoformat(pub_date.replace("Z", "+00:00")).timestamp()) if pub_date else 0
        except Exception:
            ts = 0
        url = (c.get("canonicalUrl") or {}).get("url", "") or (c.get("clickThroughUrl") or {}).get("url", "")
        provider = (c.get("provider") or {}).get("displayName", "")
        return _normalize_news_item({"title": c.get("title", ""), "link": url, "publisher": provider, "published": ts})
    return _normalize_news_item({
        "title": n.get("title", ""),
        "link": n.get("link", ""),
        "publisher": n.get("publisher", ""),
        "published": n.get("providerPublishTime", 0),
    })


def _yf_fetch(key: str) -> tuple[dict, list]:
    t = _yf.Ticker(key)
    info: dict = {}
    try:
        info = t.info or {}
    except Exception:
        pass
    news_raw: list = []
    try:
        news_raw = t.news or []
    except Exception:
        pass
    return info, news_raw


def get_ticker_news(ticker: str, limit: int = 2) -> list[dict]:
    """Fetch recent Yahoo Finance news for a ticker (best-effort)."""
    key = ticker.strip().upper()
    if not key:
        return []
    try:
        news_raw = _EXEC.submit(lambda: _yf.Ticker(key).news or []).result(timeout=_YF_TIMEOUT)
    except (FutureTimeout, Exception):
        return []
    items = [_parse_news_item(n) for n in news_raw if n]
    return [i for i in items if i.get("title")][:limit]


def get_company(ticker: str) -> dict:
    key = ticker.strip().upper()
    if not key or not re.fullmatch(r"[A-Z0-9.-]{1,12}", key):
        raise ValueError(f"Invalid ticker: {ticker!r}")

    cache = _load_cache()
    entry = cache.get(key)
    if entry and time.time() - entry.get("ts", 0) < _TTL:
        return entry["data"]

    info: dict = {}
    news_raw: list = []
    try:
        info, news_raw = _EXEC.submit(_yf_fetch, key).result(timeout=_YF_TIMEOUT)
    except FutureTimeout:
        pass
    except Exception:
        pass

    news = [_parse_news_item(n) for n in news_raw[:3] if n]
    news = [n for n in news if n["title"]]

    summary = _truncate(info.get("longBusinessSummary") or "")
    data = {
        "ticker": key,
        "name": info.get("longName") or info.get("shortName") or key,
        "sector": info.get("sector") or "—",
        "industry": info.get("industry") or "—",
        "country": info.get("country") or "—",
        "website": info.get("website") or "",
        "summary": summary or "No description available.",
        "news": news,
    }

    cache[key] = {"ts": time.time(), "data": data}
    try:
        _save_cache(cache)
    except OSError:
        pass
    return data
