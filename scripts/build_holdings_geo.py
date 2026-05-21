#!/usr/bin/env python3
"""
One-time / quarterly generator for backend/data/holdings_geo.json.

Usage (from repo root):
  python scripts/build_holdings_geo.py

Reads current holdings (cache or live SEC), fetches city/country via yfinance,
resolves coordinates via city lookup + country centroids, merges into JSON.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

import holdings_geo  # noqa: E402
import state_manager  # noqa: E402
import sec_client  # noqa: E402

try:
    import yfinance as yf
except ImportError:
    print("yfinance required: pip install yfinance")
    sys.exit(1)

# Common HQ cities → [lat, lng]
CITY_COORDS: dict[str, tuple[float, float]] = {
    "San Jose": (37.3382, -121.8863),
    "Santa Clara": (37.3541, -121.9552),
    "Palo Alto": (37.4419, -122.1430),
    "San Francisco": (37.7749, -122.4194),
    "San Diego": (32.7157, -117.1611),
    "Fremont": (37.5485, -121.9886),
    "Milpitas": (37.4323, -121.8996),
    "Boise": (43.6150, -116.2023),
    "Irving": (32.8140, -96.9489),
    "Houston": (29.7604, -95.3698),
    "Dallas": (32.7767, -96.7970),
    "Austin": (30.2672, -97.7431),
    "New York": (40.7128, -74.0060),
    "Baltimore": (39.2904, -76.6122),
    "Pittsburgh": (40.4406, -79.9959),
    "Las Vegas": (36.1699, -115.1398),
    "Tempe": (33.4255, -111.9400),
    "Norwalk": (41.1176, -73.4079),
    "Roseland": (40.8207, -74.2999),
    "Castle Rock": (39.3722, -104.8561),
    "Sydney": (-33.8688, 151.2093),
    "Toronto": (43.6532, -79.3832),
    "Singapore": (1.3521, 103.8198),
    "Hsinchu": (24.8066, 120.9686),
    "Migdal HaEmek": (32.6750, 35.2390),
    "Juno Beach": (26.8797, -80.0534),
    "Tysons": (38.9187, -77.2311),
    "Saxonburg": (40.7540, -79.8109),
    "Barberton": (41.0128, -81.6051),
    "Wood Dale": (41.9634, -87.9789),
}

COUNTRY_CENTROIDS: dict[str, tuple[float, float]] = {
    "United States": (39.8283, -98.5795),
    "Canada": (56.1304, -106.3468),
    "Australia": (-25.2744, 133.7751),
    "Singapore": (1.3521, 103.8198),
    "Taiwan": (23.6978, 120.9605),
    "Israel": (31.0461, 34.8516),
    "Japan": (36.2048, 138.2529),
    "Netherlands": (52.1326, 5.2913),
    "Ireland": (53.4129, -8.2439),
    "United Kingdom": (55.3781, -3.4360),
    "Germany": (51.1657, 10.4515),
    "China": (35.8617, 104.1954),
    "South Korea": (35.9078, 127.7669),
}


def _resolve_coords(city: str, country: str) -> tuple[float, float] | None:
    if city:
        for name, coords in CITY_COORDS.items():
            if name.lower() in city.lower() or city.lower() in name.lower():
                return coords
    if country:
        for name, coords in COUNTRY_CENTROIDS.items():
            if name.lower() in country.lower() or country.lower() in name.lower():
                return coords
    return None


def _load_holdings_tickers() -> list[str]:
    cached = state_manager.load_holdings_cache()
    if cached:
        df = cached[0]
    else:
        print("No cache — fetching live SEC data…")
        df, _ = sec_client.fetch_latest()
    tickers = sorted({
        str(row.get("ticker") or "").strip().upper()
        for _, row in df.iterrows()
        if row.get("ticker")
    })
    return tickers


def _fetch_yf_location(ticker: str) -> tuple[str, str]:
    try:
        info = yf.Ticker(ticker).info or {}
    except Exception:
        return "", ""
    city = str(info.get("city") or "").strip()
    country = str(info.get("country") or info.get("countryName") or "").strip()
    return city, country


def main() -> None:
    existing = holdings_geo.load_geo_lookup()
    tickers = _load_holdings_tickers()
    print(f"Processing {len(tickers)} tickers…")

    updated = dict(existing)
    added = 0

    for i, ticker in enumerate(tickers):
        if ticker in updated and updated[ticker].get("lat") is not None:
            continue
        city, country = _fetch_yf_location(ticker)
        coords = _resolve_coords(city, country)
        if not coords:
            print(f"  SKIP {ticker}: no coords (city={city!r}, country={country!r})")
            continue
        updated[ticker] = {
            "city": city or updated.get(ticker, {}).get("city", ""),
            "country": country or existing.get(ticker, {}).get("country", ""),
            "lat": coords[0],
            "lng": coords[1],
        }
        added += 1
        print(f"  OK   {ticker}: {city}, {country} → {coords}")
        if i < len(tickers) - 1:
            time.sleep(0.3)

    holdings_geo.save_geo_lookup(updated)
    print(f"\nSaved {len(updated)} entries ({added} new/updated) → {holdings_geo._GEO_FILE}")


if __name__ == "__main__":
    main()
