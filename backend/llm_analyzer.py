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
    "Be specific about tickers and position sizes — no generic commentary."
)

_USER_TEMPLATE = """\
Fund: Situational Awareness Partners LP (Leopold Aschenbrenner — AI + energy infrastructure focus)
Period: {prev_period} → {curr_period}

Position changes ({n} positions, UNCHANGED excluded):
{delta_csv}

Analyze concisely:
1. Key strategic themes
2. Most significant individual moves
3. One-line risk note"""

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

SHORT BOOK: SA shorts industries being disrupted by AGI (e.g. IT services: Infosys), NOT the AI enablers.

Write exactly 3 labeled paragraphs, max 230 words total:
▸ CONVICTION: Which layer(s) dominate by AUM weight? Is this consistent with SA's known thesis priorities and the current bottleneck order?
▸ GAPS: Which layers are absent or underweight vs. what the SA paper identifies as critical? What does that signal about where the fund sees risk or saturation?
▸ SIGNAL: One forward-looking implication — what does this allocation tell us about where SA believes the bottleneck is tightening next?\
"""

_STRATEGY_TEMPLATE = """\
Situational Awareness Partners LP — {period} filing
AUM: ~${aum_b:.1f}B across {n_holdings} positions

ALLOCATION BY THESIS LAYER:
{layer_table}

TOP HOLDINGS BY VALUE:
{top_holdings}

Write the CONVICTION / GAPS / SIGNAL analysis.\
"""


def _delta_to_csv(delta: dict) -> str:
    rows = ["Issuer,Type,Status,Δ%,Value($k)"]
    for status in ("new", "closed", "increased", "decreased"):
        for pos in delta.get(status, []):
            pct = pos.get("pct_change")
            pct_str = f"{pct:+.1f}%" if pct is not None else "NEW" if status == "new" else "CLOSED"
            rows.append(
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

    prompt = _USER_TEMPLATE.format(
        prev_period=prev_meta.get("period_of_report", "prev"),
        curr_period=curr_meta.get("period_of_report", "curr"),
        n=total_changes,
        delta_csv=_delta_to_csv(delta),
    )

    text = await _call(prompt, _SYSTEM)
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
    top_lines = []
    for h in top:
        ticker = h.get("ticker") or h.get("nameOfIssuer", "?")[:20]
        role = h.get("thesis_role") or "Other"
        val = h.get("value", 0)
        pct = val / total_aum * 100 if total_aum else 0
        top_lines.append(f"{ticker} ({role}) — ${val / 1_000_000:.2f}B · {pct:.1f}%")

    prompt = _STRATEGY_TEMPLATE.format(
        period=curr_meta.get("period_of_report", ""),
        aum_b=total_aum / 1_000_000,
        n_holdings=len(holdings),
        layer_table="\n".join(rows),
        top_holdings="\n".join(top_lines),
    )

    text = await _call(prompt, _STRATEGY_SYSTEM)
    save_strategy(filing_key, text)
    return text, False


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
