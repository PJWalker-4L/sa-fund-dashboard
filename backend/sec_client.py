import pandas as pd
from typing import Optional

# Correct CIK for the 13F-HR filer (Situational Awareness LP, the investment adviser)
# CIK 0002038540 is the LP entity — only holds Form D filings
_CIK = "0002045724"
_IDENTITY = "Sebastian Valmont sebastianvalmont28@gmail.com"
_FORM = "13F-HR"

# edgartools v5 column names → internal names used by the rest of the app
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


def _init():
    from edgar import configure_http, set_identity
    configure_http(use_system_certs=True)
    set_identity(_IDENTITY)


def _filings():
    from edgar import Company
    _init()
    return Company(_CIK).get_filings(form=_FORM)


def _normalize(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize edgartools v5 column names; convert Value (USD) → thousands."""
    df = df.rename(columns={k: v for k, v in _COL_MAP.items() if k in df.columns})
    # edgartools v5 returns Value in actual USD; divide by 1000 → thousands
    # so all downstream formatting code (fmtValue, fmtAUM) stays consistent
    if "value" in df.columns:
        df["value"] = df["value"] / 1000.0
    # Normalize putCall: empty string → None
    if "putCall" in df.columns:
        df["putCall"] = df["putCall"].replace({"": None}).where(df["putCall"].notna(), None)
    return df


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
    return _normalize(filing.obj().holdings), _meta(filing)


def fetch_previous() -> tuple[Optional[pd.DataFrame], Optional[dict]]:
    filings = _filings()
    if len(filings) < 2:
        return None, None
    filing = filings[1]
    return _normalize(filing.obj().holdings), _meta(filing)
