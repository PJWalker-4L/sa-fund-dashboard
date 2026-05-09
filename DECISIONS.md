# ARCHITECTURE DECISION RECORDS (ADR)

## ACTIVE DECISIONS

### [ADR-003] 2026-05-09: JSON-File-Caching statt Datenbank
* **Decision:** Alle Caches als JSON-Dateien unter `data/` (kein Redis, keine DB).
* **Rationale:** 13F-Filings sind quartalsweise — kein Write-Heavy-Workload. Kein Infrastruktur-Overhead für ein Single-User-Dashboard.
* **Consequences:** Cache-Invalidierung manuell via `POST /api/refresh` oder Datei löschen. Drei separate Caches: `holdings_cache.json` (4h TTL), `analysis_cache.json` (filing-permanent), `strategy_cache.json` (filing-permanent).

---

### [ADR-004] 2026-05-09: Dual-LLM-Provider (Groq + Anthropic) via Env-Var
* **Decision:** LLM-Provider über `LLM_PROVIDER=groq|anthropic` in `.env.local` steuerbar. Beide Backends in `llm_analyzer.py` implementiert, unified über `_call()`.
* **Rationale:** Groq (kostenlos, schnell) für Entwicklung; Anthropic (Claude Haiku/Sonnet) für Produktion. Kein Vendor-Lock-in.
* **Consequences:** Jede Prompt-Änderung muss mit beiden Providern getestet werden. Temperatur und `max_tokens` werden an beide übergeben.

---

### [ADR-005] 2026-05-09: Thesis-Layer-System mit 6 Layern (sectors.py)
* **Decision:** `thesis_role(ticker, issuer_name)` mappt Holdings auf 6 Layer aus dem Aschenbrenner-Paper: Power / Silicon / GPU Cloud / AI Infrastructure / Optical / Storage.
* **Rationale:** Das SA-Paper definiert physische Bottlenecks in dieser Reihenfolge — das Portfolio sollte direkt dagegen gemessen werden, nicht gegen generische Sektor-Labels.
* **Consequences:** Mapping muss manuell gepflegt werden, wenn der Fonds neue Positionen in unbekannten Tickers aufbaut. `classify()` (generische Buckets) bleibt parallel erhalten.

---

### [ADR-006] 2026-05-09: Strategy-Cache per Accession Number (filing-permanent)
* **Decision:** Strategy-Cache-Key = `strategy__{accession_number}`, kein Zeitlimit.
* **Rationale:** Die Thesis-Analyse eines Filings ändert sich nicht — nur ein neues Quarterly Filing ist Grund für Neuberechnung. `POST /api/refresh` löscht den Cache explizit.
* **Consequences:** Wenn der LLM-Prompt verbessert wird, muss der Cache manuell gelöscht werden (`data/strategy_cache.json` entfernen), damit die neue Analyse greift.

---

### [ADR-007] 2026-05-09: CONVICTION / GAPS / SIGNAL als Output-Format der Strategy-Analyse
* **Decision:** `_STRATEGY_SYSTEM` schreibt exakt 3 Paragraphen vor: **CONVICTION** (dominante Layer), **GAPS** (fehlende/untergewichtete Layer), **SIGNAL** (Forward-Implikation).
* **Rationale:** Freier Fließtext war zu generisch und wiederholte nur die Layer-Tabelle. Strukturiertes Format erzwingt Kontext und Kontrast zur Fund-Philosophie.
* **Consequences:** max 230 Wörter — bei komplexen Portfolios kann das eng werden. Format im Frontend als `pre-wrap` gerendert, damit die Paragraphen-Struktur erhalten bleibt.

---

### [ADR-008] 2026-05-09: Top-12-Holdings im Strategy-Prompt (nicht nur Layer-Aggregate)
* **Decision:** `analyze_strategy()` injiziert die 12 größten Positionen nach Wert (Ticker, Layer, $B, % AUM) in den User-Prompt.
* **Rationale:** Nur die Layer-Aggregat-Tabelle zu übergeben verlor die Ticker-spezifische Information — das LLM konnte keine konkreten Namen nennen.
* **Consequences:** Prompt-Länge steigt, bleibt aber weit unter Token-Limits. LLM kann jetzt z.B. "BE dominiert den Power-Layer mit X% AUM" statt nur "Power = 25%" schreiben.

---

### [ADR-009] 2026-05-09: max_tokens 500 für Strategy, 300 für Delta-Analyse
* **Decision:** Strategy-Analyse bekommt 500 max_tokens, Delta-Analyse 300.
* **Rationale:** CONVICTION/GAPS/SIGNAL mit 230 Wörtern benötigt mehr Spielraum als die terse QoQ-Analyse (max 200 Wörter). Beide Werte bei Groq und Anthropic identisch.
* **Consequences:** Höhere Token-Kosten bei Anthropic-Provider. Bei Groq kostenlos, daher kein Problem.

---

### [ADR-010] 2026-05-09: Vite Proxy auf Port 8000 (Bugfix: war 8001)
* **Decision:** `frontend/vite.config.ts` proxied `/api/*` auf `http://localhost:8000`.
* **Rationale:** Ursprünglicher Eintrag war Port 8001 — uvicorn läuft standardmäßig auf 8000. Alle API-Calls liefen ins Leere und produzierten 500-Fehler im Frontend.
* **Consequences:** Backend immer mit `--port 8000` starten (Standard). Bei Portkonflikt muss vite.config.ts synchron geändert werden.

---

### [ADR-011] 2026-05-09: ThesisInsight — 3×2 Color-coded Layer Grid
* **Decision:** `ThesisInsight.tsx` zeigt die 6 Layer als 3-spaltig-2-zeiliges Grid. Jede Kachel hat eine Layer-Farbe, listet Holdings als Tags und zeigt Wert + % AUM. Darunter die LLM Strategy Commentary.
* **Rationale:** Lineare Liste wäre auf breiten Screens verschwenderisch. 3×2 erlaubt simultanen Überblick aller Layer ohne Scrollen.
* **Consequences:** Auf schmalen Screens (<768px) bricht das Grid auf 1 Spalte — kein Responsive-Breakpoint implementiert (Dashboard ist Desktop-only).

---

### [ADR-013] 2026-05-09: Portfolio-Chat als ausklappbare Left-Sidebar
* **Decision:** Chat als `ChatPanel.tsx` (linke Sidebar, 320px), Toggle via StatusBar-Button. Backend: `POST /api/chat` injiziert Top-15-Holdings + Layer-Allokation + AUM als Kontext. LLM-Selektor: Groq llama-8b/70b + Anthropic Haiku/Sonnet, steuerbar per Dropdown. Multi-Turn-History wird mit jeder Anfrage mitgegeben.
* **Rationale:** Kein RAG nötig — das Portfolio ist klein genug (typ. <50 Positionen), um vollständig im Prompt zu stehen. Simple POST (kein Streaming) hält die Implementierung minimal.
* **Consequences:** Jede Anfrage re-fetcht Portfoliodaten aus dem Cache (kein separater Chat-Cache). History wächst mit der Session — kein serverseitiger State.

---

### [ADR-012] 2026-05-09: CLAUDE.md als Session-Bootstrap-Dokument
* **Decision:** `CLAUDE.md` im Root enthält Architektur, Dev-Befehle, API-Endpoints, LLM-Konfiguration und Backlog — wird zu Beginn jeder neuen Session gelesen.
* **Rationale:** 13F-Daten und Prompt-Kontext sind komplex. Ohne Dokumentation musste der Stand jedes Mal via `git diff` rekonstruiert werden (kostet Tokens und Zeit).
* **Consequences:** CLAUDE.md muss bei größeren Feature-Änderungen aktiv gepflegt werden — sonst veraltet sie schneller als sie hilft.

---

## HISTORICAL ARCHIVE (Compressed)

[2026-05-09] | ADR-001 | FastAPI (Python) + React (TypeScript) SPA statt Next.js oder Monolith | Umgesetzt; klare Backend/Frontend-Trennung, Vite-Proxy für lokale Dev
[2026-05-09] | ADR-002 | edgartools-Library für SEC EDGAR 13F-Parsing statt Raw-API | Umgesetzt; edgartools abstrahiert CIK-Lookup, Filing-Iteration und XML-Parsing
