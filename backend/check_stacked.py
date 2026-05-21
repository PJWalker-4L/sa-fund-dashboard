import delta_detector
import llm_analyzer
from sec_client import fetch_latest, fetch_previous

c, _ = fetch_latest()
p, _ = fetch_previous()
d = delta_detector.compute_delta(c, p)

print("=== STACKED CONVICTION (current logic) ===")
print(llm_analyzer._stacked_conviction(d))

print("\n=== FULL PICTURE for stacked tickers ===")
stacked_tickers = ["SNDK", "MU", "TSM"]
for ticker in stacked_tickers:
    puts = c[(c["ticker"] == ticker) & (c["putCall"] == "Put")]["value"].sum()
    calls = c[(c["ticker"] == ticker) & (c["putCall"] == "Call")]["value"].sum()
    shares = c[(c["ticker"] == ticker) & (c["putCall"].isna())]["value"].sum()
    print(f"\n{ticker}:")
    print(f"  Shares: ${shares:,.0f}k")
    print(f"  Calls:  ${calls:,.0f}k")
    print(f"  Puts:   ${puts:,.0f}k")
    if puts > 0:
        print(f"  >>> HAS PUTS — stacked-long label is misleading")
