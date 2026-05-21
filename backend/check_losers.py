import delta_detector
from sec_client import fetch_latest, fetch_previous

c, cm = fetch_latest()
p, pm = fetch_previous()
d = delta_detector.compute_delta(c, p)

print("=== CLOSED ===")
for pos in d.get("closed", []):
    ticker = pos.get("ticker") or "—"
    name = (pos.get("nameOfIssuer") or "?")[:35]
    pc = pos.get("putCall") or "SH"
    val_prev = pos.get("value", 0) or 0
    print(f"{ticker:6} | {name:35} | {pc:4} | prev_value=${val_prev:>10,}k | pct={pos.get('pct_change')}")

print()
print("=== DECREASED (top 10 worst) ===")
for pos in sorted(d.get("decreased", []), key=lambda x: x.get("pct_change") or 0)[:10]:
    ticker = pos.get("ticker") or "—"
    name = (pos.get("nameOfIssuer") or "?")[:35]
    pc = pos.get("putCall") or "SH"
    val = pos.get("value", 0) or 0
    print(f"{ticker:6} | {name:35} | {pc:4} | value=${val:>10,}k | pct={pos.get('pct_change'):.1f}%")
