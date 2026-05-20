import json
import math
import os
import time
import pandas as pd
from pathlib import Path
from typing import Optional

_DATA = Path("/tmp/sa-cache") if os.getenv("VERCEL") else Path(__file__).parent.parent / "data"
_HOLDINGS_CACHE = _DATA / "holdings_cache.json"
_ANALYSIS_CACHE = _DATA / "analysis_cache.json"
_STRATEGY_CACHE = _DATA / "strategy_cache.json"

CACHE_TTL = 4 * 3600  # 4 hours — 13F filings are quarterly, no need to re-fetch often


def normalize_put_call(val) -> Optional[str]:
    if val is None or val == "" or (isinstance(val, float) and pd.isna(val)):
        return None
    return str(val)


def _clean_put_call(df: pd.DataFrame) -> pd.DataFrame:
    if "putCall" not in df.columns:
        return df
    out = df.copy()
    out["putCall"] = [
        None
        if x is None or x == "" or (isinstance(x, float) and pd.isna(x))
        else str(x)
        for x in out["putCall"]
    ]
    return out


def _sanitize_for_json(obj):
    if isinstance(obj, dict):
        return {k: _sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_for_json(v) for v in obj]
    if isinstance(obj, float) and math.isnan(obj):
        return None
    return obj


def _records_for_json(df: pd.DataFrame) -> list[dict]:
    df = _clean_put_call(df)
    records = df.to_dict(orient="records")
    for row in records:
        pc = row.get("putCall")
        if pc is None or (isinstance(pc, float) and pd.isna(pc)) or pc == "":
            row["putCall"] = None
    return records


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
        "current_holdings": _records_for_json(curr_df),
        "prev_holdings": _records_for_json(prev_df) if prev_df is not None else None,
    }
    _HOLDINGS_CACHE.write_text(
        json.dumps(_sanitize_for_json(payload), indent=2),
        encoding="utf-8",
    )


def load_holdings_cache(
    ttl: int = CACHE_TTL,
) -> Optional[tuple[pd.DataFrame, dict, Optional[pd.DataFrame], Optional[dict]]]:
    if not _HOLDINGS_CACHE.exists():
        return None
    payload = json.loads(_HOLDINGS_CACHE.read_text(encoding="utf-8"))
    if time.time() - payload.get("ts", 0) > ttl:
        return None
    prev_df = pd.DataFrame(payload["prev_holdings"]) if payload.get("prev_holdings") else None
    curr_df = _clean_put_call(pd.DataFrame(payload["current_holdings"]))
    if prev_df is not None:
        prev_df = _clean_put_call(prev_df)
    return (
        curr_df,
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


def invalidate_analysis_cache() -> None:
    if _ANALYSIS_CACHE.exists():
        _ANALYSIS_CACHE.unlink()


def invalidate_llm_caches() -> None:
    invalidate_analysis_cache()
    invalidate_strategy_cache()


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
