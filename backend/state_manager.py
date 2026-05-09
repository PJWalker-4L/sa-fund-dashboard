import json
import time
import pandas as pd
from pathlib import Path
from typing import Optional

_DATA = Path(__file__).parent.parent / "data"
_HOLDINGS_CACHE = _DATA / "holdings_cache.json"
_ANALYSIS_CACHE = _DATA / "analysis_cache.json"
_STRATEGY_CACHE = _DATA / "strategy_cache.json"

CACHE_TTL = 4 * 3600  # 4 hours — 13F filings are quarterly, no need to re-fetch often


def save_holdings_cache(
    curr_df: pd.DataFrame,
    curr_meta: dict,
    prev_df: Optional[pd.DataFrame],
    prev_meta: Optional[dict],
) -> None:
    _DATA.mkdir(exist_ok=True)
    payload = {
        "ts": time.time(),
        "curr_meta": curr_meta,
        "prev_meta": prev_meta,
        "current_holdings": curr_df.to_dict(orient="records"),
        "prev_holdings": prev_df.to_dict(orient="records") if prev_df is not None else None,
    }
    _HOLDINGS_CACHE.write_text(json.dumps(payload, default=str, indent=2), encoding="utf-8")


def load_holdings_cache(
    ttl: int = CACHE_TTL,
) -> Optional[tuple[pd.DataFrame, dict, Optional[pd.DataFrame], Optional[dict]]]:
    if not _HOLDINGS_CACHE.exists():
        return None
    payload = json.loads(_HOLDINGS_CACHE.read_text(encoding="utf-8"))
    if time.time() - payload.get("ts", 0) > ttl:
        return None
    prev_df = pd.DataFrame(payload["prev_holdings"]) if payload.get("prev_holdings") else None
    return (
        pd.DataFrame(payload["current_holdings"]),
        payload["curr_meta"],
        prev_df,
        payload.get("prev_meta"),
    )


def invalidate_holdings_cache() -> None:
    if _HOLDINGS_CACHE.exists():
        _HOLDINGS_CACHE.unlink()


def get_cached_analysis(filing_pair: str) -> Optional[str]:
    if not _ANALYSIS_CACHE.exists():
        return None
    cache = json.loads(_ANALYSIS_CACHE.read_text(encoding="utf-8"))
    return cache.get(filing_pair)


def save_analysis(filing_pair: str, text: str) -> None:
    _DATA.mkdir(exist_ok=True)
    cache: dict = {}
    if _ANALYSIS_CACHE.exists():
        cache = json.loads(_ANALYSIS_CACHE.read_text(encoding="utf-8"))
    cache[filing_pair] = text
    _ANALYSIS_CACHE.write_text(json.dumps(cache, indent=2), encoding="utf-8")


def get_cached_strategy(filing_key: str) -> Optional[str]:
    if not _STRATEGY_CACHE.exists():
        return None
    cache = json.loads(_STRATEGY_CACHE.read_text(encoding="utf-8"))
    return cache.get(filing_key)


def invalidate_strategy_cache() -> None:
    if _STRATEGY_CACHE.exists():
        _STRATEGY_CACHE.unlink()


def save_strategy(filing_key: str, text: str) -> None:
    _DATA.mkdir(exist_ok=True)
    cache: dict = {}
    if _STRATEGY_CACHE.exists():
        cache = json.loads(_STRATEGY_CACHE.read_text(encoding="utf-8"))
    cache[filing_key] = text
    _STRATEGY_CACHE.write_text(json.dumps(cache, indent=2), encoding="utf-8")
