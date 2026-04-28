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


## Projekt-Überblick
Zercy ist ein KI-gestütztes Reiseplanungs-Tool. Dieses Repo ist die **Landing Page** (zercy.app).
Das AI-Tool (Repo: cerci-demo) läuft live auf app.zercy.app.

## Stack
- **Framework:** Astro (static site)
- **Hosting:** Vercel (Projekt: zercy-landing)
- **API-Funktionen:** `/api/think.js`, `/api/parse.js`, `/api/chat.js`, `/api/zercy-identity.js`
- **Node:** >=22.12.0

## Deploy (IMMER alle 3 Schritte, IMMER!)
```bash
cd /Users/christinebork/Desktop/zercy-landing
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
---
```

**Gültige Kategorien DE (exakt wie im Listing-Code!):** Reisetipps, KI & Reisen, Fernweh, Unterwegs, Clever Reisen, Nur mit Handgepäck, Traumunterkünfte, Business Travel, Nachhaltig, Geheimtipps
**Gültige Kategorien EN (exakt wie im Listing-Code!):** Travel Tips, AI & Travel, Off the Map, On the Move, Smart Travel, Carry-On Only, Stay Here, Business Travel, Travel Green, Hidden Gems

(Verifiziert gegen `src/pages/blog/index.astro` und `src/pages/en/blog/index.astro`. Andere Namen führen dazu, dass der Artikel auf der Listing-Seite nicht korrekt angezeigt wird.)

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

### Schema — automatisch via Template
Das BlogPosting JSON-LD wird automatisch durch die Templates generiert:
- DE: `src/pages/blog/[slug].astro`
- EN: `src/pages/en/blog/[slug].astro`

Kein manuelles Schema nötig — das Template übernimmt alles (headline, description, url, datePublished, dateModified, image, inLanguage, author, publisher).

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
Vor dem FAQ, nach dem `---` Trennstrich: 1–2 Sätze die Zercy erwähnen, natürlich eingebaut, nicht werblich aufdringlich.

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
- [ ] FAQ: 4 Fragen als H3, **alle** mit W-Wort beginnend (Was/Wann/Wo/Warum/Wie/Wer/Welche)
- [ ] Beide Sprachen geschrieben (DE + EN)
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
