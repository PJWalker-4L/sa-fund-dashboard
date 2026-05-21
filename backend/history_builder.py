"""Build quarterly 13F exposure timeline with static external annotations."""

import sec_client
from models import (
    HistoryResponse,
    HistoryPoint,
    HistoryAnnotation,
    PerformanceBadge,
)

ANNOTATIONS = [
    {
        "quarter": "Q4 2024",
        "kind": "launch",
        "label": "Fund launch",
        "detail": "~$254M seed capital (Sep 2024)",
        "value_billions": None,
    },
    {
        "quarter": "Q4 2025",
        "kind": "regulatory_aum",
        "label": "Regulatory AUM",
        "detail": "$9.3B per Form ADV (31 Dec 2025)",
        "value_billions": 9.3,
    },
    {
        "quarter": "Q1 2026",
        "kind": "caveat",
        "label": "Options overlay",
        "detail": "62% puts; 13F notional exceeds NAV",
        "value_billions": None,
    },
]

PERFORMANCE_BADGES = [
    {"label": "H1 2025", "return_pct": 47.0, "benchmark": "SPY +6%"},
    {"label": "LTM", "return_pct": 61.3, "benchmark": "SPY +16.3%"},
]

DISCLAIMER = (
    "13F reported notional is not fund NAV. Large put positions inflate headline exposure; "
    "Q1 2026 ADV AUM was $9.3B vs $13.7B 13F notional."
)


def build_history() -> HistoryResponse:
    summaries = sec_client.fetch_all_filing_summaries()

    points = [
        HistoryPoint(
            quarter=s["quarter"],
            period_of_report=s["period_of_report"],
            accession_number=s["accession_number"],
            total_thousands=round(s["total_thousands"], 1),
            shares_thousands=round(s["shares_thousands"], 1),
            calls_thousands=round(s["calls_thousands"], 1),
            puts_thousands=round(s["puts_thousands"], 1),
            shares_pct=s["shares_pct"],
            calls_pct=s["calls_pct"],
            puts_pct=s["puts_pct"],
        )
        for s in summaries
    ]

    return HistoryResponse(
        points=points,
        annotations=[HistoryAnnotation(**a) for a in ANNOTATIONS],
        performance_badges=[PerformanceBadge(**b) for b in PERFORMANCE_BADGES],
        disclaimer=DISCLAIMER,
    )
