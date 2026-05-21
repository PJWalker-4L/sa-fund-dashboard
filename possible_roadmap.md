# Possible Roadmap — Nutzerpotenzial, Monetarisierung & Strategie

Stand: 2026-05-21  
Kontext: SA Fund Dashboard — Analyse von Marktgröße, Monetarisierung und Ansätzen gegen das 13F-Lag-Problem.

---

## Executive Summary

- **Kernthese bestätigt:** Der Wert liegt nicht in den 13F-Rohdaten (kostenlos, überall verfügbar), sondern in **Interpretation + Aktualisierung der These** zwischen den Filings.
- **Positionierung:** Kein Copy-Trading-Tool, sondern **Thesis-Intelligence / Ideen-Generator**.
- **Moat:** Systematik, Vertrauenswürdigkeit, Confidence-Framework — nicht mehr Rohdaten.
- **Beste Strategie:** Freemium + harte Signale (13F, 13D/13G) + saubere Analysten-Einordnung + klare Unsicherheitskommunikation.

---

## A) Nutzerpotenzial & Marktgröße

### Ausgangsthese

| Segment | Schätzung | Einschätzung |
|---------|-----------|--------------|
| **TAM** | 500k–1M Tech-Profis & vermögende Retail-Investoren (KI-Infrastruktur) | Plausibel als breiter Markt |
| **SOM** | 10k–25k aktive Nutzer (Aschenbrenner-Essay-Leser, zahlungsbereit) | **Ambitioniert** — realistischer Start: niedrige vierstellige zahlende Nutzer |

### Zustimmung / Korrektur

| Punkt | Bewertung |
|-------|-----------|
| Spitze, hochprofitable Nische | ✅ Zustimmung |
| Nutzer suchen spezifisches „Alpha" aus AGI-These, nicht allgemeine Börsen-News | ✅ Zustimmung |
| SOM 10k–25k ohne massives Brand/Distribution | ⚠️ Skeptisch — eher 1k–3k als realistischer Early-Stage-Korridor |
| Hohe Kaufkraft pro Nutzer | ✅ Plausibel bei Signalqualität |

### Schlussfolgerung A

Business-seitig zunächst als **hochwertiges Research-Produkt** mit kleiner Basis planen, nicht als Massen-SaaS.

---

## B) Monetarisierung

### Freemium-Modell (empfohlen)

| Tier | Inhalt | Zweck |
|------|--------|-------|
| **Free** | Verzögerte 13F-Daten, simple Portfolio-Gewichtung, Basis-News-Aggregation | Lead Generation, SEO („Aschenbrenner Portfolio", „Situational Awareness holdings") |
| **Pro ($49–$99/Monat)** | Options-Decoding, Analysten-Einordnung, alternative Daten (Alpha) | Kern des Geschäftsmodells |

### Preisband

- **$49–$99** kann funktionieren, aber nur mit klarer Differenzierung.
- Für frühes Wachstum: **gestaffelt** (Einstieg günstiger, Expert-Tier höher) oft sinnvoller.

### Pro-Tier Feature-Bewertung

| Feature | Nutzen | Risiko / Aufwand | Empfehlung |
|---------|--------|-------------------|------------|
| Options-Decoding (Strike, Strategie) | Hoch | Hoch ohne echte Options-Detaildaten — schnell spekulativ | Nur als **Confidence-basiertes Modell**, klar gekennzeichnet |
| Analysten-Einordnung (Mid-Cap Deep-Dives) | Sehr hoch | Mittel (Content-Pflege) | ✅ Kern des Pro-Tiers |
| Alternative Daten (Jobs, Genehmigungen, Lieferketten) | Hoch | Hoch (Datenbeschaffung, Pflege) | Phase 2+, selektiv |

### Strukturelles Risiko: 13F-Lag

- Hedgefonds melden **45 Tage nach Quartalsende**.
- Kauf im Januar → Öffentlichkeit sieht es Mitte Mai.
- Blindes Kopieren 45–135 Tage später = oft Kauf am Top.
- **Lösung:** Produkt darf kein Copy-Trading-Tool sein; muss erklären **warum** der Fonds hält, damit Nutzer selbst entscheiden können, ob die These heute noch intakt ist.

---

## C) Vier Ansätze gegen das 13F-Lag — Bewertung

### 1. Echtzeit-Analyse des Options-Flows

- **Idee:** Flow-Scanner für Block-Trades/Sweeps in KI-Infrastruktur-Sektoren; probabilistische Zuordnung zur Aschenbrenner-These.
- **Nutzen:** Potenziell hoch
- **Risiko:** Sehr hoch — Attribution zu *diesem* Fonds unsicher, viele False Positives
- **Fazit:** Später, vorsichtig — **nicht als Kernsignal**

### 2. Tracking von 13D- und 13G-Filings

- **Idee:** Bei >5% Eigentum entfällt 45-Tage-Schutzschild; Offenlegung innerhalb weniger Tage.
- **Nutzen:** Sehr hoch
- **Machbarkeit:** Hoch (SEC EDGAR, ähnlich wie 13F)
- **Signalqualität:** Hoch (harte regulatorische Daten)
- **Fazit:** ✅ **Top-Priorität**

### 3. Synthetischer Schatten-Index

- **Idee:** Fundamentaldaten der These in Echtzeit (Netzanschluss-Wartelisten, Transformatoren, Uran, CapEx) + letztes Portfolio → Schatten-Index für logische Umschichtungen.
- **Nutzen:** Hoch
- **Aufwand:** Mittel bis sehr hoch (Datenqualität, Pflege, Methodik)
- **Fazit:** Gut — MVP als **lightweight version** mit wenigen robusten Proxies starten

### 4. Repositionierung des Produktwerts

- **Idee:** Copy-Trading eliminieren; 13F-Daten als Blaupause für fundamentale Kriterien; Nutzer identifiziert nächstes logisches Ziel entlang der Wertschöpfungskette.
- **Nutzen:** Maximal
- **Aufwand:** Gering bis mittel (Messaging, UI, Disclaimer, Report-Struktur)
- **Fazit:** ✅ **Pflicht — sofort umsetzen**

---

## D) Priorisierte Reihenfolge (Empfehlung)

| Priorität | Option | Begründung |
|-----------|--------|------------|
| 1 | **Repositionierung (Option 4)** | Sofort — Messaging, UI, Disclaimer |
| 2 | **13D/13G Alerts (Option 2)** | Erstes neues Signalprodukt, harte Daten |
| 3 | **Schatten-Index light (Option 3)** | Wenige robuste Indikatoren, kein Over-Engineering |
| 4 | **Options-Flow (Option 1)** | Erst später als probabilistischer Zusatz |

---

## E) Weitere, evtl. bessere Möglichkeiten

| Idee | Beschreibung | Nutzen |
|------|--------------|--------|
| **Confidence-Score pro Insight** | High/Medium/Low mit Begründung (direct filing vs. estimated) | Vertrauen, Differenzierung |
| **Lag-aware Backtesting** | „Was hätte ein Nutzer realistisch sehen/handeln können?" | Ehrlichkeit, Anti-Copy-Trading |
| **Decision Journal / Thesis Tracker** | These intakt/gebrochen, mit Triggern | Retention, Engagement |
| **Fund-vs-Thesis Drift Monitor** | Wie stark weicht neues Filing von Kernthese ab? | Unique Insight |
| **B2B-/Team-Tier** | Research-Desk, Family Office, PM-Teams | Höherer ARPU als Retail-only |

---

## F) Schnellster Weg zu Revenue

1. **Harte Signale:** 13F + 13D/13G (bereits teilweise im Stack: edgartools, SEC)
2. **Saubere Interpretation:** LLM-Analysen mit Confidence-Layer (ADR-021, Thesis Stack)
3. **Klare Unsicherheitskommunikation:** Disclaimer, 13F ≠ NAV, Lag-Hinweise (Timeline, Fund News)
4. **Free Tier:** SEO, verzögerte Daten, Basis-News
5. **Pro Tier:** Analysten-Einordnung, 13D/13G-Alerts, Schatten-Index light

---

## G) Abgrenzung zum aktuellen Dashboard

| Bereits umgesetzt | Noch offen / Roadmap |
|-------------------|----------------------|
| 13F-Parsing, QoQ-Delta, Thesis-Layer | 13D/13G-Tracking |
| AI Insight (5-Block), Strategy Commentary | Confidence-Score pro Kennzahl |
| Quarterly Timeline, Fund News (SEC + Holdings + RSS) | Schatten-Index light |
| Regulatory AUM vs. 13F Notional Caveat | Lag-aware Backtesting |
| Put/Call-Awareness, Mixed Expression | B2B-Tier, Decision Journal |

---

## H) Nächste Schritte (optional)

- [ ] 12-Wochen Produkt- und Monetarisierungs-Roadmap mit KPI-Zielen
- [ ] Go/No-Go-Kriterien pro Feature-Phase
- [ ] Messaging-Update: „Thesis Intelligence" statt „Portfolio Tracker"
