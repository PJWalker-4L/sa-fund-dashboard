import asyncio
import llm_analyzer
from sec_client import fetch_latest
from sectors import thesis_role as get_thesis_role
from state_manager import normalize_put_call


async def run():
    c, cm = fetch_latest()
    holdings = [
        {
            "ticker": str(row.get("ticker") or ""),
            "nameOfIssuer": str(row.get("nameOfIssuer", "")),
            "value": float(row.get("value") or 0),
            "putCall": normalize_put_call(row.get("putCall")),
            "thesis_role": get_thesis_role(str(row.get("ticker") or ""), str(row.get("nameOfIssuer", ""))),
        }
        for _, row in c.iterrows()
    ]
    text, cached = await llm_analyzer.analyze_strategy(holdings, cm)
    print("CACHED:", cached)
    print()
    print(text.encode("ascii", errors="replace").decode("ascii"))


asyncio.run(run())
