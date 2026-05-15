# Zercy Landing Page — Claude Instructions

## ⚠️ DEEP-LINKS — ZENTRAL IM `zercyUrls` OBJEKT (NUR DORT ÄNDERN!)

**Seit 2026-04-16:** Alle Deep-Link-Formate leben im `zercyUrls`-Objekt oben im Script-Bereich von `src/layouts/ZercyLayout.astro` (~Zeile 1108). Jede URL-Generierung ruft dort eine Methode auf. **Nie wieder Inline-URLs bauen.** Wer ein neues Format braucht: Methode in `zercyUrls` ergänzen und überall aufrufen.

### Verifizierte Formate (Stand 2026-04-16)

| Service | Methode | Format |
|---|---|---|
| **Google Flights** | `zercyUrls.googleFlights(origin, dest, outDate, retDate)` | `?q=flights+from+X+to+Y+on+YYYY-MM-DD[+returning+YYYY-MM-DD]` — Query-Format, weil das Hash-Format `#flt=X.Y.DATE` das Datum nicht zuverlässig überträgt |
| **Google Hotels** | `zercyUrls.googleHotels(dest, ci, co)` | `/travel/search?q=hotels+in+CITY+check+in+YYYY-MM-DD+check+out+YYYY-MM-DD` |
| **Booking.com** | `zercyUrls.bookingHotels(dest, ci, co)` | `?ss=CITY&checkin=YYYY-MM-DD&checkout=YYYY-MM-DD&group_adults=2&no_rooms=1` |
| **Expedia Hotels** | `zercyUrls.expediaHotels(dest, ci, co)` | `?destination=CITY&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&rooms=1&adults=2` |
| **Expedia Flights** | `zercyUrls.expediaFlights(orig, dest, out, ret, cabin)` | `?trip=...&leg1=from:X,to:Y,departure:MM/DD/YYYYTANYT&...` — **intern** formatiert, einfach YYYY-MM-DD rein |
| **Expedia Cars** | `zercyUrls.expediaCars(city, pickup, dropoff)` | `/carsearch?locn=CITY&date1=YYYY-MM-DD&...` |
| **Kayak Cars** | `zercyUrls.kayakCars(city, pickup, dropoff)` | `/cars/CITY/YYYY-MM-DD/YYYY-MM-DD` |
| **Google Maps** | `zercyUrls.googleMaps(origin, dest, mode)` | `/maps/dir/A/B/?travelmode=transit\|driving` |

### Kernregeln
- **Inputs sind IMMER YYYY-MM-DD.** Jede Methode formatiert intern (z.B. `expediaFlights` macht MM/DD/YYYY selbst).
- **Nie Inline-URLs bauen.** Wenn du `${baseUrl}/search?...` siehst, ist das Code-Smell → zentral refactoren.
- **Neuer Service?** Erst Methode in `zercyUrls` anlegen, dann nutzen.
- **Format defekt?** Nur in `zercyUrls` ändern, fertig — es gibt keine anderen Stellen.


## ⛔ VERBOTENE REISEZIELE — IMMER EINHALTEN

**Folgende Destinations kommen NIEMALS in Artikel, City Guides, Empfehlungen, Cross-Links oder Affiliate-CTAs.** Gründe: aktiver Krieg, Sanktionen/Embargo, LGBTQ-Strafgesetze (inkompatibel mit Booking.com-Affiliate-Strategie) oder schwerer politischer Kontext.

### Absolute No-Go-Liste (Stand 2026-05-09)

| Destination | Grund |
|---|---|
| **Kuba / Havanna** | US-Embargo, kommunistische Diktatur, wirtschaftliche Krise, kein normaler Tourismusmarkt |
| **Dubai / UAE (inkl. Abu Dhabi)** | LGBTQ-Gesetze mit Haftstrafen bis 10 Jahre — unvereinbar mit Booking.com-Affiliate |
| **Doha / Katar** | Identische LGBTQ-Gesetze wie UAE |
| **Israel / Gaza-Region** | Aktiver Krieg, hochpolitisch |
| **Russland / Moskau** | EU/US-Sanktionen, aktiver Ukraine-Krieg |
| **Belarus** | EU-Sanktionen, Lukaschenko-Regime |
| **Iran** | US/EU-Sanktionen, keine normale Tourismusinfrastruktur |
| **Nordkorea** | Vollständige Isolation |
| **Venezuela** | US-Sanktionen, wirtschaftlicher Zusammenbruch |
| **Myanmar** | Militärputsch 2021, US/EU-Sanktionen |
| **Syrien** | Aktiver Konflikt, Sanktionen |
| **Jemen** | Aktiver Krieg |
| **Sudan** | Aktiver Krieg |
| **Afghanistan** | Taliban-Herrschaft, keine Touristeninfrastruktur |

### Bereits gelöschte Artikel (2026-05-09)
Dubai, Abu Dhabi, Doha, Tbilisi, Kuba — alle 3 Sprachversionen (18 Dateien) entfernt. Alle Cross-References in anderen Artikeln bereinigt.

### Erlaubt (kein Embargo/Krieg trotz politischem Kontext)
Türkei (Istanbul, Antalya), Thailand, Vietnam, Marokko, Singapur, Kolumbien (inkl. Medellin), Mexiko — gelten als Mainstream-Touristenziele ohne Affiliate-Konflikt.

### Grenzfälle (kein Standardinhalt, auf Anfrage diskutieren)
- Tbilisi/Georgien: russische Besatzung von 20% des Landes, pro-russische Regierung
- Hongkong: Nationales Sicherheitsgesetz
- Taipei/Taiwan: geopolitische Spannungen mit China

---

## 🌐 hreflang & Topic-Key-Eindeutigkeit — KRITISCH

**Stand 2026-05-14:** Alle 3 Article-Templates (`src/pages/blog/[slug].astro`, `src/pages/en/blog/[slug].astro`, `src/pages/es/blog/[slug].astro`) emittieren hreflang-Tags, die aus `src/data/hreflang-map.json` gespeist werden. Die JSON wird von `scripts/generate-hreflang-map.mjs` generiert, das wiederum `scripts/photo-mapping.mjs` als Quelle nutzt.

### Eiserne Regel: Jeder Artikel braucht einen EINDEUTIGEN Topic-Key

Ein Topic-Key in `slugToTopic` darf von **maximal einem Artikel pro Sprache** verwendet werden. Wenn zwei verschiedene DE-Artikel denselben Key haben, gewinnt der zuletzt verarbeitete und der andere verliert seine Cross-Language-Verknüpfung.

**Beispiele (richtig):**
- `wo-uebernachten-madrid` / `where-to-stay-madrid` / `donde-alojarse-madrid` → `madrid`
- `madrid-24-stunden` / `madrid-24-hours` / `madrid-24-horas` → `madrid-24h` (eigener Key!)
- `wo-uebernachten-porto` → `porto` · `porto-die-unterschaetzte-schwester` → `porto-guide`

**Beispiele (falsch, ergibt Hreflang-Bruch):**
- `wo-uebernachten-madrid` UND `madrid-24-stunden` beide → `madrid` ❌

### Wie testen
Nach jeder Änderung an `photo-mapping.mjs`:
```bash
node scripts/generate-hreflang-map.mjs
```
Ausgabe MUSS lauten: `✓ hreflang-map.json — X/Y articles mapped` mit kleinem Unterschied (höchstens identisch-Slug-Duplikate wie `osaka-vs-kyoto`).
Bei `(N without cross-language match)` mit N > 10: **Kollision vorhanden, fixen bevor deployed wird.**

### Foto vs. hreflang — wichtige Unterscheidung
Mehrere Slugs dürfen sich **dasselbe Foto teilen** (z.B. `wo-uebernachten-madrid` + `madrid-24-stunden` zeigen beide ein Madrid-Foto). Aber sie müssen **unterschiedliche Topic-Keys** haben, sonst bricht hreflang.
- Foto-Sharing: zwei Topic-Keys können denselben Unsplash-Query in `topicToQuery` haben. Die Files in `public/img/blog/` sind dann unterschiedlich (`madrid.jpg`, `madrid-24h.jpg`), aber das Motiv passt zum gleichen Suchbegriff.
- Wenn Speicherplatz sparen gewünscht: das `heroImage` im Frontmatter kann manuell auf einen geteilten Pfad gesetzt werden — aber der Topic-Key in `slugToTopic` bleibt eindeutig.

---

## Projekt-Überblick
Zercy ist ein KI-gestütztes Reiseplanungs-Tool. Dieses Repo ist die **Landing Page** (zercy.app).
Das AI-Tool (Repo: cerci-demo) läuft live auf app.zercy.app.

## Stack
- **Framework:** Astro (static site)
- **Hosting:** Vercel (Projekt: zercy-landing)
- **API-Funktionen:** `/api/think.js`, `/api/parse.js`, `/api/chat.js`, `/api/zercy-identity.js`
- **Node:** >=22.12.0

## Deploy (IMMER alle 4 Schritte, IMMER!)
```bash
cd /Users/christinebork/Desktop/zercy-landing
node scripts/generate-hreflang-map.mjs
npx astro build
npx vercel --prod --force
git add -A && git commit -m "Beschreibung der Änderung" && git push
```
**NIEMALS** nur Vercel deployen ohne Git-Push. GitHub MUSS immer synchron sein mit dem was live ist. Nicht fragen ob gepusht werden soll — einfach machen. Das ist Teil des Deployments.

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

## Headlines (nie ändern ohne alle Sprachen zu updaten, KEINE Em-Dashes!)
- **DE:** "Ob Reiseidee oder konkreter Plan. / Zercy denkt mit und liefert echte Optionen. / Mit Live-Preisen. Du entscheidest. Du buchst."
- **EN:** "Travel idea or ready to book. / Zercy thinks it through and finds your options. / Live prices. You decide. You book."

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
1. **think.js** — Claude Sonnet (kein Extended Thinking — zu langsam für Vercel 60s Limit) → Reise verstehen, `ready_to_search` entscheiden, max. 1–2 Fragen stellen, Route-Hypothesen, Smart Insights. Enthält Claude Haiku Car-only Detection. SerpAPI Normalisierung strippt Grammatikwörter (DE/FR/ES/NL) damit nur Städtenamen übrig bleiben.
2. **parse.js** — Claude Haiku → JSON mit Flughäfen, Daten, ground_transport.options[]; SerpAPI für Live-Flugpreise. Bekommt `planContext` mit `userIntent`.
3. **chat.js** — Claude Haiku → Follow-up mit vollem Session-Kontext
4. **zercy-identity.js** — Gemeinsamer System Prompt + Intelligence Constitution für alle APIs. **Enthält OTA-Schutzregel:** Zercy empfiehlt NIE Direktbuchung bei Hotels/Chains — immer Booking.com, Expedia oder Airbnb.

## think.js — Thinking-Budget-Logik
```
score >= 5 (komplex): Sonnet, kein Thinking, max_tokens 5000
score >= 3:           Sonnet, budget 1000, max_tokens 4000
score >= 1:           Sonnet, kein Thinking, max_tokens 3000
score 0:              Haiku, kein Thinking, max_tokens 2500
```
Score-Signale: anywhere/irgendwo (+3), month/monate (+2), flexible/flexibel (+2), multiple/mehrere (+2), open-jaw (+2), business/first class (+1), nonstop (+1)

## think.js — JSON-Output (wichtig: `ready_to_search`!)
```json
{
  "ready_to_search": true,   ← true wenn Origin+Destination+Datum bekannt
  "questions": [...],         ← max 1–2, KEINE Meilen/Loyalty-Frage (Suche filtert nicht danach)
  "route_hypotheses": [...],  ← werden als Karten gerendert
  "smart_insights": [...],    ← werden als gelbe Pills gerendert
  "understood": {...},
  "narrative": "...",
  "zercy_plan_note": "..."
}
```

## Wichtige Logik in ZercyLayout.astro

### Kernfunktionen
- `appendPlanTurn(prompt, d)` — rendert think.js Output: Narrative-Banner → Fragen-Panel (dominant) → Insights/Hypothesen als dezenter Kontextblock drunter. Bei `ready_to_search: true` + keine Fragen: Auto-Search nach 0.8s.
- `buildQuestionRow(q)` — vertikales Layout (Frage oben, Chips darunter, volle Breite). NICHT `buildFormRow` für dynamic questions verwenden.
- `collectAnswersAndSearch(turnId)` — sammelt Chips + Freetext + Zercy-Understood + **USER CLARIFICATIONS (am Ende, als Override)**. User-Korrekturen überschreiben ältere Annahmen.
- `toggleFlightView(view, turnId)` — Cards ↔ Table. Versteckt `grid-2` (Summary-Cards) in Table-Mode. Hotels + Cars am Ende des Turns immer sichtbar (`extraComponentsHtml(d)` ohne skipHotel).

### Loading-States (2026-04-16)
- `startLoadingSequence(phase, hostId)` / `stopLoadingSequence()` / `renderLoadingSteps()` — Checkmark-Sequenz mit 3-4 Steps pro Phase (think/search), rotiert alle 1.4s
- In `thinkIntent`: thinking-phase, dann auto-scroll zum Loading
- In `parseIntent`: searching-phase (inline-loading)
- Translations: `thinkingSteps[]` und `searchingSteps[]` in 7 Sprachen im L-Objekt

### Error-Handling (2026-04-16)
- `safeApiResponse(res)` — fängt JSON-Parse-Failures ab (Vercel Timeout gibt Plain-Text). Zeigt klare lokalisierte Fehlermeldung statt "Unexpected token". Translation-Keys: `timeoutError`, `apiError`

### Sprachsteuerung (2026-04-16)
- **`uiLanguage`** wird von allen 5 Frontend-API-Calls mitgesendet (thinkIntent, parseIntent, submitFreetextToZercy, chat, zweiter think-respond)
- think.js, parse.js, chat.js: Language-Rule mit `uiLanguage`-Override. UI-Sprache hat Vorrang, Städtenamen (Frankfurt, München) sind KEINE Sprachsignale.

### Partner-Buttons (CSS-Klassen)
- `.google-btn` (#4285F4), `.booking-btn` (#003580), `.expedia-btn` (#ffd000), `.expedia-navy-btn` (#003087), `.dc-btn` (#FFDD00 + #0A2647 border)
- Hotels: Google Hotels + Booking.com + Expedia
- Mietwagen: Expedia (navy) + DiscoverCars (gelb/navy, Homepage-Fallback bis API-Approval)

### Blog-Pinning
- In `src/pages/blog/index.astro` und `src/pages/en/blog/index.astro`: `PINNED_ID` Variable hält einen Artikel fix auf Position 1 (Top-Left). Aktuell: `mietwagen-consolidator-guenstiger-fahren` (DE) / `rental-consolidators-save-money` (EN). Nach DC-Approval entfernen.

### Blog-Suche (Pagefind) — Stand 2026-05-08
- **Engine:** Pagefind 1.5.2, client-side. Component: `src/components/BlogSearch.astro`
- **Eingebunden:** alle 3 Listings (DE/EN/ES) zwischen `.blog-hero` und `.chips-bar`
- **Vite-Falle:** `import(/* @vite-ignore */ pagefindUrl)` — URL MUSS Variable sein, kein Inline-String
- **Excerpt-Scoping:** `data-pagefind-body` auf `<div class="prose">` in allen 3 `[slug].astro` Templates — nur Artikel-Body wird indiziert, kein Nav/Breadcrumb-Müll
- **Metadaten:** In allen 3 `[slug].astro` Templates:
  - `<meta property="og:image" content={heroImage} data-pagefind-meta="image[content]" />` im Head → `d.meta.image` in JS
  - `data-pagefind-meta="category"` auf `.article-category` Span → `d.meta.category` in JS
- **KRITISCH — Astro `is:global`:** BlogSearch.astro nutzt `<style is:global>`. Ohne das greift kein einziger `bsr-*`-Style auf dynamisch per `innerHTML` injizierte Elemente (Astro scopet normale `<style>`-Blöcke mit `[data-astro-cid-xxx]`, das kommt bei innerHTML-Elementen nie an).
- **Result-Cards:** Thumbnail (56px, heroImage) + Kategorie-Pill (blau) + Titel (fett) + Excerpt (2-zeilig, match-highlight) + Chevron. Keyboard-Nav: ↓ aus Input → erste Card, ↑↓ zwischen Cards, Esc schließt.

### Booking.com Affiliate — ⚠️ KEINE AFFILIATE-ID AKTIV
- **BookingCTA.astro** (`src/components/BookingCTA.astro`) hat KEINEN `?aid=`-Parameter — alle Klicks sind ungetrackt, $0 Provision
- Fix: `params.set('aid', 'DEINE_AID')` in `buildBookingUrl()` ergänzen, sobald AID vorhanden
- **Nächster Schritt:** Bei `affiliate.booking.com` registrieren ODER Awin-Bewerbung abschicken
- Nach AID: Deals Finder Widget in City-Guides einbauen (Live-Preise, auto-update, höhere Conversion)

### Sonstige wichtige Logik
- `chatTripContext = null` — wird beim Start von `thinkIntent()` zurückgesetzt
- `cleanDest = hotelDest || gt?.destination || a.city` — User-Intent hat Priorität
- Frontend-Fallback: think.js Crash/Timeout → direkt `parseIntent(intent)`
- `isGroundOnly()` — KEINE hotel/hostel/airbnb/cruise Keywords drin
- `parseDateToISO(s)` — Datum-Normalisierung (alle Formate → YYYY-MM-DD)
- Car-only Detection: Claude Haiku in think.js (kein Regex!)
- Cookie Consent Banner: localStorage-basiert, 7 Sprachen, erwähnt Partner-Cookies
- Affiliate-Disclosure: Footer in 7 Sprachen

## zercy-identity.js — OTA-Schutzregel (KRITISCH für Affiliate!)
Zercy darf NIEMALS empfehlen, Hotels direkt bei der Kette oder Unterkunft zu buchen.
Immer auf Booking.com, Expedia oder Airbnb verweisen.
Diese Regel ist im `You NEVER:` Block am Ende des System Prompts verankert — gilt für alle 3 APIs.

## E-Mail
- `info@zercy.app` — Google Workspace Alias, landet in christine.bork@biosacr.com

## GitHub
- Repo: https://github.com/christinebiosa/zercy-landing
- Push: `git add -A && git commit -m "..." && git push`

## Nächste Schritte (Stand 2026-04-17)
1. **Product Hunt Launch** — vorbereitet in `~/Desktop/ProductHunt-Launch/`, geplant für Di 22. oder Mi 23. April
2. **Awin-Bewerbung** für Booking.com (LATAM/US-Track, CR-Wohnsitz)
3. **DiscoverCars API/White-Label** — E-Mail an Sergey (sergey.kulpin@discovercars.com) am 2026-04-17 geschickt, Antwort abwarten
4. **Reddit-Posts** in r/travel, r/digitalnomad nach PH-Launch
5. **"Zercy for Business" Landingpage** anlegen

## Affiliate-Status (Stand 2026-04-17)
- **Disclosure**: Footer (7 Sprachen) + Datenschutzerklärung Sektion 4 + Cookie-Banner
- **Buttons**: Hotels (Google/Booking/Expedia), Mietwagen (Expedia navy + DiscoverCars gelb/navy)
- **DiscoverCars**: Standard-Affiliate abgelehnt. API/White-Label-Anfrage läuft (Sergey). Button zeigt Homepage mit `a_aid`-Placeholder. DC Deep-Links nicht möglich ohne Approval (POST-API blockt ohne Auth).
- **Awin**: noch nicht beantragt (nächster Schritt nach PH-Launch-Traffic)
- **Alle Affiliate-IDs**: zentral in `zercyUrls` im ZercyLayout.astro (~Zeile 1108)
- Details: siehe Memory `project_zercy_affiliate.md`

## Google Analytics + Search Console API (2026-04-17)
- **OAuth Credentials**: `/Users/christinebork/.zercy-analytics/tokens.json`
- **GA4 Property**: `properties/530287390` (zercy.app)
- **Search Console**: `sc-domain:zercy.app`
- **Google Cloud Projekt**: `claude-code-mcp-487718`
- **APIs aktiviert**: Analytics Data API, Analytics Admin API, Search Console API
- Token refreshen: `curl -s -X POST https://oauth2.googleapis.com/token -d "client_id=...&client_secret=...&refresh_token=...&grant_type=refresh_token"`

## Vercel Hobby-Plan Limitierungen
- **Max 12 Node-Serverless-Functions** pro Deployment. Aktuell belegt: 12 (alle ohne `_`-Prefix in `/api/`).
- Neue APIs müssen **Edge Runtime** sein (`export const config = { runtime: 'edge' }`) — Edge zählt separat.
- Alternativ: bestehende Functions konsolidieren oder Pro-Plan upgraden.

---

## Blog-Artikel — Vollständige Checkliste (IMMER anwenden, ohne Aufforderung)

Wenn ein neuer Blog-Artikel für Zercy geschrieben wird, MÜSSEN alle folgenden Punkte automatisch erfüllt sein — ohne dass Christine danach fragen muss.

### Sprachen & Dateipfade
- DE-Artikel → `src/content/blog/[slug].md`
- EN-Artikel → `src/content/blogen/[slug].md`
- Slugs: lowercase, Bindestriche, keine Sonderzeichen
- **Immer beide Sprachversionen schreiben** — DE und EN gleichzeitig

### Frontmatter — Pflichtfelder
```yaml
---
title: "Titel des Artikels"
metaTitle: "Meta Title | Zercy"     # 45–60 Zeichen
description: "Meta Description"     # 160–200 Zeichen
pubDate: YYYY-MM-DD
category: "Kategorie"               # siehe gültige Kategorien unten
readingTime: N                      # Minuten, realistisch einschätzen
heroImage: "/img/blog/[topic].jpg"  # PFLICHT: siehe Foto-Workflow unten
bookingDest: "Stadt/Land"           # OPTIONAL: aktiviert Booking-CTA-Banner (siehe unten)
---
```

### 📸 Foto-Workflow (PFLICHT bei jedem neuen Artikel!)

**Niemals** Artikel deployen ohne `heroImage` im Frontmatter — sonst sieht die Card mit Icon-Fallback unfertig aus zwischen den anderen mit Fotos.

**Bei NEUEM Artikel — 3 Schritte:**

1. **Topic-Mapping ergänzen** in `scripts/photo-mapping.mjs`:
   ```js
   // In slugToTopic{}: jeden neuen Slug → Topic-Key
   'mein-neuer-artikel-slug': 'mein-topic-key',  // gleicher Key für DE/EN/ES Varianten
   // In topicToQuery{}: Topic-Key → Unsplash-Suchbegriff
   'mein-topic-key': 'specific search term',     // 2-4 Wörter, konkret
   ```

2. **Foto holen + Frontmatter setzen** (ein Befehl):
   ```bash
   cd "$HOME/Claude Code Projects/zercy-landing" && SLEEP_MS=2000 node scripts/download-photos.mjs
   ```
   Sleep auf 2s reduzieren wenn nur 1-3 neue Topics — Demo-Limit reicht. Bei 50+ neuen Topics: SLEEP_MS=75000 (sicher unter 50/h).

3. **Verify** dass `heroImage: "/img/blog/[topic].jpg"` im Frontmatter steht und die Datei in `public/img/blog/` existiert. Build → die Card zeigt das Foto.

**Bei BEHEBEN von "Card hat Icon statt Foto":**
```bash
node scripts/download-photos.mjs --frontmatter-only
```
Dieses Script-Flag schreibt nur Frontmatter, lädt nichts neu. Sicher zu jedem Zeitpunkt ausführbar.

**⚠️ Topic-Key-Eindeutigkeit (für hreflang!):**
Im Gegensatz zum frühen Foto-Sharing-Ansatz (mehrere Artikel = ein Key = ein Foto) gilt jetzt: **jeder Artikel hat seinen eigenen Topic-Key**, auch wenn er thematisch ähnlich ist. Foto-Sharing geht weiterhin, indem zwei Keys denselben Unsplash-Query bekommen. Siehe Abschnitt "🌐 hreflang & Topic-Key-Eindeutigkeit" oben.

**Topic-Sharing (Foto-Recycling):**
- Slugs die thematisch identisch sind, sollten denselben Topic-Key bekommen → teilen sich ein Foto.
- Beispiel: `wo-uebernachten-cancun` + `where-to-stay-cancun` + `donde-alojarse-cancun` → alle Topic `cancun` → eine `cancun.jpg`.
- Spart API-Calls (Demo-Tier: 50/h) und Storage. Bei 214 Slugs nur 96 unique Topics nötig.

**Booking.com-CTA-Banner (nur bei reise-relevanten Artikeln):**
- Frontmatter `bookingDest: "Stadt"` oder `bookingDest: "Land/Region"` setzen → Banner erscheint automatisch nach der Zercy-CTA-Box.
- Standard für City-Guides: Stadt-Name (z.B. `bookingDest: "Cancun"`).
- Topic-Artikel mit klarem Reiseziel: passende Stadt/Region (z.B. Patagonia-Route → `bookingDest: "Patagonia"`).
- KEIN Banner für: KI-Tool-Artikel, Tech-Tipps (Powerbank), allgemeine Tipps (Carry-On). Sonst Spam-Risiko.
- Script für Bulk-Update: `node scripts/add-booking-dest-overrides.mjs` (manuell die overrides-Liste erweitern).

**Unsplash-Token:** in `.env` (NICHT committen — ist in `.gitignore`). Falls fehlend, neu holen via [unsplash.com/oauth/applications](https://unsplash.com/oauth/applications).

**Gültige Kategorien DE (exakt wie im Listing-Code!):** Reisetipps, KI & Reisen, Fernweh, Unterwegs, Clever Reisen, Nur mit Handgepäck, **Wo übernachten**, Business Travel, Nachhaltig, Geheimtipps
**Gültige Kategorien EN (exakt wie im Listing-Code!):** Travel Tips, AI & Travel, Off the Map, On the Move, Smart Travel, Carry-On Only, **Where to Stay**, Business Travel, Travel Green, Hidden Gems

(Verifiziert gegen `src/pages/blog/index.astro` und `src/pages/en/blog/index.astro`. Andere Namen führen dazu, dass der Artikel auf der Listing-Seite nicht korrekt angezeigt wird. **"Wo übernachten / Where to Stay"** wurde 2026-05-07 von "Traumunterkünfte / Stay Here" umbenannt — strategische Booking.com-Kategorie.)

### Stil & Sprache
- **Keine Em Dashes** (— oder –) — stattdessen Komma, Doppelpunkt oder neuer Satz. Gilt für Titel, Subtitles, Body und FAQs.
- Kurze, direkte Sätze. Satzlänge variieren. Keine AI-Floskeln.
- Anrede: **du** (nie Sie), kein Gendern.

### Länge & Struktur
- **Mindestlänge: 700 Wörter, Ziel: 800–1000 Wörter**
- Tiefe Sektionen mit konkreten Details, Preisangaben, praktischen Infos
- Keine rein theoretischen Tipps — immer spezifisch und umsetzbar
- H2 für Hauptsektionen, H3 nur für FAQ
- Kurze, direkte Sätze. Kein akademischer Ton.

### H2-Überschriften: AEO-optimiert (PFLICHT)
Moderne Antwortmaschinen (Google AI Overview, Perplexity, ChatGPT-Suche) ziehen Antworten direkt aus H2-Fragen und den Absätzen darunter. Deshalb:

- **Mindestens 3–4 H2s pro Artikel als Frage formulieren.** Nicht alle, aber die zentralen.
- Typische Muster:
  - "Warum ist X wichtig?" / "Why is X important?"
  - "Wann ist die beste Zeit für Y?" / "When is the best time for Y?"
  - "Wie viel kostet Z?" / "How much does Z cost?"
  - "Was solltest du bei X beachten?" / "What should you watch for with X?"
  - "Welche Variante lohnt sich?" / "Which option is worth it?"
- **Nicht erzwingen bei time-basierten Tagesplan-H2s** (z.B. "8 Uhr: Frühstück") oder Listen-H2s (z.B. "Stopp 1: Barcelona"). Diese bleiben Statements.
- Ziel: 3–4 Q-H2s plus 2–4 Statement-H2s pro Artikel.

### Externe Autoritäts-Links: PFLICHT (E-E-A-T-Signal)
**Jeder Artikel braucht 1–2 externe Links** zu autoritativen Quellen. Das verbessert Google E-E-A-T-Signale und macht den Artikel als Quelle zitierfähig.

**Akzeptierte Quelltypen (Priorität absteigend):**
1. Offizielle Websites von Sehenswürdigkeiten/Museen/Nationalparks (z.B. museodelprado.es, musei.ferrari.com)
2. Nationale Tourismus-Boards (visitcostarica.com, visiticeland.com)
3. Offizielle Behörden/Verkehrsmittel (bahn.de, trenitalia.com, vedur.is)
4. UNESCO, Michelin Guide, Wikipedia für etablierte Begriffe
5. Versicherer/Services wenn konkret empfohlen (ADAC, Allianz Travel, Bounce/Radical Storage)

**Nicht erlaubt:** Konkurrenz-Blogs, TripAdvisor/Booking-Links ohne Affiliate-Kontext, eigene Social Media, schwache Autoritätsquellen.

**Format:** Inline im Fließtext, kontextuell (z.B. "Tickets via [Museo del Prado](https://www.museodelprado.es/en)"), nicht als Link-Liste hinten.

### Interne Links — PFLICHT (mehr als bisher!)
Jeder Artikel braucht:
1. **3–4 interne Links im Fließtext** (vorher war 2 — zu wenig). Kontextuell eingebaut, wo sie Sinn machen. Mehr = besser für SEO.
2. **"Read more:" / "Mehr lesen:" Block am Ende** — genau 3 interne Links.

DE-Links: `/blog/[slug]` · EN-Links: `/en/blog/[slug]`

**Bestehende ES-Artikel (Slugs für interne Verlinkung — Stand 2026-05-11):**
- donde-alojarse-amsterdam, donde-alojarse-antalya, donde-alojarse-atenas, donde-alojarse-auckland
- donde-alojarse-bali, donde-alojarse-bangkok, donde-alojarse-barcelona, donde-alojarse-berlin
- donde-alojarse-bogota, donde-alojarse-bolonia, donde-alojarse-boston, donde-alojarse-brisbane
- donde-alojarse-bruselas, donde-alojarse-budapest, donde-alojarse-buenos-aires, donde-alojarse-cancun
- donde-alojarse-cartagena, donde-alojarse-chiang-mai, donde-alojarse-chicago, donde-alojarse-ciudad-de-mexico
- donde-alojarse-ciudad-del-cabo, donde-alojarse-colombo, donde-alojarse-copenhague, donde-alojarse-cracovia
- donde-alojarse-cusco, donde-alojarse-delhi, donde-alojarse-dublin, donde-alojarse-dubrovnik
- donde-alojarse-edimburgo, donde-alojarse-el-cairo, donde-alojarse-estambul, donde-alojarse-estocolmo
- donde-alojarse-florencia, donde-alojarse-goa, donde-alojarse-hanoi, donde-alojarse-ho-chi-minh
- donde-alojarse-hong-kong, donde-alojarse-jaipur, donde-alojarse-johannesburg, donde-alojarse-kioto
- donde-alojarse-kuala-lumpur, donde-alojarse-la-valeta, donde-alojarse-las-vegas, donde-alojarse-lima
- donde-alojarse-lisboa, donde-alojarse-los-angeles, donde-alojarse-madrid, donde-alojarse-malaga
- donde-alojarse-marrakech, donde-alojarse-marsella, donde-alojarse-medellin, donde-alojarse-melbourne
- donde-alojarse-mendoza, donde-alojarse-miami, donde-alojarse-milan, donde-alojarse-mumbai
- donde-alojarse-munich, donde-alojarse-mykonos, donde-alojarse-nairobi, donde-alojarse-napoles
- donde-alojarse-nashville, donde-alojarse-niza, donde-alojarse-nueva-orleans, donde-alojarse-nueva-york
- donde-alojarse-oaxaca, donde-alojarse-oporto, donde-alojarse-osaka, donde-alojarse-oslo
- donde-alojarse-paris, donde-alojarse-penang, donde-alojarse-phuket, donde-alojarse-playa-del-carmen
- donde-alojarse-praga, donde-alojarse-puerto-vallarta, donde-alojarse-reikiavik, donde-alojarse-riga
- donde-alojarse-rio-de-janeiro, donde-alojarse-roma, donde-alojarse-salzburgo, donde-alojarse-san-francisco
- donde-alojarse-santiago, donde-alojarse-santorini, donde-alojarse-sao-paulo, donde-alojarse-seattle
- donde-alojarse-seul, donde-alojarse-sevilla, donde-alojarse-siem-reap, donde-alojarse-singapur
- donde-alojarse-split, donde-alojarse-sydney, donde-alojarse-taipei, donde-alojarse-tallin
- donde-alojarse-tenerife, donde-alojarse-tokio, donde-alojarse-toronto, donde-alojarse-tulum
- donde-alojarse-valencia, donde-alojarse-vancouver, donde-alojarse-varsovia, donde-alojarse-venecia
- donde-alojarse-viena, donde-alojarse-washington-dc, donde-alojarse-zurich
- 48-horas-barcelona, 48-horas-estambul, 48-horas-roma, acceso-sala-vip-sin-business
- airbnb-experiences-vale-la-pena, airbnb-vs-hotel-comparacion, albania-riviera-escondida
- apartamento-vs-hotel-cual-elegir, apulia-sur-italia-guia, auroras-boreales-2026
- bali-vs-lombok-comparacion, bangkok-3-dias, booking-genius-vale-la-pena, business-class-sin-millas
- categorias-hotel-explicadas, checklist-alquiler-coche, ciberseguridad-viajeros
- compensacion-co2-vuelos, consejos-vuelos-baratos, consolidadores-alquiler-ahorrar
- costa-rica-ruta-completa, costa-rica-surf, costes-ocultos-alquiler-coche, cruceros-ampliar-ciudades
- cuando-reservar-vuelos, destinos-sol-invierno-enero, dinero-en-el-extranjero-consejos
- equipaje-mano-vs-facturado, errores-viaje-evitar-clasicos, eslovenia-secreto-verde-2026
- fotografia-viaje-consejos, guia-interrail-2026, guia-reservar-hostel, guia-sim-extranjero
- guia-stopover-turismo, guia-viaje-colombia, guia-viaje-nueva-zelanda
- herramientas-ia-comparativa-viajes, hidden-city-ticketing-explicado, hostel-o-hotel-2026
- hoteles-boutique-guia, ia-cambia-planificacion-viajes, ia-comparativa-planificacion-2026
- islandia-guia-viaje, islas-croacia-island-hopping, islas-feroe-guia, islas-griegas-comparativa
- japon-mas-alla-de-tokio, joyas-ocultas-europa, liquidos-equipaje-mano-2026
- lisboa-fuera-ruta-turistica, madrid-24-horas, maldivas-guia-viaje-2026, maleta-capsula-equipaje-mano
- mejores-apps-viaje-2026, mejores-apps-viaje-sin-internet, mejores-destinos-otono-viaje
- mejores-playas-europa-2026, mejores-rutas-senderismo-mundo, mejores-tarjetas-credito-viaje-2026
- millas-puntos-principiantes, modena-museo-ferrari, normas-powerbank-equipaje-mano
- open-jaw-tickets-truco-viaje, oporto-hermana-subestimada, osaka-vs-kyoto
- patagonia-3-semanas-ruta, peru-guia-viaje-highlights, planificador-ia-vs-agencia-viajes
- propinas-en-el-mundo-guia, que-es-zercy, reserva-anticipada-vs-last-minute
- reservar-online-o-directo, retrasos-vuelo-derechos, riads-marruecos-guia
- road-trip-highlands-escocia, road-trip-marruecos, roadtrip-planificacion-etapas
- ruta-66-estados-unidos-road-trip, sabbatical-guia-planificacion, safari-africa-oriental-guia
- santiago-de-compostela-ruta, seguro-viaje-vale-la-pena, slow-travel-que-significa
- solo-equipaje-de-mano, sudeste-asiatico-viaje-economico, superar-jetlag-rapido
- tailandia-2-semanas-ruta, tarjeta-credito-viajes-2026, tokio-viaje-gastronomico
- tren-vs-avion-europa-2026, trenes-nocturnos-europa-2026, trucos-aeropuerto, trucos-upgrade-hotel-gratis
- turismo-gastronomico-comer-como-local, vacaciones-en-familia-consejos, vacaciones-ski-europa-mejores-destinos
- vacaciones-vela-principiantes, viajar-con-adolescentes-consejos, viajar-con-bebe-primer-vuelo
- viajar-con-perro-europa, viajar-con-poco-dinero-consejos, viajar-despues-60-consejos
- viaje-familiar-europa-mejores-destinos, viaje-lujo-economico-trucos, viaje-sin-plastico-consejos
- viaje-solo-mujeres-seguro, viajes-tren-europa, viajes-wellness-spa-destinos, viena-fin-de-semana
- vietnam-2-semanas-ruta, visa-nomada-digital-paises-2026, vuelo-largo-con-ninos
- workation-impuestos-2026, zanzibar-stone-town-guia, zercy-logbook-que-es
- donde-alojarse-burdeos, donde-alojarse-palma-de-mallorca, donde-alojarse-bilbao, donde-alojarse-granada
- donde-alojarse-lanzarote, donde-alojarse-liubliana, donde-alojarse-kotor, donde-alojarse-bucarest
- donde-alojarse-vilna, donde-alojarse-montreal, donde-alojarse-guadalajara, donde-alojarse-katmandu
- donde-alojarse-hoi-an, donde-alojarse-queenstown, donde-alojarse-funchal
- campervan-vacaciones-europa, algarve-guia-viaje-2026, buceo-snorkel-destinos-2026
- ciudades-europeas-invierno-guia, suiza-guia-viaje-2026, tarjetas-ciudad-museos-vale-la-pena
- transporte-aeropuerto-guia-2026, yoga-retiros-destinos-2026, viaje-surf-principiantes-destinos
- crucero-guia-principiantes, intercambio-casas-guia-viajeros, paises-visa-llegada-2026
- islas-caribe-island-hopping-guia, viaje-organizado-vs-independiente, mejores-destinos-playa-mundo-2026
- donde-alojarse-nicosia, donde-alojarse-alicante, donde-alojarse-bratislava
- donde-alojarse-tesalonica, donde-alojarse-gante
- glamping-vacaciones-europa, crucero-fluvial-europa-guia, vacaciones-todo-incluido-vale-la-pena
- workation-portugal-espana-2026, senderismo-alpes-principiantes-guia
- escandinavia-ruta-completa, portugal-ruta-completa, balcanes-road-trip-ruta
- japon-3-semanas-ruta, lista-equipaje-viaje-esencial, india-guia-viaje-highlights
- turquia-road-trip-highlights, mejores-destinos-primavera-europa, viajar-con-gato-europa
- australia-ruta-completa
- corea-sur-2-semanas-ruta, taiwan-guia-viaje-highlights, sri-lanka-ruta-completa
- nepal-guia-viaje-highlights, filipinas-guia-viaje-highlights, jordania-guia-viaje-highlights
- oman-guia-viaje-highlights, uzbekistan-ruta-seda-guide, camboya-guia-viaje-highlights
- laos-guia-viaje-highlights
- mexico-ruta-completa, argentina-guia-viaje-highlights, brasil-guia-viaje-highlights
- chile-guia-viaje-highlights, bolivia-salar-uyuni-guia, ecuador-galapagos-guia-viaje
- guatemala-guia-viaje-highlights, panama-guia-viaje-highlights, republica-dominicana-guia
- cabo-verde-guia-viaje
- irlanda-ruta-completa, malta-gozo-guia-viaje, polonia-ruta-completa
- hungria-guia-viaje-highlights, rumania-guia-viaje-highlights, bulgaria-guia-viaje-highlights
- suecia-guia-viaje-highlights, finlandia-guia-viaje-highlights, dinamarca-guia-viaje-highlights
- paises-bajos-ruta-completa
- kenia-guia-viaje-highlights, tanzania-guia-viaje-highlights, sudafrica-ruta-completa
- egipto-guia-viaje-highlights, namibia-guia-viaje-highlights, ruanda-trekking-gorila-guia
- mauricio-guia-viaje, indonesia-guia-viaje-highlights, fiji-islas-pacifico-guia
- marruecos-ciudades-guia
- costa-oeste-usa-roadtrip, canada-guia-viaje-highlights, azores-guia-viaje
- madeira-guia-viaje, islas-canarias-comparativa, mochilero-guia-principiantes
- viaje-novios-luna-miel-guia, vacunas-viaje-guia, viajes-accesibles-guia
- viaje-vegano-guia

**ES-Stil-Regeln** (für künftige Artikel):
- LATAM-Spanisch (nicht Castellano): "tú" für Anrede, "ustedes" statt "vosotros"
- Slug-Konvention: `donde-alojarse-[ciudad]` (Where-to-Stay-Pendant)
- Kategorien-Mapping (exakt diese Strings, sonst Listing-Farbe falsch):
  - DE "Wo übernachten" / EN "Where to Stay" / ES "Dónde alojarse"
  - DE "Reisetipps" / EN "Travel Tips" / ES "Consejos de viaje"
  - DE "KI & Reisen" / EN "AI & Travel" / ES "IA y viajes"
  - DE "Fernweh" / EN "Off the Map" / ES "Lugares lejanos"
  - DE "Unterwegs" / EN "On the Move" / ES "En camino"
  - DE "Clever Reisen" / EN "Smart Travel" / ES "Viaje inteligente"
  - DE "Nur mit Handgepäck" / EN "Carry-On Only" / ES "Solo equipaje de mano"
  - DE "Business Travel" / EN "Business Travel" / ES "Viajes de negocios"
  - DE "Nachhaltig" / EN "Travel Green" / ES "Viaje sostenible"
  - DE "Geheimtipps" / EN "Hidden Gems" / ES "Joyas ocultas"
- FAQ-W-Wörter ES: ¿Qué? ¿Cuándo? ¿Dónde? ¿Cuál? ¿Cómo? ¿Por qué? ¿Cuánto?
- Astro-Collection: `bloges`, definiert in `src/content.config.ts` (NICHT `src/content/config.ts` — Astro 6 nutzt content.config.ts)
- Routing-Templates: `src/pages/es/blog/[slug].astro` und `src/pages/es/blog/index.astro`
- Lang-Switcher in ES-Article-Templates: DE | EN | ES (alle aktiv, navigiert zu Listing)

**Bestehende DE-Artikel (Slugs für interne Verlinkung):**
- guenstig-fliegen-tipps, wann-fluege-buchen, ki-veraendert-reiseplanung
- airport-hacks, nur-handgepaeck, costa-rica-surfen, boutique-hotels
- business-class, santiago-de-compostela, los-angeles
- mietwagen-check, zugreisen-europa, geheimtipps-europa
- was-ist-zercy, zercy-logbook
- lissabon-abseits-der-touristenpfade, porto-die-unterschaetzte-schwester
- open-jaw-tickets-reise-hack, business-class-ohne-meilen
- ki-reiseplaner-vs-reisebuero, nachtzuege-europa-2026
- mietwagen-consolidator-guenstiger-fahren, mietwagen-versteckte-kosten-vermeiden
- costa-rica-rundreise-route, modena-ferrari-museum
- island-reiseguide, tokio-foodie-reise
- madrid-24-stunden, kreuzfahrt-staedte-verlaengern
- hidden-city-ticketing-erklaert, workation-steuern-2026
- riads-marokko-guide, co2-kompensation-fliegen
- jetlag-schnell-ueberwinden, ki-tools-reise-vergleich
- albanien-riviera-geheimtipp, roadtrip-etappen-planung
- capsule-wardrobe-handgepaeck, faeroeer-inseln-guide
- airbnb-vs-hotel-vergleich, reiseversicherung-was-lohnt-sich
- solo-reisen-frauen-sicher
- apulien-sueditalien-guide, nordlichter-2026-wo-wann-wie
- slow-travel-bedeutet-was
- cyber-sicherheit-reisen, mit-hund-europa-reisen
- beste-travel-apps-2026, stopover-tourismus-guide
- 48-stunden-rom, sabbatical-planen-guide
- route-66-usa-roadtrip, bali-vs-lombok-vergleich, suedostasien-budget-reisen
- safari-ostafrika-guide, digital-nomad-visum-laender-2026
- schoenste-straende-europa-2026, wellness-spa-reisen-destinationen
- segelurlaub-einsteiger-guide, fernwanderwege-welt-top-routen
- food-travel-essen-wie-einheimischer, reisefehler-vermeiden-klassische-fehler
- hotel-kategorien-erklaert, reisen-mit-teenagern-tipps
- trinkgeld-weltweit-guide, wintersonnen-destinationen-januar
- wo-uebernachten-cancun, wo-uebernachten-lissabon
- wo-uebernachten-new-york, wo-uebernachten-buenos-aires
- wo-uebernachten-tokio, wo-uebernachten-barcelona
- wo-uebernachten-paris, wo-uebernachten-rom
- wo-uebernachten-mexico-city, wo-uebernachten-cartagena
- wo-uebernachten-tulum, wo-uebernachten-bali
- wo-uebernachten-bangkok, wo-uebernachten-london
- wo-uebernachten-berlin, wo-uebernachten-amsterdam
- wo-uebernachten-lima, wo-uebernachten-rio-de-janeiro
- wo-uebernachten-miami, wo-uebernachten-marrakesch
- wo-uebernachten-wien, wo-uebernachten-prag
- wo-uebernachten-madrid, wo-uebernachten-athen
- wo-uebernachten-singapur, wo-uebernachten-edinburgh
- wo-uebernachten-sevilla, wo-uebernachten-marseille
- wo-uebernachten-san-francisco, wo-uebernachten-los-angeles
- wo-uebernachten-las-vegas, wo-uebernachten-new-orleans
- wo-uebernachten-hongkong, wo-uebernachten-seoul
- wo-uebernachten-hanoi, wo-uebernachten-cusco
- wo-uebernachten-bogota, wo-uebernachten-mendoza
- wo-uebernachten-medellin, wo-uebernachten-cape-town
- wo-uebernachten-tallinn, wo-uebernachten-riga, wo-uebernachten-nizza, wo-uebernachten-bologna
- wo-uebernachten-salzburg, wo-uebernachten-split, wo-uebernachten-teneriffa, wo-uebernachten-boston
- wo-uebernachten-seattle, wo-uebernachten-nashville, wo-uebernachten-penang, wo-uebernachten-siem-reap
- wo-uebernachten-brisbane, wo-uebernachten-kairo, wo-uebernachten-colombo
- route-66-usa-roadtrip, bali-vs-lombok-vergleich, suedostasien-budget-reisen
- safari-ostafrika-guide, digital-nomad-visum-laender-2026
- schoenste-straende-europa-2026, wellness-spa-reisen-destinationen
- segelurlaub-einsteiger-guide, fernwanderwege-welt-top-routen
- food-travel-essen-wie-einheimischer, reisefehler-vermeiden-klassische-fehler
- hotel-kategorien-erklaert, reisen-mit-teenagern-tipps
- trinkgeld-weltweit-guide, wintersonnen-destinationen-januar
- ki-vergleich-reiseplanung-2026, reisen-mit-baby-erste-fluege
- booking-vs-direkt-buchen, lounge-zugang-ohne-business-ticket
- powerbank-regeln-handgepaeck-2026, plastik-frei-reisen-tipps
- patagonien-3-wochen-route, sansibar-stone-town-guide
- bahn-vs-flieger-europa-2026, slowenien-geheimnis-2026
- wo-uebernachten-bordeaux, wo-uebernachten-palma-de-mallorca, wo-uebernachten-bilbao, wo-uebernachten-granada
- wo-uebernachten-lanzarote, wo-uebernachten-ljubljana, wo-uebernachten-kotor, wo-uebernachten-bukarest
- wo-uebernachten-vilnius, wo-uebernachten-montreal, wo-uebernachten-guadalajara, wo-uebernachten-kathmandu
- wo-uebernachten-hoi-an, wo-uebernachten-queenstown, wo-uebernachten-funchal
- campervan-urlaub-europa, algarve-reisefuehrer-2026, tauchen-schnorcheln-reiseziele
- europaeische-staedte-winter-tipps, schweiz-reise-highlights-guide, city-cards-museumspaesse-lohnen-sich
- flughafentransfer-tipps-2026, yoga-retreat-reiseziele-2026, surfurlaub-anfaenger-destinations
- kreuzfahrt-einsteiger-guide, wohnungstausch-urlaub-guide, visa-on-arrival-laender-2026
- inselhopping-karibik-guide, pauschalreise-vs-individualreise, beste-badeziele-weltweit-2026
- wo-uebernachten-nikosia, wo-uebernachten-alicante, wo-uebernachten-bratislava
- wo-uebernachten-thessaloniki, wo-uebernachten-gent
- glamping-europa-guide, flusskreuzfahrt-europa-guide, all-inclusive-urlaub-lohnt-sich
- workation-portugal-spanien-2026, bergwandern-alpen-anfaenger-guide
- skandinavien-rundreise-route, portugal-rundreise-route, balkan-roadtrip-route
- japan-3-wochen-route, reise-packliste-was-wirklich-rein-kommt, indien-reiseguide-highlights
- tuerkei-roadtrip-highlights, beste-fruehlingsziele-europa, mit-katze-reisen-europa
- australien-rundreise-route
- suedkorea-2-wochen-route, taiwan-reiseguide-highlights, sri-lanka-rundreise-route
- nepal-reiseguide-highlights, philippinen-reiseguide-highlights, jordanien-reiseguide-highlights
- oman-reiseguide-highlights, usbekistan-seidenstrasse-guide, kambodscha-reiseguide-highlights
- laos-reiseguide-highlights
- mexiko-rundreise-route, argentinien-reiseguide-highlights, brasilien-reiseguide-highlights
- chile-reiseguide-highlights, bolivien-salar-de-uyuni-guide, ecuador-galapagos-reiseguide
- guatemala-reiseguide-highlights, panama-reiseguide-highlights, dominikanische-republik-guide
- kap-verde-reiseguide
- irland-rundreise-route, malta-gozo-reiseguide, polen-rundreise-route
- ungarn-reiseguide-highlights, rumaenien-reiseguide-highlights, bulgarien-reiseguide-highlights
- schweden-reiseguide-highlights, finnland-reiseguide-highlights, daenemark-reiseguide-highlights
- niederlande-rundreise-route
- kenia-reiseguide-highlights, tansania-reiseguide-highlights, suedafrika-rundreise-route
- aegypten-reiseguide-highlights, namibia-reiseguide-highlights, ruanda-gorilla-trekking-guide
- mauritius-reiseguide, indonesien-reiseguide-highlights, fiji-pazifik-inselhopping
- marokko-staedte-guide
- us-westkueste-roadtrip, kanada-reiseguide-highlights, azoren-reiseguide
- madeira-reiseguide, kanaren-inseln-vergleich, backpacking-einsteiger-guide
- honeymoon-planung-guide, reiseimpfungen-guide, barrierefreies-reisen-guide
- vegan-reisen-guide

**Bestehende EN-Artikel (Slugs für interne Verlinkung):**
- cheap-flights-tips, when-to-book-flights, ai-changing-travel-planning
- airport-hacks, carry-on-only, costa-rica-surfing, boutique-hotels
- business-class-worth-it, santiago-de-compostela, los-angeles
- rental-car-checklist, train-travel-europe, hidden-gems-europe
- what-is-zercy, zercy-logbook
- lisbon-beyond-the-tourist-trail, porto-lisbons-underrated-sister
- open-jaw-tickets-travel-hack, business-class-without-miles
- ai-trip-planner-vs-travel-agent, night-trains-europe-2026
- rental-consolidators-save-money, rental-car-hidden-costs-avoid
- costa-rica-road-trip-route, modena-ferrari-museum
- iceland-travel-guide, tokyo-foodie-trip
- madrid-24-hours, cruise-extend-port-cities
- hidden-city-ticketing-explained, workation-tax-rules-2026
- morocco-riads-guide, flight-carbon-offsets-truth
- jet-lag-fast-recovery, ai-tools-travel-comparison
- albania-riviera-hidden-coast, road-trip-stages-planning
- capsule-wardrobe-carry-on, faroe-islands-guide
- airbnb-vs-hotel-comparison, travel-insurance-worth-it-2026
- solo-travel-women-safe-countries
- puglia-southern-italy-guide, northern-lights-2026-where-when-how
- slow-travel-what-it-really-means
- cyber-security-travel-2026, traveling-with-dog-europe
- best-travel-apps-2026, stopover-tourism-guide
- 48-hours-rome, sabbatical-planning-guide
- where-to-stay-cancun, where-to-stay-lisbon
- where-to-stay-new-york, where-to-stay-buenos-aires
- where-to-stay-tokyo, where-to-stay-barcelona
- where-to-stay-paris, where-to-stay-rome
- where-to-stay-mexico-city, where-to-stay-cartagena
- where-to-stay-tulum, where-to-stay-bali
- where-to-stay-bangkok, where-to-stay-london
- where-to-stay-berlin, where-to-stay-amsterdam
- where-to-stay-lima, where-to-stay-rio-de-janeiro
- where-to-stay-miami, where-to-stay-marrakech
- where-to-stay-vienna, where-to-stay-prague
- where-to-stay-madrid, where-to-stay-athens
- where-to-stay-singapore, where-to-stay-edinburgh
- where-to-stay-seville, where-to-stay-marseille
- where-to-stay-san-francisco, where-to-stay-los-angeles
- where-to-stay-las-vegas, where-to-stay-new-orleans
- where-to-stay-hong-kong, where-to-stay-seoul
- where-to-stay-hanoi, where-to-stay-cusco
- where-to-stay-bogota, where-to-stay-mendoza
- where-to-stay-medellin, where-to-stay-cape-town
- where-to-stay-tallinn, where-to-stay-riga, where-to-stay-nice, where-to-stay-bologna
- where-to-stay-salzburg, where-to-stay-split, where-to-stay-tenerife, where-to-stay-boston
- where-to-stay-seattle, where-to-stay-nashville, where-to-stay-penang, where-to-stay-siem-reap
- where-to-stay-brisbane, where-to-stay-cairo, where-to-stay-colombo
- route-66-usa-road-trip, bali-vs-lombok-comparison, southeast-asia-budget-travel
- east-africa-safari-guide, digital-nomad-visa-countries-2026
- best-beaches-europe-2026, wellness-spa-travel-destinations
- sailing-holiday-beginners-guide, best-long-distance-hiking-trails-world
- food-travel-eat-like-a-local, travel-mistakes-avoid-common
- hotel-categories-explained, travel-with-teenagers-tips
- tipping-culture-worldwide-guide, winter-sun-destinations-january
- ai-comparison-trip-planning-2026, traveling-with-baby-first-flights
- booking-vs-direct-hotel-booking, lounge-access-without-business-ticket
- powerbank-rules-carry-on-2026, plastic-free-travel-tips
- patagonia-3-week-route, zanzibar-stone-town-guide
- train-vs-plane-europe-2026, slovenia-green-secret-2026
- where-to-stay-bordeaux, where-to-stay-palma-de-mallorca, where-to-stay-bilbao, where-to-stay-granada
- where-to-stay-lanzarote, where-to-stay-ljubljana, where-to-stay-kotor, where-to-stay-bucharest
- where-to-stay-vilnius, where-to-stay-montreal, where-to-stay-guadalajara, where-to-stay-kathmandu
- where-to-stay-hoi-an, where-to-stay-queenstown, where-to-stay-funchal
- campervan-europe-guide, algarve-travel-guide-2026, diving-snorkeling-destinations
- european-cities-winter-guide, switzerland-travel-highlights, city-cards-museum-passes-worth-it
- airport-transfer-guide-2026, yoga-retreat-destinations-2026, surfing-holiday-beginners-guide
- cruise-beginners-guide, house-swap-travel-guide, visa-on-arrival-countries-2026
- caribbean-island-hopping-guide, package-tour-vs-independent-travel, best-beach-destinations-worldwide-2026
- where-to-stay-nicosia, where-to-stay-alicante, where-to-stay-bratislava
- where-to-stay-thessaloniki, where-to-stay-ghent
- glamping-europe-guide, river-cruise-europe-guide, all-inclusive-holiday-worth-it
- workation-portugal-spain-2026, alpine-hiking-beginners-guide
- scandinavia-road-trip-route, portugal-road-trip-route, balkan-road-trip-route
- japan-3-week-route, travel-packing-list-essentials, india-travel-guide-highlights
- turkey-road-trip-highlights, best-spring-destinations-europe, traveling-with-cat-europe
- australia-road-trip-route
- south-korea-2-week-route, taiwan-travel-guide-highlights, sri-lanka-road-trip-route
- nepal-travel-guide-highlights, philippines-travel-guide-highlights, jordan-travel-guide-highlights
- oman-travel-guide-highlights, uzbekistan-silk-road-guide, cambodia-travel-guide-highlights
- laos-travel-guide-highlights
- mexico-road-trip-route, argentina-travel-guide-highlights, brazil-travel-guide-highlights
- chile-travel-guide-highlights, bolivia-salt-flat-uyuni-guide, ecuador-galapagos-travel-guide
- guatemala-travel-guide-highlights, panama-travel-guide-highlights, dominican-republic-travel-guide
- cape-verde-travel-guide
- ireland-road-trip-route, malta-gozo-travel-guide, poland-road-trip-route
- hungary-travel-guide-highlights, romania-travel-guide-highlights, bulgaria-travel-guide-highlights
- sweden-travel-guide-highlights, finland-travel-guide-highlights, denmark-travel-guide-highlights
- netherlands-road-trip-route
- kenya-travel-guide-highlights, tanzania-travel-guide-highlights, south-africa-road-trip-route
- egypt-travel-guide-highlights, namibia-travel-guide-highlights, rwanda-gorilla-trekking-guide
- mauritius-travel-guide, indonesia-travel-guide-highlights, fiji-pacific-island-hopping
- morocco-cities-guide
- us-west-coast-road-trip, canada-travel-guide-highlights, azores-travel-guide
- madeira-travel-guide, canary-islands-comparison, backpacking-beginners-guide
- honeymoon-planning-guide, travel-vaccinations-guide, accessible-travel-guide
- vegan-travel-guide

### Schema — automatisch via Template (KEIN manueller Eingriff nötig!)
Alle 3 Templates (`src/pages/blog/[slug].astro`, `src/pages/en/blog/[slug].astro`, `src/pages/es/blog/[slug].astro`) generieren automatisch **3 JSON-LD Schemas** im `<head>` — für jeden Artikel, ohne dass die Markdown-Datei angefasst werden muss:

| Schema | Quelle | Zweck |
|---|---|---|
| **BlogPosting** | Frontmatter (title, description, pubDate, heroImage) | Standard-Artikel-Schema |
| **FAQPage** | Parst H3-Fragen aus `## Häufige Fragen` / `## Frequently Asked Questions` / `## Preguntas frecuentes` Sektion automatisch | Google AI Overviews, Perplexity, ChatGPT-Suche |
| **BreadcrumbList** | Aus URL-Struktur (Zercy → Blog → Artikel-Titel) | Breadcrumb-Darstellung in SERPs |

**FAQPage-Parsing-Logik (Build-Zeit, kein Runtime-JS):**
- Sucht nach FAQ-Heading in der Sprache des Templates
- Extrahiert H3-Fragen + die folgenden Absätze als Antworten (max. 400 Zeichen)
- Rendert max. 4 Question+Answer-Paare
- Markdown-Links und **Bold** werden automatisch entfernt
- Wenn keine FAQ-Sektion vorhanden: FAQPage wird nicht gerendert (kein leeres Schema)

**Konsequenz:** Jeder Artikel, der eine korrekte `## Häufige Fragen`-Sektion mit H3-Fragen hat, bekommt automatisch FAQPage-Schema. Neue Artikel brauchen keine extra Konfiguration.

### FAQ-Sektion — AEO/GEO (PFLICHT)
Jeder Artikel endet mit einer `## Frequently Asked Questions` (EN) / `## Häufige Fragen` (DE) Sektion.

**Regeln:**
- **4 Fragen als H3**
- **ALLE Fragen beginnen mit einem W-Wort:** What / When / Where / Why / How / Who / Which (EN) bzw. Was / Wann / Wo / Warum / Wie / Wer / Welche (DE)
- Antworten: 2–4 Sätze, direkt und konkret — für Google AI Overviews, ChatGPT, Perplexity optimiert
- Fragen decken echte Nutzerfragen ab: Kosten, Timing, Sicherheit, Eignung, Alternativen

**Verboten in FAQ-Fragen:**
- Beginnen mit: Is / Are / Do / Does / Did / Can / Could / Should / Have / Has / Will / Would

### Zercy-CTA am Artikelende
Vor dem FAQ, nach dem `---` Trennstrich: 1–2 Sätze die Zercy erwähnen, natürlich eingebaut, nicht werblich aufdringlich. **IMMER mit Zercy-Logbook-Link ergänzen:** "Speichere die Auswahl im [Zercy Logbook](https://www.zercy.app/logbook), damit du beim Buchen alle Optionen zur Hand hast." (DE) bzw. "Save the shortlist in your [Zercy Logbook](https://www.zercy.app/logbook) so you have all options handy when booking." (EN)

### ✅ Bereits vorhandene Themenartikel — IMMER HIER PRÜFEN vor neuen Vorschlägen!

**Stand: 2026-05-14 | 198 Themenartikel**

48h Rom, 48h Barcelona, 48h Istanbul, Ägypten Reiseguide, Airbnb Experiences, Airbnb vs. Hotel, Airport Hacks, Albanien Riviera, Algarve Guide 2026, All-Inclusive Urlaub, Apulien/Süditalien, Argentinien Reiseguide, Auslands-SIM Guide, Australien Rundreise, Azoren Reiseguide, Backpacking Einsteiger, Bahn vs. Flieger Europa, Bali vs. Lombok, Bangkok 3 Tage, Balkan Road Trip, Barrierefreies Reisen, Bergwandern Alpen Anfänger, Beste Badeziele weltweit 2026, Beste Frühlingsziele Europa, Beste Herbstziele, Beste Offline Apps, Beste Reise-Kreditkarten 2026, Beste Travel Apps 2026, Bolivien & Salar de Uyuni, Booking Apartments vs. Airbnb, Booking Genius, Booking vs. Direkt, Boutique Hotels, Brasilien Reiseguide, Bulgarien Reiseguide, Business Class, Business Class ohne Meilen, Campervan Europa, Capsule Wardrobe Handgepäck, Chile Reiseguide, City Cards & Museumspässe, CO2 Kompensation, Costa Rica Rundreise, Costa Rica Surfen, Cyber-Sicherheit, Dänemark Reiseguide, Digital Nomad Visa, Dominikanische Republik Guide, Ecuador & Galápagos, Europäische Städte im Winter, Färöer Inseln, Familienurlaub Europa Ziele, Familienurlaub mit Kindern Tipps, Fernwanderwege Welt, Fiji & Pazifik Inselhopping, Finnland Reiseguide, Flughafentransfer Tipps 2026, Flugverspätung Rechte, Flusskreuzfahrten Europa, Food Travel, Frühbucher vs. Last Minute, Geheimtipps Europa, Geld im Ausland, Glamping Europa, Griechenland Inseln Vergleich, Guatemala Reiseguide, Günstig Fliegen, Handgepäck Flüssigkeiten, Handgepäck vs. Aufgegeben, Hidden City Ticketing, Honeymoon Planung, Hostel Guide (Buchen), Hostel oder Hotel 2026, Hotel-Kategorien erklärt, Hotel Upgrade Tipps, Indien Reiseguide, Indonesien Reiseguide, Inselhopping Karibik, Interrail Guide 2026, Irland Rundreise, Island Reiseguide, Japan 3-Wochen-Route, Japan beyond Tokyo, Jetlag, Jordanien Reiseguide, Kambodscha Reiseguide, Kanada Reiseguide, Kanaren-Vergleich, Kap Verde Reiseguide, Kenia Reiseguide, KI & Reiseplanung (4 Artikel), Kolumbien Reiseguide, Kreuzfahrt Einsteiger, Kreuzfahrt Städte, Kroatien Island Hopping, Langstreckenflug mit Kindern, Laos Reiseguide, Lissabon Off the Beaten, Lounge Zugang, Los Angeles, Luxusreisen günstig, Madeira Reiseguide, Madrid 24h, Malediven Guide, Malta & Gozo Guide, Marokko Roadtrip, Marokko Städteguide, Mauritius Reiseguide, Meilen & Punkte Anfänger, Mexiko Rundreise, Mietwagen (3 Artikel), Mit Hund Europa, Mit Katze reisen Europa, Modena Ferrari, Nachtzüge Europa, Namibia Reiseguide, Nepal Reiseguide & Trekking, Neuseeland Guide, Niederlande Rundreise, Nordlichter 2026, Nur Handgepäck, Oman Reiseguide, Open Jaw Tickets, Osaka vs. Kyoto, Panama Reiseguide, Patagonien 3 Wochen, Pauschalreise vs. Individualreise, Peru Guide, Philippinen Reiseguide, Plastik-frei Reisen, Polen Rundreise, Porto Guide, Portugal Rundreise, Powerbank Regeln, Reise-Packliste, Reisefehler vermeiden, Reisefotografie, Reiseimpfungen Guide, Reisekreditkarte 2026, Reisen kleines Budget, Reisen mit Baby, Reisen mit Teenagern, Reisen nach 60, Reiseversicherung, Riads Marokko, Roadtrip Etappen, Route 66 USA, Ruanda & Gorilla Trekking, Rumänien Reiseguide, Sabbatical planen, Safari Ostafrika, Sansibar Stone Town, Santiago de Compostela, Schönste Strände Europa, Schottland Highlands Roadtrip, Schweden Reiseguide, Schweiz Reise-Highlights, Segelurlaub Einsteiger, Skiurlaub Europa, Skandinavien Rundreise, Slow Travel, Slowenien Guide, Solo Reisen Frauen, Sri Lanka Rundreise, Stopover Tourismus, Südafrika Rundreise, Südkorea 2-Wochen-Route, Südostasien Budget, Surfurlaub Anfänger, Taiwan Reiseguide, Tansania Reiseguide, Tauchen & Schnorcheln, Thailand 2-Wochen-Route, Tokio Foodie, Trinkgeld weltweit, Türkei Road Trip, Ungarn Reiseguide, US Westküste Roadtrip, Usbekistan Seidenstraße, Vegan Reisen, Vietnam 2-Wochen-Route, Visa-on-Arrival Länder, Wann Flüge buchen, Was ist Zercy, Wellness & Spa Reisen, Wien am Wochenende, Wintersonnen Januar, Wohnungstausch, Workation Portugal & Spanien, Workation Steuern, Yoga-Retreats 2026, Zercy Logbook, Zugreisen Europa

**Regel:** Vor JEDEM neuen Themenartikel-Vorschlag diese Liste lesen. Nach jeder neuen Batch: Liste aktualisieren.

---

### ✅ Bereits vorhandene City-Guides — IMMER HIER PRÜFEN vor neuen Vorschlägen!

**Stand: 2026-05-15 | 174 Städte**

**Agadir**, **Alicante**, Amsterdam, Antalya, **Antigua (Guatemala)**, Athen, Auckland, **Austin**, Bali, Bangkok, Barcelona, Berlin, Bilbao, **Bled**, Bogotá, Bologna, Bordeaux, Boston, **Bratislava**, Brisbane, Brüssel, **Brügge**, Budapest, Bukarest, Buenos Aires, **Bergen**, **Busan**, **Cairns**, Cancún, Cape Town, Cartagena, Chiang Mai, Chicago, **Christchurch**, Colombo, **Córdoba (Arg)**, Cusco, **Da Nang**, **Dar es Salaam**, Delhi, **Dresden**, Dublin, Dubrovnik, Edinburgh, Florenz, Funchal, Fukuoka, **Gent**, Goa, **Gold Coast**, Granada, **Gran Canaria**, **Graz**, Guadalajara, **Göteborg**, Hamburg, Hanoi, **Hiroshima**, Ho Chi Minh Stadt, Hoi An, Hongkong, **Ibiza**, Innsbruck, **Interlaken**, Istanbul, Jaipur, Johannesburg, Kairo, Kathmandu, **Koh Samui**, Kopenhagen, Kotor, **Köln**, Krakau, **Krabi**, **Kreta**, Kuala Lumpur, Kyoto, **Langkawi**, Lanzarote, Las Vegas, Lima, Lissabon, Ljubljana, London, Los Angeles, **Luang Prabang**, **Luzern**, **Luxor**, **Lyon**, Madrid, Mailand, Málaga, Marrakesch, Marseille, Melbourne, Medellín, Mendoza, Mexico City, Miami, **Mombasa**, **Montevideo**, Montreal, **Mostar**, München, Mumbai, Mykonos, Nashville, Nairobi, Neapel, **Nha Trang**, **Nikosia**, Nizza, New Orleans, New York, Oaxaca, Osaka, Oslo, Palma de Mallorca, Paris, Penang, **Perth**, Philadelphia, Phuket, Playa del Carmen, **Plovdiv**, **Pokhara**, Porto, Prag, Puerto Vallarta, Québec City, Queenstown, Reykjavik, **Rhodos**, Riga, Rio de Janeiro, Rom, **Salvador (Bahia)**, Salzburg, **San Diego**, San Francisco, **San Sebastián**, Santiago, Santorini, São Paulo, Seattle, Seoul, Sevilla, Siem Reap, Singapur, Split, Stockholm, **Straßburg**, Sydney, Taipei, Tallinn, Teneriffa, **Thessaloniki**, Tokio, Toronto, Tulum, Valencia, Valletta, **Valparaíso**, Vancouver, Venedig, Vilnius, Washington D.C., **Wellington**, Warschau, Wien, Zürich

**Regel:** Vor JEDEM neuen City-Guide-Vorschlag diese Liste lesen. Nach jeder neuen Batch: Liste aktualisieren.

---

### EXTRA für "Wo übernachten / Where to Stay"-Artikel (City-Guides)

City-Guides folgen einer eigenen Struktur, weil sie die Booking.com-Affiliate-Strategie tragen. Diese Regeln sind ZUSÄTZLICH zur Standard-Checkliste:

#### ⚠️ Stadtführer-Dropdown — Slug-Prefix-Regel (KRITISCH!)

Der "Stadtführer / City Guide Finder / Guía de ciudades"-Dropdown auf allen 3 Blog-Listing-Seiten filtert **ausschließlich nach Slug-Prefix**, NICHT nach Kategorie:

| Sprache | Listing-Seite | Slug-Prefix |
|---------|--------------|-------------|
| DE | `src/pages/blog/index.astro` | `wo-uebernachten-` |
| EN | `src/pages/en/blog/index.astro` | `where-to-stay-` |
| ES | `src/pages/es/blog/index.astro` | `donde-alojarse-` |

**Was das bedeutet:**
- Nur Artikel mit exakt diesen Slug-Prefixen erscheinen im Dropdown.
- Kategorie allein ("Wo übernachten") reicht NICHT — andere Artikel in derselben Kategorie (Boutique-Hotel-Guides, Airbnb-Vergleiche etc.) dürfen diese Prefixes NICHT bekommen, sonst erscheinen sie als leere Einträge im Dropdown.
- Der Stadtname wird per Regex aus dem Titel extrahiert. Passt das Format nicht, erscheint ein leerer Eintrag (sichtbarer Punkt ohne Text = Bug).

**Korrekte Titel-Formate (Pflicht für City-Guides):**
- DE: `Beste Hotels in/auf/im/an/am [Stadt]:` (Regex: `/Beste Hotels (?:in|auf|im|an|am) (.+?):/`)
- EN: `Best Hotels in/on/at [City]:` (Regex: `/Best Hotels (?:in|on|at) (.+?):/`)
- ES: `Los mejores hoteles en/de [Ciudad]:` (Regex: `/mejores hoteles (?:en|de) (.+?):/i`)

**Nicht-City-Guide-Artikel in der Kategorie "Wo übernachten"** (z.B. `boutique-hotels`, `airbnb-vs-hotel-vergleich`, `riads-marokko-guide`) müssen einen anderen Slug verwenden — niemals `wo-uebernachten-*` / `where-to-stay-*` / `donde-alojarse-*`.

**Title-Format (zwei Money-Keywords):**
- DE: "Beste Hotels in [Stadt]: Wo übernachten in welchem Stadtteil 2026"
- EN: "Best Hotels in [City]: Where to Stay in Each Neighborhood 2026"
- Slug DE: `wo-uebernachten-[stadt]`, EN: `where-to-stay-[city]`

**Struktur (immer in dieser Reihenfolge):**
1. Intro (2 Absätze: Hook + Promise)
2. H2: "Welcher Stadtteil passt zu welcher Reise?" (Übersicht, 4-5 Bullets)
3. H2: Stadtteil 1 (touristisch/iconic) — mit "Wer hier richtig liegt", Preis-Spanne, 3 Top-Hotel-Picks. **HIER nach den Top-Picks: erste Booking.com-Erwähnung mit Hotel-Anzahl**, z.B. "Diese und 600+ weitere Manhattan-Hotels findest du auf [Booking.com](https://www.booking.com) mit Stadtteil-Filter."
4. H2: Stadtteile 2-5 (jeweils gleiches Schema)
5. H2: "Wo solltest du am Ende buchen?" — explizit Booking.com pushen mit konkreten Vorteilen
6. Zercy-CTA + Zercy-Logbook (siehe oben)
7. FAQ (4 W-Wort-Fragen)
8. Mehr-lesen-Block

**Linking-Pflichten City-Guides (Cluster-Authority):**
- **Booking.com-Mention im ERSTEN H2-Stadtteil-Block** (nicht nur am Ende)
- **MIN. 1 Authority-Link** zur offiziellen Tourismus-Site der Stadt (z.B. visitportugal.com für Lissabon, gotokyo.org für Tokio, nyctourism.com für NYC, parisjetaime.com für Paris). Booking.com zählt NICHT als Authority. Standard-Format: "Die [offizielle Tourismusbehörde X](url) hat eine kuratierte Hotel-Übersicht pro Stadtteil."
- **2 Cross-Links zu anderen City-Guides im "Mehr lesen"** (LATAM-Cities verlinken untereinander, Europa untereinander, etc.)
- **1 Backlink von einem thematisch passenden Top-Artikel** in jeden neuen City-Guide setzen (z.B. business-class-ohne-meilen → wo-uebernachten-new-york; costa-rica-rundreise-route → wo-uebernachten-cancun; 48-stunden-rom → wo-uebernachten-rom)

**AEO/Q-H2-Pattern bei City-Guides:**
- Stadtteil-H2s sind Statements (legitim per Listen-Exception). Aber MINDESTENS 3 Q-H2s in jeden City-Guide einbauen:
  - 1. Q-H2: "Welcher Stadtteil passt zu welcher Reise?" (Übersicht)
  - 2. Q-H2: "Wo solltest du am Ende buchen?" (Booking-Push)
  - **3. Q-H2 (NEU PFLICHT):** zwischen Stadtteilen einbauen, z.B. "Wann ist die beste Reisezeit für [Stadt]?" oder "Welcher Stadtteil ist am besten für Familien?" — natürliche Brücke zwischen Stadtteilen
- FAQ mit 4 W-Wort-Fragen bleibt Standard.

**Hotel-Empfehlungen pro Stadtteil:**
- 3 Top-Picks (mittelklasse + boutique + premium) mit echten Hotel-Namen und kurzem Charakter
- Diese Hotels werden später Booking-Affiliate-Anker

### Checkliste auf einen Blick (vor dem Abschicken prüfen)
- [ ] Frontmatter komplett + metaTitle 45–60 Zeichen + description 160–200 Zeichen
- [ ] Kategorie aus der gültigen Liste (verifiziert gegen `index.astro`)
- [ ] 700+ Wörter, Ziel 800–1000
- [ ] Keine Em-Dashes (— oder –) im ganzen Artikel
- [ ] **3–4 H2s als Fragen formuliert** (AEO)
- [ ] **1–2 externe Autoritäts-Links** im Fließtext
- [ ] **3–4 interne Links** im Fließtext (nicht nur "Mehr lesen" Block)
- [ ] "Mehr lesen" / "Read more" Block mit 3 internen Links
- [ ] Zercy-CTA vor FAQ (1–2 Sätze)
- [ ] FAQ: 4 Fragen als H3, **alle** mit W-Wort beginnend (Was/Wann/Wo/Warum/Wie/Wer/Welche) → **erzeugt automatisch FAQPage-Schema**
- [ ] Beide Sprachen geschrieben (DE + EN + ES bei City-Guides)
- [ ] **`heroImage` im Frontmatter UND Datei in `public/img/blog/` existiert** (siehe Foto-Workflow oben)
- [ ] **`bookingDest` im Frontmatter** (wenn Artikel Reise-/Hotel-Bezug hat — sonst weglassen)
- [ ] Topic-Mapping in `scripts/photo-mapping.mjs` ergänzt (slugToTopic + topicToQuery)
- [ ] **Topic-Key ist EINDEUTIG** in `photo-mapping.mjs` — kein anderer Artikel teilt diesen Key
- [ ] `node scripts/generate-hreflang-map.mjs` lief erfolgreich (`(0 without cross-language match)` ideal, max 10 wegen identisch-Slug-Duplikate)
- [ ] `node scripts/download-photos.mjs --frontmatter-only` lief erfolgreich nach Foto-Download
- [ ] `npx astro build` erfolgreich + `npx vercel --prod --force` deployed
- [ ] **Neuen Slug oben in die Artikel-Liste eingetragen** (DE + EN)
- [ ] Google Indexierung ist automatisch (Sitemap mit `lastmod` wird bei jedem Build aktualisiert)

### Nach dem Schreiben — Deploy + Google Indexierung
1. `npx astro build` — baut alle Seiten + **generiert automatisch die Sitemap** (`sitemap-index.xml` + `sitemap-0.xml`) mit ALLEN Seiten. Neue Artikel sind automatisch drin.
2. `npx vercel --prod --force` — deployed alles inkl. neue Sitemap.
3. **Google findet neue Seiten automatisch**: Die Sitemap enthält `lastmod` mit dem Build-Datum bei jedem Deploy. Google crawlt die Sitemap regelmäßig (typisch 1–3 Tage) und sieht sofort, dass neue URLs drin sind. **Kein manueller Ping nötig** (Google hat den Sitemap-Ping 2023 abgeschaltet).
4. **Neuen Slug in diese Liste oben eintragen** — damit die nächste Session weiß, dass der Artikel existiert und für interne Verlinkung verfügbar ist.
5. Bestätigung an Christine: Artikel live auf zercy.app/blog/[slug] und zercy.app/en/blog/[slug]

### Sitemap & Google Search Console — AUTOMATISCH (nicht manuell pflegen!)
- **@astrojs/sitemap** ist im `astro.config.mjs` eingebaut (seit 2026-04-17).
- Bei jedem `npx astro build` wird `sitemap-index.xml` + `sitemap-0.xml` automatisch neu generiert mit ALLEN Seiten.
- `robots.txt` verweist auf `https://zercy.app/sitemap-index.xml`.
- **Nie wieder eine manuelle `public/sitemap.xml` anlegen** — die alte wurde am 2026-04-17 gelöscht, weil sie nur 11 von 75 Seiten enthielt.
- Google Search Console ist eingerichtet (Property: zercy.app). Die Sitemap dort ist submitted.
- Google findet neue Seiten automatisch via `lastmod` in der Sitemap (typisch 1–3 Tage nach Deploy). Kein manueller Ping nötig (deprecated seit 2023).
