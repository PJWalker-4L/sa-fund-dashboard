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
    "You are a senior hedge fund analyst writing for a professional buy-side audience. "
    "Write in US English. Use complete sentences. Avoid nested or compound-complex sentences. "
    "Maximum 220 words for your section only. "
    "13F types: SHARE = long equity, CALL = bullish option, PUT = bearish/short option. "
    "Sections ①–③ are already written in the output prefix. Do NOT repeat or contradict them. "
    "Do NOT rewrite portfolio expression, stacked long, or mixed expression. "
    "Write ONLY sections ④ and ⑤ as specified."
)

_USER_TEMPLATE = """\
Fund: Situational Awareness Partners LP (Leopold Aschenbrenner — AI + energy infrastructure focus)
Comparison: {prev_label} → {curr_label}

Context (already shown to reader in sections ①–③ — do not repeat):
Instrument mix: {instrument_mix}
Stacked long tickers: {stacked_conviction}
Mixed-expression tickers: {mixed_tickers}

Position changes ({n} positions, UNCHANGED excluded):
{delta_csv}

Write ONLY these two sections. US English. Complete sentences. No nested clauses.

④ KEY MOVES vs. {prev_label}
Provide 3–5 bullet points. Each bullet: ticker, instrument type, notional, and one sentence on why it matters.
Focus on the largest QoQ changes not already explained in sections ①–③.
Prioritize: new put books (SMH, NVDA, ORCL), energy/AI infrastructure share increases (CLSK, RIOT, CORZ, APLD), and full exits (LITE, INTC Call).
Do NOT include tickers from section ② (stacked long: {stacked_conviction}).
Do NOT describe mixed-expression tickers ({mixed_tickers}) as bullish, growing interest, or long conviction — those names have large put books.
Do NOT misread small share stubs on put-heavy names as new long bets.

⑤ RISK NOTE
Write 2–3 sentences as a short paragraph.
Primary risk: a semiconductor rally threatening the ~{put_notional} put book.
Name specific tickers (NVDA, SMH, AMD, MU, TSM) and notional where relevant.
Do NOT frame long energy or infrastructure positions as the main tail risk."""

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

WHY SA SHORTS SEMICONDUCTORS (use this logic when explaining large put books — do not just label "bearish"):
- SA's thesis: the binding constraint on AGI is NOT chips/GPUs — it is power, land, cooling, and physical infrastructure. The consensus AI trade (NVDA, SMH, mega-cap semis) prices in a "silicon is the bottleneck" narrative SA explicitly rejects as saturated.
- Q4 2025 pivot: exited NVDA/AVGO longs because the silicon bottleneck was "already priced in." Q1 2026 puts on SMH/NVDA/AVGO/AMD/MU/TSM extend that view via options — expression without selling short stock.
- SMH puts (~$2B): macro basket short on the crowded semiconductor/AI-hardware trade — a single expression of "consensus is overallocated to chip makers."
- ORCL puts: hedge against enterprise/cloud AI hype — software multiples that assume frictionless AI ROI while SA bets capex flows to physical layers first.
- Selective semi longs (e.g. SNDK storage, small INTC foundry bet) coexist with puts — SA is NOT anti-semiconductor entirely; it is short the consensus trade while long specific bottleneck sub-layers (storage, US foundry) it views as mispriced.

WRITING STYLE:
- Write for a professional buy-side / hedge fund audience. Sound like a senior analyst briefing PMs — not a summary bot.
- Never stop at labels ("bearish on semis"). Always explain WHY the positioning is rational given SA's thesis.
- When citing puts or large shorts, add 2–3 sentences of causal reasoning (valuation, consensus positioning, capex rotation, bottleneck shift).
- Use concrete tickers and $ notionals. Connect portfolio facts to thesis logic.

Write exactly 3 labeled paragraphs, max 380 words total:
▸ CONVICTION: Which layer(s) dominate by AUM weight? Is this consistent with SA's known thesis priorities? If puts are large, explain WHY SA would express that bearish view — not just that it exists.
▸ GAPS: Which layers are absent or underweight vs. the SA paper's bottleneck order? What does that signal about saturation vs. opportunity?
▸ SIGNAL: Forward-looking implication — where is the bottleneck tightening next, and how does the put book vs. long book express that view?\
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

Write CONVICTION / GAPS / SIGNAL for a professional audience.
- Distinguish SHARE/CALL (bullish) from PUT (bearish).
- When discussing put books (especially SMH, NVDA, ORCL, AVGO, AMD, MU, TSM): explain the investment rationale — why SA would short the consensus semiconductor trade while staying long power/infrastructure. Do not merely state "bearish on semis."
- Each paragraph must contain at least one because/therefore chain linking positions to thesis logic.\
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


def _fmt_notional(value_k: float) -> str:
    """Format 13F value (thousands USD) as $XM or $X.XB."""
    if value_k >= 1_000_000:
        return f"${value_k / 1_000_000:.1f}B"
    return f"${value_k / 1_000:.0f}M"


def _current_holdings_from_delta(delta: dict) -> list[dict]:
    rows: list[dict] = []
    for status in ("new", "increased", "decreased", "unchanged"):
        rows.extend(delta.get(status, []))
    return rows


def _instrument_mix_parts(holdings: list[dict]) -> dict:
    shares = calls = puts = 0.0
    for h in holdings:
        v = h.get("value", 0) or 0
        pc = h.get("putCall")
        if pc == "Put":
            puts += v
        elif pc == "Call":
            calls += v
        else:
            shares += v
    total = shares + calls + puts

    def _pct(v: float) -> float:
        return v / total * 100 if total else 0.0

    return {
        "shares": shares,
        "calls": calls,
        "puts": puts,
        "total": total,
        "shares_pct": _pct(shares),
        "calls_pct": _pct(calls),
        "puts_pct": _pct(puts),
    }


def _instrument_mix(holdings: list[dict], total_aum: float) -> str:
    parts = _instrument_mix_parts(holdings)
    return (
        f"Shares: {_fmt_notional(parts['shares'])} ({parts['shares_pct']:.1f}%) · "
        f"Calls: {_fmt_notional(parts['calls'])} ({parts['calls_pct']:.1f}%) · "
        f"Puts: {_fmt_notional(parts['puts'])} ({parts['puts_pct']:.1f}%)"
    )


def _put_tickers(delta: dict) -> set[str]:
    """Tickers with current put exposure (new, increased, or unchanged)."""
    tickers: set[str] = set()
    for status in ("new", "increased", "unchanged"):
        for pos in delta.get(status, []):
            if pos.get("putCall") == "Put" and pos.get("ticker"):
                tickers.add(pos["ticker"])
    return tickers


def _stacked_rows(delta: dict) -> list[dict]:
    """Tickers with share + call activity and no puts on the same ticker."""
    put_names = _put_tickers(delta)
    by_ticker: dict[str, dict[str, list]] = defaultdict(lambda: {"SHARE": [], "Call": []})
    for status in ("new", "increased", "unchanged"):
        for pos in delta.get(status, []):
            ticker = pos.get("ticker")
            if not ticker or ticker in put_names:
                continue
            if pos.get("putCall") == "Put":
                continue
            kind = "Call" if pos.get("putCall") == "Call" else "SHARE"
            by_ticker[ticker][kind].append(pos)

    rows: list[dict] = []
    for ticker in sorted(by_ticker):
        kinds = by_ticker[ticker]
        if not (kinds["SHARE"] and kinds["Call"]):
            continue
        share_val = sum(p.get("value", 0) or 0 for p in kinds["SHARE"])
        call_val = sum(p.get("value", 0) or 0 for p in kinds["Call"])
        rows.append({
            "ticker": ticker,
            "share": share_val,
            "call": call_val,
            "total": share_val + call_val,
        })
    return rows


def _mixed_rows(delta: dict) -> list[dict]:
    """Tickers with puts plus share and/or call legs."""
    put_names = _put_tickers(delta)
    if not put_names:
        return []

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

    rows: list[dict] = []
    for ticker in sorted(by_ticker):
        legs = by_ticker[ticker]
        if legs["Put"] <= 0:
            continue
        rows.append({
            "ticker": ticker,
            "put": legs["Put"],
            "share": legs["SHARE"],
            "call": legs["Call"],
        })
    return rows


def _stacked_conviction(delta: dict) -> str:
    rows = _stacked_rows(delta)
    if not rows:
        return "None"
    return ", ".join(r["ticker"] for r in rows)


def _mixed_expression(delta: dict) -> str:
    rows = _mixed_rows(delta)
    if not rows:
        return "None"
    return ", ".join(r["ticker"] for r in rows)


def _format_filing_quarter(period: str) -> str:
    """Convert period_of_report (YYYY-MM-DD) to 'Q1 2026' label."""
    try:
        parts = period.strip()[:10].split("-")
        if len(parts) != 3:
            return period or "unknown quarter"
        year, month = int(parts[0]), int(parts[1])
        quarter = (month - 1) // 3 + 1
        return f"Q{quarter} {year}"
    except (ValueError, IndexError):
        return period or "unknown quarter"


def _section_portfolio_expression(mix: dict) -> str:
    lines = [
        "① PORTFOLIO EXPRESSION",
        (
            f"Shares: {_fmt_notional(mix['shares'])} ({mix['shares_pct']:.1f}%) · "
            f"Calls: {_fmt_notional(mix['calls'])} ({mix['calls_pct']:.1f}%) · "
            f"Puts: {_fmt_notional(mix['puts'])} ({mix['puts_pct']:.1f}%)"
        ),
    ]
    if mix["puts_pct"] > 50:
        lines.append(
            "By 13F notional, put options account for more than half of reported exposure. "
            "This reflects a predominantly bearish options book at face value."
        )
    elif mix["puts_pct"] > mix["shares_pct"]:
        lines.append(
            "Put notional exceeds share notional in this filing. "
            "The book leans bearish on a reported basis."
        )
    else:
        lines.append(
            "Share and call notional together exceed put notional in this filing. "
            "The book reads as net long on a reported basis."
        )
    lines.append(
        "13F notional reflects the value of the underlying equity, not the option premium paid. "
        "Capital at risk is lower than these headline figures suggest."
    )
    return "\n".join(lines)


def _section_stacked_long(rows: list[dict]) -> str:
    lines = ["", "② STACKED LONG CONVICTION"]
    if not rows:
        lines.append(
            "No ticker shows simultaneous share and call activity without offsetting puts this quarter."
        )
        return "\n".join(lines)

    for r in rows:
        lines.append(
            f"{r['ticker']} holds {_fmt_notional(r['share'])} in shares and {_fmt_notional(r['call'])} in call options "
            f"with no offsetting puts. Combined bullish notional is {_fmt_notional(r['total'])}."
        )
    if len(rows) == 1:
        lines.append(
            "This pattern reflects targeted conviction rather than a broad sector bet. "
            "Storage sits within SA's AI infrastructure bottleneck thesis."
        )
    else:
        lines.append(
            "These names show share-plus-call conviction without offsetting puts on the same ticker."
        )
    return "\n".join(lines)


def _section_mixed_expression(rows: list[dict]) -> str:
    lines = ["", "③ MIXED EXPRESSION"]
    if not rows:
        lines.append("No ticker carries both put exposure and long legs this quarter.")
        return "\n".join(lines)

    n = len(rows)
    tickers = ", ".join(r["ticker"] for r in rows)
    lines.append(
        f"{n} tickers carry both put positions and long legs in shares or calls: {tickers}."
    )

    examples = sorted(rows, key=lambda r: r["put"], reverse=True)[:2]
    for r in examples:
        long_parts: list[str] = []
        if r["call"] > 0:
            long_parts.append(f"{_fmt_notional(r['call'])} in calls")
        if r["share"] > 0:
            long_parts.append(f"a {_fmt_notional(r['share'])} share stub")
        long_desc = " and ".join(long_parts) if long_parts else "no long legs"
        lines.append(f"{r['ticker']} runs {_fmt_notional(r['put'])} in puts against {long_desc}.")

    lines.append(
        "These are not straightforward long convictions. "
        "They are more likely paired expressions, spreads, or selective hedges."
    )
    return "\n".join(lines)


def _build_deterministic_insight(
    mix: dict,
    stacked: list[dict],
    mixed: list[dict],
    curr_label: str,
    prev_label: str,
) -> str:
    header = f"◈ AI INSIGHT — {curr_label} (vs. {prev_label})\n{'─' * 41}"
    body = "\n".join([
        header,
        _section_portfolio_expression(mix),
        _section_stacked_long(stacked),
        _section_mixed_expression(mixed),
        "",
    ])
    return body


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

    curr_holdings = _current_holdings_from_delta(delta)
    mix_parts = _instrument_mix_parts(curr_holdings)
    mix = _instrument_mix(curr_holdings, mix_parts["total"])
    stacked_rows = _stacked_rows(delta)
    mixed_rows = _mixed_rows(delta)
    stacked = _stacked_conviction(delta)
    mixed = _mixed_expression(delta)

    curr_label = _format_filing_quarter(curr_meta.get("period_of_report", ""))
    prev_label = _format_filing_quarter(prev_meta.get("period_of_report", ""))

    prompt = _USER_TEMPLATE.format(
        prev_label=prev_label,
        curr_label=curr_label,
        n=total_changes,
        instrument_mix=mix,
        stacked_conviction=stacked,
        mixed_tickers=mixed,
        put_notional=_fmt_notional(mix_parts["puts"]),
        delta_csv=_delta_to_csv(delta),
    )

    llm_text = await _call(prompt, _SYSTEM, max_tokens=650)
    prefix = _build_deterministic_insight(mix_parts, stacked_rows, mixed_rows, curr_label, prev_label)
    text = prefix + llm_text
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

    text = await _call(prompt, _STRATEGY_SYSTEM, max_tokens=900)
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

13F INSTRUMENT TYPES (critical):
- SHARE = long equity. CALL = bullish option. PUT = bearish/short option expression.
- Large put notional on a ticker (e.g. SMH VanEck Semiconductor ETF puts ~$2B) is NOT a long conviction \
hold — it is a macro short against the crowded semiconductor trade.
- When asked for the "largest position" or "biggest holding": answer with LARGEST LONG (SHARE/CALL) \
unless the user explicitly asks about puts, short book, or total 13F notional ranking.
- Never describe PUT lines as top long holdings or sector conviction.

WHY SA HOLDS SEMI PUTS (SMH, NVDA, AVGO, AMD, MU, TSM, ORCL):
- SA rejects "silicon is the bottleneck" as saturated; binding constraints are power, land, cooling, infrastructure.
- Puts express that view without shorting stock. SMH puts = basket short on consensus semi/AI-hardware allocation.

CURRENT PORTFOLIO:
{portfolio_context}

Answer concisely. Always state instrument type (SHARE/CALL/PUT) when citing a position. \
Reference tickers and $ amounts where relevant. \
For companies NOT in the portfolio, reason from the SA thesis about likely exclusion rationale.\
"""


def build_portfolio_context_for_chat(holdings: list[dict], curr_meta: dict) -> str:
    """Instrument-aware portfolio snapshot for the chat system prompt."""
    total_aum = sum(h.get("value", 0) for h in holdings)
    longs = sorted(
        [h for h in holdings if h.get("putCall") != "Put"],
        key=lambda h: h.get("value", 0),
        reverse=True,
    )
    puts = sorted(
        [h for h in holdings if h.get("putCall") == "Put"],
        key=lambda h: h.get("value", 0),
        reverse=True,
    )
    top_by_notional = sorted(holdings, key=lambda h: h.get("value", 0), reverse=True)[:15]

    lines = [
        f"Filing period: {curr_meta.get('period_of_report', 'unknown')}",
        f"Total 13F notional: ~${total_aum / 1_000_000:.1f}B across {len(holdings)} line items",
        "",
        "INSTRUMENT MIX (by 13F notional):",
        f"  {_instrument_mix(holdings, total_aum)}",
        "",
        "LARGEST LONG POSITIONS (SHARE + CALL — use for 'biggest holding' / 'largest position'):",
    ]
    if longs:
        for h in longs[:10]:
            lines.append(f"  {_holding_line(h, total_aum)}")
    else:
        lines.append("  (none)")

    lines.extend(["", "LARGEST PUT POSITIONS (bearish — NOT long holdings):"])
    if puts:
        for h in puts[:10]:
            lines.append(f"  {_holding_line(h, total_aum)}")
    else:
        lines.append("  (none)")

    lines.extend([
        "",
        "TOP 15 BY RAW 13F NOTIONAL (puts may rank #1 by $ — check instrument type):",
    ])
    for h in top_by_notional:
        lines.append(f"  {_holding_line(h, total_aum)}")

    return "\n".join(lines)


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


async def _call(user_prompt: str, system: str, max_tokens: int = 500) -> str:
    if _PROVIDER == "groq" and _GROQ_KEY:
        return await _call_groq(user_prompt, system, max_tokens)
    elif _PROVIDER == "anthropic" and _ANTHROPIC_KEY:
        return await _call_anthropic(user_prompt, system, max_tokens)
    return (
        "LLM analysis unavailable — add GROQ_API_KEY or ANTHROPIC_API_KEY to your .env file.\n"
        "(Groq free tier: https://console.groq.com)"
    )


async def _call_groq(user_prompt: str, system: str, max_tokens: int = 500) -> str:
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
                "max_tokens": max_tokens,
                "temperature": 0.3,
            },
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()


async def _call_anthropic(user_prompt: str, system: str, max_tokens: int = 500) -> str:
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
                "max_tokens": max_tokens,
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
