import xml.etree.ElementTree as ET

import pandas as pd
from typing import Optional

# Correct CIK for the 13F-HR filer (Situational Awareness LP, the investment adviser)
# CIK 0002038540 is the LP entity — only holds Form D filings
_CIK = "0002045724"
_IDENTITY = "Sebastian Valmont sebastianvalmont28@gmail.com"
_FORM = "13F-HR"
_NS = "http://www.sec.gov/edgar/document/thirteenf/informationtable"
_NS_MAP = {"ns": _NS}

# edgartools v5 column names → internal names (used for ticker enrichment fallback)
_COL_MAP = {
    "Issuer": "nameOfIssuer",
    "Class": "titleOfClass",
    "Cusip": "cusip",
    "Ticker": "ticker",
    "SharesPrnAmount": "sshPrnamt",
    "Value": "value",
    "Type": "sshPrntype",
    "PutCall": "putCall",
    "SoleVoting": "votingAuthoritySole",
    "SharedVoting": "votingAuthorityShared",
    "NonVoting": "votingAuthorityNone",
}

_SSH_TYPE_MAP = {"SH": "Shares", "PRN": "Principal"}


def _init():
    from edgar import configure_http, set_identity
    configure_http(use_system_certs=True)
    set_identity(_IDENTITY)


def _filings():
    from edgar import Company
    _init()
    return Company(_CIK).get_filings(form=_FORM)


def _text(entry: ET.Element, tag: str) -> str:
    el = entry.find(f"ns:{tag}", _NS_MAP)
    return (el.text or "").strip() if el is not None else ""


def _int_text(entry: ET.Element, path: str) -> int:
    el = entry.find(path, _NS_MAP)
    if el is None or not (el.text or "").strip():
        return 0
    try:
        return int(float(el.text.strip()))
    except ValueError:
        return 0


def _parse_infotable_xml(xml_str: str) -> pd.DataFrame:
    """Parse 13F infotable XML directly — edgartools aggregates away putCall."""
    root = ET.fromstring(xml_str)
    rows: list[dict] = []

    for entry in root.findall(".//ns:infoTable", _NS_MAP):
        raw_put_call = _text(entry, "putCall")
        put_call = raw_put_call.capitalize() if raw_put_call else None
        ssh_type_el = entry.find("ns:shrsOrPrnAmt/ns:sshPrnamtType", _NS_MAP)
        ssh_type_raw = (ssh_type_el.text or "").strip() if ssh_type_el is not None else ""

        rows.append({
            "nameOfIssuer": _text(entry, "nameOfIssuer"),
            "titleOfClass": _text(entry, "titleOfClass"),
            "cusip": _text(entry, "cusip"),
            "value": float(_text(entry, "value") or 0),
            "sshPrnamt": float(_int_text(entry, "ns:shrsOrPrnAmt/ns:sshPrnamt")),
            "sshPrntype": _SSH_TYPE_MAP.get(ssh_type_raw, ssh_type_raw or None),
            "putCall": put_call,
            "votingAuthoritySole": _int_text(entry, "ns:votingAuthority/ns:Sole"),
            "votingAuthorityShared": _int_text(entry, "ns:votingAuthority/ns:Shared"),
            "votingAuthorityNone": _int_text(entry, "ns:votingAuthority/ns:None"),
        })

    return pd.DataFrame(rows)


def _enrich_tickers(df: pd.DataFrame, filing) -> pd.DataFrame:
    """Map CUSIP → ticker via edgartools (best-effort; same CUSIP always same ticker)."""
    try:
        edg = filing.obj().holdings
        if "Ticker" not in edg.columns or "Cusip" not in edg.columns:
            return df
        ticker_map = (
            edg.drop_duplicates("Cusip")
            .set_index("Cusip")["Ticker"]
            .to_dict()
        )
        df = df.copy()
        df["ticker"] = df["cusip"].map(ticker_map)
    except Exception:
        pass
    return df


def _normalize(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize column names; convert Value (USD) → thousands."""
    df = df.rename(columns={k: v for k, v in _COL_MAP.items() if k in df.columns})
    if "value" in df.columns:
        df["value"] = df["value"] / 1000.0
    if "putCall" in df.columns:
        df["putCall"] = [
            None
            if x is None or x == "" or (isinstance(x, float) and pd.isna(x))
            else str(x)
            for x in df["putCall"]
        ]
    return df


def _holdings_from_filing(filing) -> pd.DataFrame:
    obj = filing.obj()
    df = _parse_infotable_xml(obj.infotable_xml)
    df = _enrich_tickers(df, filing)
    return _normalize(df)


def _meta(filing) -> dict:
    return {
        "accession_number": str(filing.accession_number),
        "period_of_report": str(filing.period_of_report),
        "filed": str(filing.filing_date),
    }


def get_latest_meta() -> dict:
    """Return metadata of the newest 13F-HR filing without downloading holdings."""
    filings = _filings()
    return _meta(filings[0])


def fetch_latest() -> tuple[pd.DataFrame, dict]:
    filings = _filings()
    filing = filings[0]
    return _holdings_from_filing(filing), _meta(filing)


def fetch_previous() -> tuple[Optional[pd.DataFrame], Optional[dict]]:
    filings = _filings()
    if len(filings) < 2:
        return None, None
    filing = filings[1]
    return _holdings_from_filing(filing), _meta(filing)
