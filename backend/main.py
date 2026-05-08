from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

import sec_client
import delta_detector
import state_manager
import llm_analyzer
import company_client
import alpha_calculator
from sectors import classify
from models import (
    HoldingsResponse, AnalysisResponse, FilingMeta, HoldingRow,
    DeltaSummary, BucketAllocation, MoversResponse, MoverItem,
    CompanyInfoResponse, NewsItem, AlphaResponse,
)

app = FastAPI(title="SA Fund Dashboard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def _fetch_live():
    curr_df, curr_meta = sec_client.fetch_latest()
    prev_df, prev_meta = sec_client.fetch_previous()
    state_manager.save_holdings_cache(curr_df, curr_meta, prev_df, prev_meta)
    return curr_df, curr_meta, prev_df, prev_meta


def _get_data():
    cached = state_manager.load_holdings_cache()
    if cached:
        return cached
    return _fetch_live()


def _build_holdings_response(
    curr_df: pd.DataFrame,
    curr_meta: dict,
    prev_df,
    prev_meta,
) -> HoldingsResponse:
    delta = delta_detector.compute_delta(curr_df, prev_df)

    # Build a lookup of key → delta info for all changed positions
    delta_lookup: dict[str, dict] = {}
    for status_key in ("new", "closed", "increased", "decreased", "unchanged"):
        for pos in delta.get(status_key, []):
            k = f"{pos.get('cusip', '')}_{pos.get('putCall') or 'SHARE'}"
            delta_lookup[k] = {
                "status": pos.get("status"),
                "value_change": pos.get("value_change"),
                "shares_change": pos.get("shares_change"),
                "pct_change": pos.get("pct_change"),
            }

    holdings: list[HoldingRow] = []
    total_value = 0.0
    call_count = put_count = share_count = 0

    for _, row in curr_df.iterrows():
        rd = row.to_dict()
        k = f"{rd.get('cusip', '')}_{rd.get('putCall') or 'SHARE'}"
        di = delta_lookup.get(k, {"status": "UNCHANGED", "value_change": 0.0, "shares_change": 0.0, "pct_change": 0.0})
        val = float(rd.get("value") or 0)
        total_value += val
        put_call = rd.get("putCall") or None
        if put_call == "Call":
            call_count += 1
        elif put_call == "Put":
            put_count += 1
        else:
            share_count += 1
        holdings.append(HoldingRow(
            nameOfIssuer=str(rd.get("nameOfIssuer", "")),
            cusip=str(rd.get("cusip", "")),
            ticker=str(rd.get("ticker") or "") or None,
            titleOfClass=str(rd.get("titleOfClass", "")) or None,
            value=val,
            sshPrnamt=float(rd.get("sshPrnamt") or 0),
            sshPrntype=str(rd.get("sshPrntype", "")) or None,
            putCall=put_call,
            status=di["status"],
            value_change=di["value_change"],
            shares_change=di["shares_change"],
            pct_change=di["pct_change"],
            bucket=classify(str(rd.get("ticker") or ""), str(rd.get("nameOfIssuer", ""))),
        ))

    holdings.sort(key=lambda h: h.value, reverse=True)

    top = holdings[0] if holdings else None
    top_pct = round(top.value / total_value * 100, 1) if (top and total_value) else None

    bucket_totals: dict[str, float] = {}
    for h in holdings:
        b = h.bucket or "Other"
        bucket_totals[b] = bucket_totals.get(b, 0.0) + h.value
    buckets = [
        BucketAllocation(
            label=label,
            value_thousands=v,
            pct=round(v / total_value * 100, 1) if total_value else 0.0,
        )
        for label, v in sorted(bucket_totals.items(), key=lambda x: -x[1])
    ]

    return HoldingsResponse(
        meta=FilingMeta(**curr_meta),
        prev_meta=FilingMeta(**prev_meta) if prev_meta else None,
        holdings=holdings,
        delta=DeltaSummary(
            new_count=len(delta.get("new", [])),
            closed_count=len(delta.get("closed", [])),
            increased_count=len(delta.get("increased", [])),
            decreased_count=len(delta.get("decreased", [])),
        ),
        total_aum_thousands=total_value,
        top_holding_name=top.nameOfIssuer if top else None,
        top_holding_pct=top_pct,
        call_count=call_count,
        put_count=put_count,
        share_count=share_count,
        buckets=buckets,
    )


@app.get("/api/holdings", response_model=HoldingsResponse)
async def get_holdings():
    try:
        curr_df, curr_meta, prev_df, prev_meta = _get_data()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"SEC data fetch failed: {e}")
    return _build_holdings_response(curr_df, curr_meta, prev_df, prev_meta)


@app.get("/api/analysis", response_model=AnalysisResponse)
async def get_analysis():
    try:
        curr_df, curr_meta, prev_df, prev_meta = _get_data()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"SEC data fetch failed: {e}")

    delta = delta_detector.compute_delta(curr_df, prev_df)
    filing_pair = (
        f"{curr_meta.get('accession_number', 'curr')}"
        f"__{(prev_meta or {}).get('accession_number', 'none')}"
    )
    text, was_cached = await llm_analyzer.analyze_delta(delta, curr_meta, prev_meta or {})
    return AnalysisResponse(analysis=text, cached=was_cached, filing_pair=filing_pair)


_filing_check_cache: dict = {}
_FILING_CHECK_TTL = 5 * 60  # recheck SEC EDGAR at most every 5 minutes


@app.get("/api/check-new-filing")
async def check_new_filing():
    now = __import__("time").time()
    if _filing_check_cache.get("ts", 0) + _FILING_CHECK_TTL > now:
        return _filing_check_cache["data"]

    try:
        latest = sec_client.get_latest_meta()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"SEC EDGAR check failed: {e}")

    cached = state_manager.load_holdings_cache()
    current_accession = cached[1].get("accession_number", "") if cached else ""

    data = {
        "has_new": latest["accession_number"] != current_accession,
        "latest_period": latest["period_of_report"],
        "latest_filed": latest["filed"],
        "latest_accession": latest["accession_number"],
        "current_accession": current_accession,
    }
    _filing_check_cache["ts"] = now
    _filing_check_cache["data"] = data
    return data


@app.post("/api/refresh")
async def refresh():
    state_manager.invalidate_holdings_cache()
    try:
        _, curr_meta, _, _ = _fetch_live()
        return {"status": "refreshed", "period": curr_meta["period_of_report"]}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"SEC data fetch failed: {e}")


@app.get("/api/movers", response_model=MoversResponse)
async def get_movers():
    try:
        curr_df, curr_meta, prev_df, prev_meta = _get_data()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"SEC data fetch failed: {e}")

    delta = delta_detector.compute_delta(curr_df, prev_df)

    all_movers: list[MoverItem] = []
    for status_key in ("increased", "decreased", "new", "closed"):
        for pos in delta.get(status_key, []):
            pct = pos.get("pct_change")
            if pct is None:
                pct = 100.0 if status_key == "new" else -100.0
            all_movers.append(MoverItem(
                issuer=str(pos.get("nameOfIssuer", ""))[:24],
                cusip=str(pos.get("cusip", "")),
                ticker=str(pos.get("ticker") or "") or None,
                putCall=pos.get("putCall"),
                pct_change=round(float(pct), 2),
                value_change_thousands=float(pos.get("value_change") or 0),
            ))

    all_movers.sort(key=lambda m: m.pct_change, reverse=True)
    gainers = [m for m in all_movers if m.pct_change > 0][:5]
    losers = list(reversed([m for m in all_movers if m.pct_change < 0]))[:5]

    period = (
        f"{prev_meta['period_of_report']} → {curr_meta['period_of_report']}"
        if prev_meta else curr_meta["period_of_report"]
    )
    return MoversResponse(gainers=gainers, losers=losers, period=period)


@app.get("/api/alpha", response_model=AlphaResponse)
async def get_alpha():
    try:
        curr_df, curr_meta, _, _ = _get_data()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"SEC data fetch failed: {e}")

    holdings = [
        {"ticker": str(row.get("ticker") or ""), "value": float(row.get("value") or 0)}
        for _, row in curr_df.iterrows()
        if row.get("ticker")
    ]
    total_aum = float(curr_df["value"].sum()) if "value" in curr_df.columns else 0.0
    result = alpha_calculator.compute_alpha(holdings, total_aum, curr_meta["period_of_report"])
    return AlphaResponse(**result)


@app.get("/api/company/{ticker}", response_model=CompanyInfoResponse)
async def get_company(ticker: str):
    try:
        data = company_client.get_company(ticker)
        return CompanyInfoResponse(
            ticker=data["ticker"],
            name=data["name"],
            sector=data["sector"],
            industry=data["industry"],
            country=data["country"],
            website=data["website"],
            summary=data["summary"],
            news=[NewsItem(**n) for n in data.get("news", [])],
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Company data fetch failed: {e}")
