import requests

r = requests.get("http://localhost:8000/api/movers")
data = r.json()
print("RAW LOSERS (as returned by API):")
for m in data["losers"]:
    print(f"  pct={m['pct_change']:+.2f}  val={m['value_change_thousands']:,.0f}  {m.get('ticker')}/{m.get('putCall')} {m['issuer']}")

# Also test the sort logic manually
print()
print("Manual sort test:")
items = data["losers"] + [
    {"pct_change": -100.0, "value_change_thousands": -746760.0, "ticker": "INTC", "putCall": "Call", "issuer": "INTEL"},
    {"pct_change": -100.0, "value_change_thousands": -37520.0, "ticker": "EQT", "putCall": "Call", "issuer": "EQT"},
    {"pct_change": -100.0, "value_change_thousands": -154524.0, "ticker": "CIFR", "putCall": None, "issuer": "CIPHER"},
]
items_sorted = sorted(items, key=lambda m: (m["pct_change"], m["value_change_thousands"]))
for m in items_sorted[:5]:
    print(f"  pct={m['pct_change']:+.2f}  val={m['value_change_thousands']:,.0f}  {m.get('ticker')}")
