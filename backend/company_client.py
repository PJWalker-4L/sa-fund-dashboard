import json
import time
from pathlib import Path

_CACHE_FILE = Path(__file__).parent.parent / "data" / "company_cache.json"
_TTL = 24 * 3600

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
    _CACHE_FILE.parent.mkdir(exist_ok=True)
    _CACHE_FILE.write_text(json.dumps(cache, indent=2, ensure_ascii=False), encoding="utf-8")


def _truncate(text: str, max_chars: int = 480) -> str:
    if not text or len(text) <= max_chars:
        return text
    cut = text[:max_chars]
    last_dot = cut.rfind(".")
    return cut[:last_dot + 1] if last_dot > 50 else cut


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
        return {"title": c.get("title", ""), "link": url, "publisher": provider, "published": ts}
    return {
        "title": n.get("title", ""),
        "link": n.get("link", ""),
        "publisher": n.get("publisher", ""),
        "published": n.get("providerPublishTime", 0),
    }


def get_company(ticker: str) -> dict:
    key = ticker.upper()
    cache = _load_cache()
    entry = cache.get(key)
    if entry and time.time() - entry.get("ts", 0) < _TTL:
        return entry["data"]

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

    news = [_parse_news_item(n) for n in news_raw[:3] if n]

    data = {
        "ticker": key,
        "name": info.get("longName") or info.get("shortName") or key,
        "sector": info.get("sector") or "—",
        "industry": info.get("industry") or "—",
        "country": info.get("country") or "—",
        "website": info.get("website") or "",
        "summary": _truncate(info.get("longBusinessSummary") or "No description available."),
        "news": news,
    }

    cache[key] = {"ts": time.time(), "data": data}
    _save_cache(cache)
    return data
