# Zercy Landing Page — Claude Instructions

## Projekt-Überblick
Zercy ist ein KI-gestütztes Reiseplanungs-Tool. Dieses Repo ist die **Landing Page** (zercy.app).
Das AI-Tool selbst liegt in `/Users/christinebork/Desktop/cerci-demo/` → live auf app.zercy.app.

## Stack
- **Framework:** Astro (static site)
- **Hosting:** Vercel (Projekt: zercy-landing)
- **API-Funktionen:** `/api/think.js`, `/api/parse.js`, `/api/chat.js`, `/api/zercy-identity.js`
- **Node:** >=22.12.0

## Deploy
```bash
cd /Users/christinebork/Desktop/zercy-landing
npx vercel --prod --force
```

## Domain-Struktur
- `zercy.app` → Landing Page (dieses Repo)
- `www.zercy.app` → Landing Page
- `app.zercy.app` → AI Tool (cerci-demo Repo)

## 7-Sprachen-Regel — WICHTIG!
Änderungen an Texten oder Layout IMMER in allen 7 Sprachen gleichzeitig machen:
- `/src/pages/index.astro` — DE (default)
- `/src/pages/en/index.astro` — EN
- `/src/pages/es/index.astro` — ES
- `/src/pages/fr/index.astro` — FR
- `/src/pages/nl/index.astro` — NL
- `/src/pages/it/index.astro` — IT
- `/src/pages/pt/index.astro` — PT

Alle 7 Seiten rendern über `/src/layouts/ZercyLayout.astro` — der Hauptteil der Logik liegt dort.

## Design-System
| Token | Wert |
|-------|------|
| Warm White | `#FAFAF8` |
| Ocean Blue | `#0EA5E9` |
| Sunset Orange | `#F97316` |
| Deep Navy | `#0F172A` |
| Headlines | Plus Jakarta Sans (700, 800) |
| Body | Inter (400, 500) |

## Headlines (nie ändern ohne alle Sprachen zu updaten)
- **DE:** "Das Reisebüro von früher. / Jetzt hast du Zercy. / Die pure Intelligenz von heute."
- **EN:** "Not your old travel agency. / Now you have Zercy. / Today's pure intelligence."

## Seiten
| Datei | URL | Sprache |
|-------|-----|---------|
| `src/pages/index.astro` | / | DE |
| `src/pages/en/index.astro` | /en | EN |
| `src/pages/about.astro` | /about | EN |
| `src/pages/privacy.astro` | /privacy | DE+EN |
| `src/pages/impressum.astro` | /impressum | DE |
| `src/pages/terms.astro` | /terms | EN |
| `src/pages/404.astro` | /404 | EN |

## API-Architektur (3 Phasen)
1. **think.js** — Claude Sonnet + Extended Thinking → Reise verstehen, Fragen stellen, `planContext` aufbauen. Enthält Claude Haiku Car-only Detection.
2. **parse.js** — Claude Haiku → JSON mit Flughäfen, Daten, ground_transport; SerpAPI für Live-Flugpreise
3. **chat.js** — Claude Haiku → Follow-up mit vollem Session-Kontext
4. **zercy-identity.js** — Gemeinsamer System Prompt + Intelligence Constitution für alle APIs

## Wichtige Logik in ZercyLayout.astro
- `parseDateToISO(s)` — Datum-Normalisierung für Mietwagenformular (alle Formate → YYYY-MM-DD)
- `fmtRC(s)` — Rentalcars.com braucht YYYY-MM-DD (nicht DD/MM/YYYY)
- `pendingCarDates` — Fallback wenn Claude kein Datum extrahiert; Claude-Daten haben immer Priorität
- Car-only Detection: Claude Haiku in think.js (kein Regex!)
- Cookie Consent Banner: localStorage-basiert, 7 Sprachen

## E-Mail
- `info@zercy.app` — Google Workspace Alias, landet in christine.bork@biosacr.com

## GitHub
- Repo: https://github.com/christinebiosa/zercy-landing
- Push: `git add -A && git commit -m "..." && git push`

## Nächste Schritte
1. Affiliate bei Booking.com beantragen
2. Affiliate bei Skyscanner beantragen
3. "Zercy for Business" Landingpage
4. Option: Landing Page + Tool in ein Projekt zusammenführen
