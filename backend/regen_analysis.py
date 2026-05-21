import asyncio
import llm_analyzer
import delta_detector
from sec_client import fetch_latest, fetch_previous


async def run():
    c, cm = fetch_latest()
    p, pm = fetch_previous()
    d = delta_detector.compute_delta(c, p)
    print("STACKED:", llm_analyzer._stacked_conviction(d))
    print()
    print("MIXED:", llm_analyzer._mixed_expression(d))
    print()
    text, cached = await llm_analyzer.analyze_delta(d, cm, pm)
    print("CACHED:", cached)
    print()
    print(text)


asyncio.run(run())
