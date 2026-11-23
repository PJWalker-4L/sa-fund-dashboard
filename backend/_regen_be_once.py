import asyncio
from main import _get_data
import delta_detector
import llm_analyzer
from sectors import thesis_role as get_thesis_role
from state_manager import invalidate_analysis_cache, invalidate_strategy_cache, normalize_put_call


async def main() -> None:
    invalidate_analysis_cache()
    invalidate_strategy_cache()
    curr_df, curr_meta, prev_df, prev_meta = _get_data()
    holdings = []
    for row in curr_df.to_dict(orient="records"):
        ticker = str(row.get("ticker") or "")
        holdings.append({
            **row,
            "ticker": ticker,
            "putCall": normalize_put_call(row.get("putCall")),
            "thesis_role": get_thesis_role(ticker, str(row.get("nameOfIssuer", ""))),
            "value": float(row.get("value") or 0),
        })
    delta = delta_detector.compute_delta(curr_df, prev_df)
    print(llm_analyzer.instrument_continuity(delta, holdings))
    analysis, _ = await llm_analyzer.analyze_delta(delta, curr_meta, prev_meta, holdings)
    strategy, _ = await llm_analyzer.analyze_strategy(
        holdings, curr_meta, continuity=llm_analyzer.instrument_continuity(delta, holdings),
    )
    for label, text in (("ANALYSIS", analysis), ("STRATEGY", strategy)):
        print("\n====", label, "====")
        for line in text.splitlines():
            if "BE" in line or "Bloom" in line:
                print(line)


if __name__ == "__main__":
    asyncio.run(main())