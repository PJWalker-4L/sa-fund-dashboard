# Situational Edge

**Thesis intelligence for the AGI decade** — decode Situational Awareness Partners LP’s public 13F filings, map positions to the fund’s infrastructure thesis, and surface QoQ moves without copy-trading or recommendations.

> Leopold Aschenbrenner’s fund bets on physical bottlenecks: power, chips, cooling, memory. The trades are public — but buried in 45-day-old SEC filings, opaque options data, and a 165-page essay. Situational Edge is the map, not the trade.

---

## What it does

| Pillar | What you get |
|--------|----------------|
| **Data decoding** | 13F holdings with Put/Call awareness, QoQ deltas, quarterly AUM timeline, hybrid fund news (SEC, holdings, press) |
| **Thesis mapping** | Six SA layers (Power, Silicon, GPU Cloud, AI Infrastructure, Optical, Storage), strategy commentary, 5-block AI insight |
| **Portfolio view** | Interactive holdings map, movers, bucket allocation, instrument-aware portfolio chat |

**Not** a trading tool. No buy/sell signals. Facts and context for forming your own conviction.

---

## Stack

| Layer | Tech |
|-------|------|
| **API** | Python 3 · FastAPI · Pydantic v2 · uvicorn |
| **Data** | [edgartools](https://github.com/dgunning/edgartools) (SEC EDGAR 13F, direct XML for `putCall`) · pandas · yfinance |
| **AI** | Groq or Anthropic (via `.env.local`) — QoQ analysis, strategy commentary, portfolio chat |
| **Frontend** | React 18 · TypeScript · Vite · TanStack Query · Recharts · D3 + TopoJSON (holdings map) · Framer Motion |
| **Deploy** | Vercel — `@vercel/python` API + static Vite build |

```
sa-fund-dashboard/
├── backend/          # FastAPI app
├── frontend/         # React SPA
├── api/index.py      # Vercel serverless entry
├── data/             # JSON caches (gitignored locally)
└── vercel.json
```

---

## Built with agentic tools

This project was developed **with AI coding agents**, not only by hand:

- **Cursor** (Composer / Agent mode) for implementation, refactors, and UI iterations
- **Claude** for architecture notes and product guidance during development
- Human direction on thesis layers, compliance framing, SEC parsing edge cases (e.g. Put/Call notional), and what *not* to ship

All SEC data and LLM output should be treated as **delayed, incomplete, and non-advisory** — verify against primary sources.

---

## Local development

**Prerequisites:** Node 18+, Python 3.11+, `.env.local` in the project root.

```bash
# API keys (optional for LLM features)
# LLM_PROVIDER=groq | anthropic
# GROQ_API_KEY=...
# ANTHROPIC_API_KEY=...

# Backend (from repo root)
cd backend
pip install -r ../requirements.txt
python -m uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api/*` → `http://localhost:8000`.

---

## API (selection)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/holdings` | Current 13F holdings + QoQ delta status |
| `GET` | `/api/holdings-map` | Geo points for portfolio map |
| `GET` | `/api/analysis` | LLM QoQ insight (cached per filing pair) |
| `GET` | `/api/strategy` | Thesis-layer strategy commentary |
| `GET` | `/api/history` | Quarterly 13F exposure timeline |
| `GET` | `/api/fund-news` | Hybrid news feed |
| `POST` | `/api/refresh` | Invalidate caches, refetch SEC data |
| `POST` | `/api/chat` | Portfolio chat |

---

## Disclaimer

Situational Edge is an **analytical dashboard** for educational and research use. It does not provide investment advice, manage assets, or encourage copying any fund’s trades. 13F data is filed with a regulatory lag; options notionals and thesis labels are interpretive. Past filings do not predict future results.

---

## Related docs

- [`ABOUT.md`](ABOUT.md) — product narrative for external presentation
