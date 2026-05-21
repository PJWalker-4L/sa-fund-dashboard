import asyncio
import llm_analyzer
import delta_detector
from sec_client import fetch_latest, fetch_previous


async def run():
    c, cm = fetch_latest()
    p, pm = fetch_previous()
    d = delta_detector.compute_delta(c, p)
    text, cached = await llm_analyzer.analyze_delta(d, cm, pm)
    print("CACHED:", cached)
    print()
    print(text.encode("ascii", errors="replace").decode("ascii"))


asyncio.run(run())
