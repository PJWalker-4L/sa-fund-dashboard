import os
from pathlib import Path
from collections import defaultdict
import httpx
from dotenv import load_dotenv
from state_manager import get_cached_analysis, save_analysis, get_cached_strategy, save_strategy

_root = Path(__file__).parent.parent
load_dotenv(_root / ".env.local")
load_dotenv(_root / ".env")

_PROVIDER = os.getenv("LLM_PROVIDER", "groq").lower()
_GROQ_KEY = os.getenv("GROQ_API_KEY", "")
_ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")

_SYSTEM = (
    "You are a terse hedge fund analyst. Maximum 200 words. "
    "Be specific about tickers and position sizes — no generic commentary. "
    "13F instrument types: SHARE = long equity, CALL = bullish option, PUT = bearish/short option. "
    "CRITICAL: PUT positions are bearish bets, NOT long exposure. "
    "A large PUT position in NVDA means the fund is SHORT NVDA, not long. "
    "Never call PUT holders 'concentrated in' a sector as if long — they are expressing bearish views. "
    "In the Risk Note: distinguish put exposure (bearish/short) from share/call exposure (bullish/long). "
    "Example Risk Note for a put-heavy book: 'Tail risk: if NVDA/AMD rally sharply, large put notional (~$Xb) faces mark-to-market losses.' "
    "Never say 'concentration in semiconductor stocks' when the positions are mostly puts. "
    "STACKED CONVICTION: When the same ticker has BOTH share AND call activity (new or increased), "
    "this is layered bullish expression — equity plus leveraged upside. "
    "Always call this out explicitly with combined notional (e.g. 'SNDK: $724M shares + $389M calls = ~$1.1B stacked long'). "
    "Never describe only the share leg when calls on the same ticker also moved. "
    "CRITICAL: If a ticker ALSO has put exposure (see MIXED EXPRESSION block), do NOT call it stacked long — "
    "puts dominate or offset the bullish legs. Example: MU with $584M puts + $422M calls is bearish/mixed, NOT bullish. "
    "Your output is prefixed with authoritative PORTFOLIO EXPRESSION facts computed from 13F data. "
    "Never contradict that prefix. Never write a 'Stacked Long Conviction' theme — it is already in the prefix."
)

_USER_TEMPLATE = """\
Fund: Situational Awareness Partners LP (Leopold Aschenbrenner — AI + energy infrastructure focus)
Period: {prev_period} → {curr_period}

Instrument mix this quarter:
{instrument_mix}

Stacked bullish conviction (SHARE + CALL on same ticker, NO puts on that ticker):
{stacked_conviction}

Mixed expression (same ticker has puts AND share/call activity — NOT stacked long):
{mixed_expression}

Position changes ({n} positions, UNCHANGED excluded):
{delta_csv}

Analyze concisely (do NOT repeat stacked/mixed tickers — they appear in a deterministic prefix appended to your output):
1. Key strategic themes (sector/layer focus — no stacked-long or mixed-expression lists)
2. Most significant individual moves (exclude tickers already covered in the prefix)
3. Risk Note: frame put exposure as bearish/short, NOT as sector concentration risk"""

_STRATEGY_SYSTEM = """\
You are a senior analyst at Situational Awareness Partners LP, an AI-infrastructure hedge fund founded by Leopold Aschenbrenner (ex-OpenAI researcher, author of the "Situational Awareness" paper).

FUND PHILOSOPHY — what makes SA unique vs. consensus:
- Central thesis: AGI arrives ~2027. Building it requires a trillion-dollar compute cluster. The binding constraints are NOT the models — they are the physical supply-chain layers below.
- SA explicitly fades the consensus AI trade (NVDA, MSFT, mega-cap software) and buys the bottlenecks that AI capex must flow through.
- Q4 2025 pivot: exited NVDA and AVGO (silicon bottleneck already priced in) — doubled down on power and physical infrastructure.
- Fund grew $254M → $5.5B AUM in 12 months; returned +47% H1 2025 vs. S&P +6%.

THE BOTTLENECK LAYERS (order = current binding criticality per SA paper):
1. POWER — "100GW new US capacity needed within a decade." Bottleneck #1.
   SA conviction: Bloom Energy (fuel cells → on-site clean power) is the fund's largest single position (~16% AUM, 10M+ shares + calls). Nuclear (CEG, NEE), gas peakers also held.
2. SILICON — Contrarian: sold NVDA/AVGO at consensus peak; holds Intel (INTC) as a US foundry / national-security bet ignored by the market.
3. GPU CLOUD — CoreWeave (CRWV) is the fund's primary leverage instrument. Pure-play GPU cloud monetizes the compute buildout directly.
4. AI INFRASTRUCTURE — "Miner-to-HPC arbitrage": ex-crypto miners (CORZ, IREN, WULF, CLSK, APLD, RIOT, CIFR, BITDR) have stranded power + industrial cooling — cheapest path to AI data center capacity.
5. OPTICAL — Lumentum (LITE), Coherent (COHR). Hidden bottleneck: terabit-scale fiber interconnects between GPU clusters. Underowned by consensus.
6. STORAGE — SanDisk (SNDK), WDC, STX. AI training checkpoints and data lakes require massive persistent storage.

SHORT BOOK & PUT OPTIONS (critical — read carefully):
- 13F put options are BEARISH expression, NOT long equity. Large put notional on a ticker means the fund is betting against or hedging that name — never describe puts as "conviction" or "top holdings in the industry."
- Q1 2026 example: SA held multi-billion-dollar puts on SMH, NVDA, AVGO, AMD, MU, ORCL, ASML, TSM, INTC, GLW — a macro short against the consensus semiconductor trade while staying long power/infrastructure.
- Shares and calls = bullish expression. Puts = bearish expression. Always state the instrument type when citing a position.

Write exactly 3 labeled paragraphs, max 230 words total:
▸ CONVICTION: Which layer(s) dominate by AUM weight? Is this consistent with SA's known thesis priorities and the current bottleneck order?
▸ GAPS: Which layers are absent or underweight vs. what the SA paper identifies as critical? What does that signal about where the fund sees risk or saturation?
▸ SIGNAL: One forward-looking implication — what does this allocation tell us about where SA believes the bottleneck is tightening next?\
"""

_STRATEGY_TEMPLATE = """\
Situational Awareness Partners LP — {period} filing
AUM: ~${aum_b:.1f}B across {n_holdings} positions

INSTRUMENT MIX (by 13F notional):
{instrument_mix}

ALLOCATION BY THESIS LAYER (notional includes puts — interpret puts as bearish):
{layer_table}

TOP PUT POSITIONS (bearish expression):
{put_book}

TOP HOLDINGS BY VALUE (instrument type shown):
{top_holdings}

Write the CONVICTION / GAPS / SIGNAL analysis. Always distinguish SHARE/CALL (bullish) from PUT (bearish).\
"""


def _instrument_type(h: dict) -> str:
    pc = h.get("putCall")
    if pc == "Put":
        return "PUT"
    if pc == "Call":
        return "CALL"
    return "SHARE"


def _holding_line(h: dict, total_aum: float) -> str:
    ticker = h.get("ticker") or h.get("nameOfIssuer", "?")[:20]
    role = h.get("thesis_role") or "Other"
    instr = _instrument_type(h)
    val = h.get("value", 0)
    pct = val / total_aum * 100 if total_aum else 0
    return f"{ticker} ({role}) {instr} — ${val / 1_000_000:.2f}B · {pct:.1f}%"


def _instrument_mix(holdings: list[dict], total_aum: float) -> str:
    shares = calls = puts = 0.0
    for h in holdings:
        v = h.get("value", 0)
        pc = h.get("putCall")
        if pc == "Put":
            puts += v
        elif pc == "Call":
            calls += v
        else:
            shares += v
    def _pct(v: float) -> float:
        return v / total_aum * 100 if total_aum else 0.0
    return (
        f"Shares: ${shares / 1_000_000:.2f}B ({_pct(shares):.1f}%) · "
        f"Calls: ${calls / 1_000_000:.2f}B ({_pct(calls):.1f}%) · "
        f"Puts: ${puts / 1_000_000:.2f}B ({_pct(puts):.1f}%)"
    )


def _put_tickers(delta: dict) -> set[str]:
    """Tickers with current put exposure (new, increased, or unchanged)."""
    tickers: set[str] = set()
    for status in ("new", "increased", "unchanged"):
        for pos in delta.get(status, []):
            if pos.get("putCall") == "Put" and pos.get("ticker"):
                tickers.add(pos["ticker"])
    return tickers


def _stacked_conviction(delta: dict) -> str:
    """Tickers with simultaneous share + call bullish moves, excluding any with puts."""
    put_names = _put_tickers(delta)
    by_ticker: dict[str, dict[str, list]] = defaultdict(lambda: {"SHARE": [], "Call": []})
    for status in ("new", "increased"):
        for pos in delta.get(status, []):
            ticker = pos.get("ticker")
            if not ticker or ticker in put_names:
                continue
            if pos.get("putCall") == "Put":
                continue
            kind = "Call" if pos.get("putCall") == "Call" else "SHARE"
            by_ticker[ticker][kind].append(pos)

    lines: list[str] = []
    for ticker in sorted(by_ticker):
        kinds = by_ticker[ticker]
        if not (kinds["SHARE"] and kinds["Call"]):
            continue
        share_val = sum(p.get("value", 0) or 0 for p in kinds["SHARE"])
        call_val = sum(p.get("value", 0) or 0 for p in kinds["Call"])
        total = share_val + call_val
        lines.append(
            f"{ticker}: SHARE ${share_val / 1_000:.0f}M + CALL ${call_val / 1_000:.0f}M "
            f"(combined ~${total / 1_000:.0f}M stacked long)"
        )
    return "\n".join(lines) if lines else "None this quarter"


def _mixed_expression(delta: dict) -> str:
    """Tickers with puts AND share/call legs — offsetting or complex, not pure long."""
    put_names = _put_tickers(delta)
    if not put_names:
        return "None this quarter"

    by_ticker: dict[str, dict[str, float]] = defaultdict(lambda: {"SHARE": 0.0, "Call": 0.0, "Put": 0.0})
    for status in ("new", "increased", "unchanged"):
        for pos in delta.get(status, []):
            ticker = pos.get("ticker")
            if not ticker or ticker not in put_names:
                continue
            val = pos.get("value", 0) or 0
            pc = pos.get("putCall")
            if pc == "Put":
                by_ticker[ticker]["Put"] += val
            elif pc == "Call":
                by_ticker[ticker]["Call"] += val
            else:
                by_ticker[ticker]["SHARE"] += val

    lines: list[str] = []
    for ticker in sorted(by_ticker):
        legs = by_ticker[ticker]
        if legs["Put"] <= 0:
            continue
        parts = [f"PUT ${legs['Put'] / 1_000:.0f}M"]
        if legs["SHARE"] > 0:
            parts.append(f"SHARE ${legs['SHARE'] / 1_000:.0f}M")
        if legs["Call"] > 0:
            parts.append(f"CALL ${legs['Call'] / 1_000:.0f}M")
        lines.append(f"{ticker}: {' + '.join(parts)} (mixed — puts offset bullish legs)")
    return "\n".join(lines) if lines else "None this quarter"


def _deterministic_facts_block(stacked: str, mixed: str) -> str:
    """Authoritative instrument expression — prepended to LLM output, not LLM-generated."""
    return (
        "▸ PORTFOLIO EXPRESSION (13F facts — authoritative)\n\n"
        f"Stacked long (SHARE + CALL, no puts on ticker):\n{stacked}\n\n"
        f"Mixed expression (puts on same ticker — NOT stacked long):\n{mixed}\n\n"
        "---\n\n"
    )


def _delta_to_csv(delta: dict) -> str:
    rows = ["Ticker,Issuer,Type,Status,Δ%,Value($k)"]
    for status in ("new", "closed", "increased", "decreased"):
        for pos in delta.get(status, []):
            pct = pos.get("pct_change")
            pct_str = f"{pct:+.1f}%" if pct is not None else "NEW" if status == "new" else "CLOSED"
            rows.append(
                f"{pos.get('ticker') or '—'},"
                f"{pos.get('nameOfIssuer', '?')[:30]},"
                f"{pos.get('putCall') or 'SHARE'},"
                f"{status.upper()},"
                f"{pct_str},"
                f"{int(pos.get('value') or 0)}"
            )
    return "\n".join(rows)


async def analyze_delta(
    delta: dict,
    curr_meta: dict,
    prev_meta: dict,
) -> tuple[str, bool]:
    filing_pair = (
        f"{curr_meta.get('accession_number', 'curr')}"
        f"__{prev_meta.get('accession_number', 'prev')}"
    )

    cached = get_cached_analysis(filing_pair)
    if cached:
        return cached, True

    total_changes = sum(len(delta.get(k, [])) for k in ("new", "closed", "increased", "decreased"))
    if total_changes == 0:
        text = "No material position changes detected between these two filings."
        save_analysis(filing_pair, text)
        return text, False

    all_positions = []
    for key in ("new", "closed", "increased", "decreased", "unchanged"):
        all_positions.extend(delta.get(key, []))
    total_aum = sum(p.get("value", 0) or 0 for p in all_positions)
    mix = _instrument_mix(all_positions, total_aum) if all_positions else "n/a"
    stacked = _stacked_conviction(delta)
    mixed = _mixed_expression(delta)

    prompt = _USER_TEMPLATE.format(
        prev_period=prev_meta.get("period_of_report", "prev"),
        curr_period=curr_meta.get("period_of_report", "curr"),
        n=total_changes,
        instrument_mix=mix,
        stacked_conviction=stacked,
        mixed_expression=mixed,
        delta_csv=_delta_to_csv(delta),
    )

    llm_text = await _call(prompt, _SYSTEM)
    text = _deterministic_facts_block(stacked, mixed) + llm_text
    save_analysis(filing_pair, text)
    return text, False


async def analyze_strategy(
    holdings: list[dict],
    curr_meta: dict,
) -> tuple[str, bool]:
    filing_key = f"strategy__{curr_meta.get('accession_number', 'curr')}"

    cached = get_cached_strategy(filing_key)
    if cached:
        return cached, True

    layer_totals: dict[str, float] = defaultdict(float)
    total_aum = sum(h.get("value", 0) for h in holdings)

    for h in holdings:
        role = h.get("thesis_role") or "Other"
        layer_totals[role] += h.get("value", 0)

    rows = ["Layer | Value | % AUM"]
    for layer, val in sorted(layer_totals.items(), key=lambda x: -x[1]):
        pct = val / total_aum * 100 if total_aum else 0
        rows.append(f"{layer} | ${val / 1_000_000:.2f}B | {pct:.1f}%")

    top = sorted(holdings, key=lambda h: h.get("value", 0), reverse=True)[:12]
    top_lines = [_holding_line(h, total_aum) for h in top]

    puts = sorted(
        [h for h in holdings if h.get("putCall") == "Put"],
        key=lambda h: h.get("value", 0),
        reverse=True,
    )[:10]
    put_lines = [_holding_line(h, total_aum) for h in puts] if puts else ["(none)"]

    prompt = _STRATEGY_TEMPLATE.format(
        period=curr_meta.get("period_of_report", ""),
        aum_b=total_aum / 1_000_000,
        n_holdings=len(holdings),
        instrument_mix=_instrument_mix(holdings, total_aum),
        layer_table="\n".join(rows),
        put_book="\n".join(put_lines),
        top_holdings="\n".join(top_lines),
    )

    text = await _call(prompt, _STRATEGY_SYSTEM)
    save_strategy(filing_key, text)
    return text, False


_CHAT_SYSTEM = """\
You are an analyst assistant for Situational Awareness Partners LP, an AI-infrastructure hedge fund \
founded by Leopold Aschenbrenner (ex-OpenAI researcher, author of the "Situational Awareness" paper).

FUND PHILOSOPHY:
- AGI arrives ~2027. SA bets on the physical supply-chain bottlenecks, NOT model companies.
- SA fades the consensus AI trade (NVDA, MSFT) and buys: Power, Silicon (contrarian), GPU Cloud, \
AI Infrastructure (miner→HPC arbitrage), Optical Interconnects, Storage.
- Q4 2025 pivot: sold NVDA/AVGO (priced in) — doubled down on power + infrastructure.
- Fund: $254M → $5.5B AUM in 12 months. +47% H1 2025 vs S&P +6%.
- Short book: industries disrupted BY AGI (e.g. IT services like Infosys).

CURRENT PORTFOLIO:
{portfolio_context}

Answer concisely. Reference tickers and $ amounts where relevant. \
For companies NOT in the portfolio, reason from the SA thesis about likely exclusion rationale.\
"""


async def chat_with_portfolio(
    message: str,
    history: list[dict],
    portfolio_context: str,
    model: str = "groq/llama-3.1-8b-instant",
) -> str:
    system = _CHAT_SYSTEM.format(portfolio_context=portfolio_context)
    messages = [{"role": m["role"], "content": m["content"]} for m in history]
    messages.append({"role": "user", "content": message})

    provider, _, model_name = model.partition("/")
    if provider == "groq" and _GROQ_KEY:
        return await _call_groq_chat(messages, system, model_name or "llama-3.1-8b-instant")
    elif provider == "anthropic" and _ANTHROPIC_KEY:
        return await _call_anthropic_chat(messages, system, model_name or "claude-haiku-4-5-20251001")
    return "LLM not available — check your API keys in .env.local."


def _ssl_ctx():
    import ssl, truststore
    ctx = truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    return ctx


async def _call(user_prompt: str, system: str) -> str:
    if _PROVIDER == "groq" and _GROQ_KEY:
        return await _call_groq(user_prompt, system)
    elif _PROVIDER == "anthropic" and _ANTHROPIC_KEY:
        return await _call_anthropic(user_prompt, system)
    return (
        "LLM analysis unavailable — add GROQ_API_KEY or ANTHROPIC_API_KEY to your .env file.\n"
        "(Groq free tier: https://console.groq.com)"
    )


async def _call_groq(user_prompt: str, system: str) -> str:
    async with httpx.AsyncClient(timeout=30, verify=_ssl_ctx()) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {_GROQ_KEY}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user_prompt},
                ],
                "max_tokens": 500,
                "temperature": 0.3,
            },
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()


async def _call_anthropic(user_prompt: str, system: str) -> str:
    async with httpx.AsyncClient(timeout=30, verify=_ssl_ctx()) as client:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": _ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 500,
                "system": system,
                "messages": [{"role": "user", "content": user_prompt}],
            },
        )
        r.raise_for_status()
        return r.json()["content"][0]["text"].strip()


async def _call_groq_chat(messages: list[dict], system: str, model: str) -> str:
    async with httpx.AsyncClient(timeout=30, verify=_ssl_ctx()) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {_GROQ_KEY}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [{"role": "system", "content": system}] + messages,
                "max_tokens": 600,
                "temperature": 0.4,
            },
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()


async def _call_anthropic_chat(messages: list[dict], system: str, model: str) -> str:
    async with httpx.AsyncClient(timeout=60, verify=_ssl_ctx()) as client:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": _ANTHROPIC_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json={
                "model": model,
                "max_tokens": 600,
                "system": system,
                "messages": messages,
            },
        )
        r.raise_for_status()
        return r.json()["content"][0]["text"].strip()
