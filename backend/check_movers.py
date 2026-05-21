import requests

r = requests.get("http://localhost:8000/api/movers")
data = r.json()
print("LOSERS:")
for m in data["losers"]:
    ticker = m.get("ticker") or "?"
    pc = m.get("putCall") or "SH"
    pct = m["pct_change"]
    val = m["value_change_thousands"]
    issuer = m["issuer"]
    print(f"  {ticker:6} {pc:4}  {pct:+.1f}%  val_change=${val:,.0f}k  {issuer}")
