import delta_detector
from sec_client import fetch_latest, fetch_previous

c, cm = fetch_latest()
p, pm = fetch_previous()

print("=== CURRENT Q1 MU positions ===")
for _, r in c[c["ticker"] == "MU"].sort_values("value", ascending=False).iterrows():
    pc = r.get("putCall") or "SHARE"
    print(f"  {pc:5}  value=${r['value']:,.0f}k  contracts/shares={r['sshPrnamt']}")

print("\n=== PREVIOUS Q4 MU positions ===")
for _, r in p[p["ticker"] == "MU"].sort_values("value", ascending=False).iterrows():
    pc = r.get("putCall") or "SHARE"
    print(f"  {pc:5}  value=${r['value']:,.0f}k  contracts/shares={r['sshPrnamt']}")

print("\n=== DELTA for MU ===")
d = delta_detector.compute_delta(c, p)
for status in ("new", "closed", "increased", "decreased"):
    for pos in d.get(status, []):
        if pos.get("ticker") == "MU":
            pc = pos.get("putCall") or "SHARE"
            print(
                f"  {status.upper():10} {pc:5}  "
                f"value=${pos.get('value', 0):,.0f}k  pct={pos.get('pct_change')}"
            )

print("\n=== ALL MU in current filing (net view) ===")
puts = c[(c["ticker"] == "MU") & (c["putCall"] == "Put")]["value"].sum()
calls = c[(c["ticker"] == "MU") & (c["putCall"] == "Call")]["value"].sum()
shares = c[(c["ticker"] == "MU") & (c["putCall"].isna())]["value"].sum()
print(f"  Shares: ${shares:,.0f}k")
print(f"  Calls:  ${calls:,.0f}k")
print(f"  Puts:   ${puts:,.0f}k")
print(f"  Net bullish (sh+call): ${shares+calls:,.0f}k")
print(f"  Net bearish (puts):    ${puts:,.0f}k")
