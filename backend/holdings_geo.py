"""Static geo lookup for holdings map — ticker → city/country/lat/lng."""

import json
from pathlib import Path

_GEO_FILE = Path(__file__).parent / "data" / "holdings_geo.json"


def load_geo_lookup() -> dict[str, dict]:
    if not _GEO_FILE.exists():
        return {}
    raw = json.loads(_GEO_FILE.read_text(encoding="utf-8"))
    return {k.upper(): v for k, v in raw.items() if isinstance(v, dict)}


def save_geo_lookup(data: dict[str, dict]) -> None:
    _GEO_FILE.parent.mkdir(parents=True, exist_ok=True)
    normalized = {k.upper(): v for k, v in sorted(data.items())}
    _GEO_FILE.write_text(
        json.dumps(normalized, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def build_map_points(holdings: list[dict]) -> tuple[list[dict], list[str]]:
    """Join holdings with geo lookup. Returns (points, unmapped_tickers)."""
    lookup = load_geo_lookup()
    points: list[dict] = []
    unmapped: set[str] = set()

    for h in holdings:
        ticker = str(h.get("ticker") or "").strip().upper()
        if not ticker:
            continue
        geo = lookup.get(ticker)
        if not geo or geo.get("lat") is None or geo.get("lng") is None:
            unmapped.add(ticker)
            continue
        points.append({
            "ticker": ticker,
            "name": str(h.get("nameOfIssuer") or geo.get("name") or ticker),
            "value": float(h.get("value") or 0),
            "putCall": h.get("putCall"),
            "city": str(geo.get("city") or ""),
            "country": str(geo.get("country") or ""),
            "lat": float(geo["lat"]),
            "lng": float(geo["lng"]),
            "thesis_role": h.get("thesis_role"),
        })

    return points, sorted(unmapped)
