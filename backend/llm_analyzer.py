import os
from pathlib import Path
import httpx
from dotenv import load_dotenv
from state_manager import get_cached_analysis, save_analysis

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

    if _PROVIDER == "groq" and _GROQ_KEY:
        text = await _call_groq(prompt)
    elif _PROVIDER == "anthropic" and _ANTHROPIC_KEY:
        text = await _call_anthropic(prompt)
    else:
        text = (
            "LLM analysis unavailable — add GROQ_API_KEY or ANTHROPIC_API_KEY to your .env file.\n"
            f"(Groq free tier: https://console.groq.com)"
        )

    save_analysis(filing_pair, text)
    return text, False


def _ssl_ctx():
    import ssl, truststore
    ctx = truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    return ctx


async def _call_groq(user_prompt: str) -> str:
    async with httpx.AsyncClient(timeout=30, verify=_ssl_ctx()) as client:
        r = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={"Authorization": f"Bearer {_GROQ_KEY}", "Content-Type": "application/json"},
            json={
                "model": "llama-3.1-8b-instant",
                "messages": [
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user", "content": user_prompt},
                ],
                "max_tokens": 300,
                "temperature": 0.3,
            },
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"].strip()


async def _call_anthropic(user_prompt: str) -> str:
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
                "max_tokens": 300,
                "system": _SYSTEM,
                "messages": [{"role": "user", "content": user_prompt}],
            },
        )
        r.raise_for_status()
        return r.json()["content"][0]["text"].strip()
