import json
import time
from datetime import date, timedelta
from pathlib import Path

_CACHE_FILE = Path(__file__).parent.parent / "data" / "alpha_cache.json"
_TTL = 3600  # 1 hour

# Same SSL patch as company_client.py — must run before yfinance import
try:
    from curl_cffi import requests as _cffi_req
    _orig_init = _cffi_req.Session.__init__

    def _session_init_no_verify(self, *args, **kwargs):
        kwargs.setdefault("verify", False)
        _orig_init(self, *args, **kwargs)

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
    _CACHE_FILE.write_text(json.dumps(cache, indent=2), encoding="utf-8")


def compute_alpha(holdings: list[dict], total_aum: float, period_of_report: str) -> dict:
    """
    Weighted portfolio return vs SPY since period_of_report.
    holdings: list of {"ticker": str, "value": float}
    total_aum: sum of values (same unit as value fields)
    Returns percentages (e.g. 14.2 means +14.2%).
    """
    today = date.today().isoformat()
    cache_key = f"{period_of_report}_{today}"

    cache = _load_cache()
    entry = cache.get(cache_key)
    if entry and time.time() - entry.get("ts", 0) < _TTL:
        return entry["data"]

    weighted = [
        {"ticker": h["ticker"], "weight": h["value"] / total_aum}
        for h in holdings
        if h.get("ticker") and total_aum > 0
    ]

    null_result: dict = {
        "alpha": None, "portfolio_return": None, "spy_return": None,
        "period": period_of_report, "covered": 0, "total": len(weighted),
    }

    if not weighted:
        return null_result

    tickers = [w["ticker"] for w in weighted] + ["SPY"]
    end_date = (date.today() + timedelta(days=1)).isoformat()

    try:
        import pandas as pd

        raw = _yf.download(
            tickers,
            start=period_of_report,
            end=end_date,
            auto_adjust=True,
            progress=False,
            threads=True,
        )

        if raw is None or raw.empty:
            return null_result

        prices = raw["Close"] if isinstance(raw.columns, pd.MultiIndex) else raw

        first = prices.iloc[0]
        last  = prices.iloc[-1]

        def ret(t: str):
            s, e = first.get(t), last.get(t)
            if s is None or e is None or pd.isna(s) or pd.isna(e) or float(s) == 0:
                return None
            return (float(e) - float(s)) / float(s)

        spy_r = ret("SPY")

        port_r = 0.0
        covered_w = 0.0
        covered_n = 0
        for w in weighted:
            r = ret(w["ticker"])
            if r is not None:
                port_r += w["weight"] * r
                covered_w += w["weight"]
                covered_n += 1

        if covered_w < 0.01:
            return null_result

        port_r_norm = port_r / covered_w
        alpha = (port_r_norm - spy_r) if spy_r is not None else None

        data = {
            "alpha":            round(alpha * 100, 1) if alpha is not None else None,
            "portfolio_return": round(port_r_norm * 100, 1),
            "spy_return":       round(spy_r * 100, 1) if spy_r is not None else None,
            "period":           period_of_report,
            "covered":          covered_n,
            "total":            len(weighted),
        }

    except Exception as exc:
        data = {**null_result, "error": str(exc)[:200]}

    cache[cache_key] = {"ts": time.time(), "data": data}
    _save_cache(cache)
    return data
