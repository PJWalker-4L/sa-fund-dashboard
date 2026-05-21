import delta_detector
from sec_client import fetch_latest, fetch_previous
from state_manager import normalize_put_call
from models import MoverItem

c, cm = fetch_latest()
p, pm = fetch_previous()
d = delta_detector.compute_delta(c, p)

all_movers = []
for status_key in ("increased", "decreased", "new", "closed"):
    for pos in d.get(status_key, []):
        pct = pos.get("pct_change")
        if pct is None:
            pct = 100.0 if status_key == "new" else -100.0
        all_movers.append(MoverItem(
            issuer=str(pos.get("nameOfIssuer", ""))[:24],
            cusip=str(pos.get("cusip", "")),
            ticker=str(pos.get("ticker") or "") or None,
            putCall=normalize_put_call(pos.get("putCall")),
            pct_change=round(float(pct), 2),
            value_change_thousands=float(pos.get("value_change") or 0),
        ))

losers_raw = [m for m in all_movers if m.pct_change < 0]
print(f"Total losers before sort: {len(losers_raw)}")
print("Before sort:")
for m in losers_raw:
    print(f"  {m.ticker:6} {m.pct_change:+.1f}%  val={m.value_change_thousands:,.0f}")

losers_raw.sort(key=lambda m: (m.pct_change, m.value_change_thousands))
print()
print("After sort (top 5):")
for m in losers_raw[:5]:
    print(f"  {m.ticker:6} {m.pct_change:+.1f}%  val={m.value_change_thousands:,.0f}  {m.issuer}")
