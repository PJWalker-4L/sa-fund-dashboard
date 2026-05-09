# SA Fund Dashboard — CLAUDE.md

# IMPORTANT
At the start of every session, read the global instructions and safety constraints in `GLOBAL_RULES.md`. These rules are non-negotiable and override local project logic if a conflict arises.


## SA Fund Dashboard - Was ist das?

Dashboard zur Analyse der SEC 13F-Filings von **Situational Awareness Partners LP**
(Leopold Aschenbrenner, ex-OpenAI). Zeigt Holdings, QoQ-Deltas und LLM-Analysen
entlang der Fund-Thesis aus dem "Situational Awareness"-Paper.

---

## Dev-Server starten

```bash
# Backend (Python — aus /backend):
python -m uvicorn main:app --reload --port 8000

# Frontend (aus /frontend):
npm run dev   →  http://localhost:5173
```

Vite proxied `/api/*` → `http://localhost:8000` (konfiguriert in `frontend/vite.config.ts`).

---

## Architektur

```
sa-fund-dashboard/
├── backend/
│   ├── main.py           # FastAPI-App, alle Endpoints
│   ├── models.py         # Pydantic-Models (HoldingRow, StrategyResponse, …)
│   ├── sec_client.py     # edgartools → 13F-Filings fetchen
│   ├── delta_detector.py # QoQ-Vergleich (new / closed / increased / decreased)
│   ├── sectors.py        # classify() → Bucket; thesis_role() → SA-Layer
│   ├── llm_analyzer.py   # analyze_delta() + analyze_strategy() via Groq/Anthropic
│   ├── state_manager.py  # JSON-Caches (holdings, analysis, strategy)
│   ├── company_client.py # Ticker-Info + News (Yahoo Finance)
│   └── alpha_calculator.py
├── frontend/src/
│   ├── App.tsx           # Root: alle Queries, Layout
│   ├── api.ts            # fetch-Wrapper für alle Endpoints
│   ├── types.ts          # TypeScript-Interfaces (spiegeln Pydantic-Models)
│   └── components/
│       ├── ThesisInsight.tsx   # SA-Layer-Grid + Strategy Commentary
│       ├── LLMInsight.tsx      # Delta-Analyse (QoQ)
│       ├── HoldingsTable.tsx   # Sortierbare Tabelle inkl. % AUM
│       ├── BucketChart.tsx     # Sector-/Positions-Ansicht
│       ├── MoversPanel.tsx     # Top Gainers/Losers
│       ├── KPICard.tsx
│       ├── StatusBar.tsx
│       ├── CompanyDrawer.tsx   # Sidebar mit Ticker-Detail + News
│       └── DeltaBadge.tsx
└── data/                 # JSON-Caches (gitignored)
```

---

## API-Endpoints

| Endpoint | Beschreibung |
|---|---|
| `GET /api/holdings` | Aktuelle Holdings + Delta-Status je Position |
| `GET /api/analysis` | LLM-Analyse der QoQ-Änderungen (gecacht) |
| `GET /api/strategy` | LLM-Analyse entlang der SA-Thesis-Layer (gecacht) |
| `GET /api/movers` | Top 5 Gainers + Losers QoQ |
| `GET /api/alpha` | Alpha-Metriken |
| `GET /api/filing-check` | Prüft ob neues 13F vorliegt |
| `POST /api/refresh` | Invalidiert Holdings- + Strategy-Cache, holt neu |
| `GET /api/company/{ticker}` | Ticker-Info + News |

---

## LLM-Konfiguration

Gesteuert über `.env.local` im Root:
```
LLM_PROVIDER=groq          # oder: anthropic
GROQ_API_KEY=...
ANTHROPIC_API_KEY=...
```

Zwei separate Analyse-Typen mit eigenen System-Prompts in `llm_analyzer.py`:

- **`analyze_delta()`** — `_SYSTEM` / `_USER_TEMPLATE`: Terse QoQ-Analyse (max 200 Wörter)
- **`analyze_strategy()`** — `_STRATEGY_SYSTEM` / `_STRATEGY_TEMPLATE`: Tiefe Thesis-Analyse
  - Output-Format: 3 Paragraphen **CONVICTION / GAPS / SIGNAL** (max 230 Wörter)
  - Prompt enthält: Fund-Philosophie, bekannte Moves (NVDA/AVGO-Exit Q4 2025),
    Layer-Beschreibungen mit konkreten Ticker-Beispielen, Top-12-Holdings aus dem Filing
  - `max_tokens`: 500 (beide Provider)

---

## Thesis-Layer-System (`sectors.py`)

`thesis_role(ticker, issuer_name)` mappt Holdings auf 6 Layer aus dem SA-Paper:

| Layer | Beispiel-Ticker | Bedeutung |
|---|---|---|
| Power | BE, VST, CEG, NEE, EQT | Strom — Bottleneck #1 |
| Silicon | INTC, NVDA, AMD, AVGO | GPUs + Chips |
| GPU Cloud | CRWV | Pure-play GPU-Cloud |
| AI Infrastructure | CORZ, IREN, APLD, WULF, CLSK, RIOT, CIFR | Miner→HPC-Arbitrage |
| Optical | LITE, COHR | Interconnects |
| Storage | WDC, STX, SNDK | Persistenz für Training |

---

## Caching-Strategie

Alle Caches unter `data/` (JSON-Dateien):

| Datei | TTL | Invalidierung |
|---|---|---|
| `holdings_cache.json` | 4 Stunden | `POST /api/refresh` |
| `analysis_cache.json` | permanent (per Filing-Pair) | manuell löschen |
| `strategy_cache.json` | permanent (per Accession-Nr.) | `POST /api/refresh` |

---

## Aktueller Status (Stand 2026-05-09)

### Implementiert & funktionierend
- 13F-Daten-Fetch via `edgartools` (SEC EDGAR)
- QoQ-Delta-Erkennung + LLM-Analyse
- **Thesis Stack** (`ThesisInsight.tsx`): 3×2 Layer-Grid mit Holdings-Tags + CONVICTION/GAPS/SIGNAL Commentary
- `% AUM`-Spalte in der Holdings-Tabelle
- Holdings-Cache (4h TTL), Analysis-Cache + Strategy-Cache (filing-permanent)
- Company-Drawer mit Ticker-Info + News

### Noch offen / mögliche nächste Schritte
- Short-Book aus dem Filing extrahieren und im Thesis-Stack anzeigen
- Historischer Layer-Vergleich (wie verschiebt sich die Layer-Gewichtung über Quartale?)
- Performance-Tracking: Rendite je Layer vs. S&P 500
- News-Integration direkt in die Strategy-Commentary (aktuell nur im LLM-Prompt via System-Context)
