import asyncio
from main import _get_data


async def main() -> None:
    import llm_analyzer
    curr_df, curr_meta, _, _ = _get_data()
    text, cached = await llm_analyzer.analyze_strategy(
        curr_df.to_dict(orient="records"),
        curr_meta,
    )
    print("cached", cached)
    print(text[:900])


if __name__ == "__main__":
    asyncio.run(main())