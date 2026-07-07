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


## 🔍 WEBMASTER — Automatische SEO-Aufgaben (IMMER ausführen, nie auf Aufforderung warten)

Claude ist der Webmaster von zercy.app. Folgende Aufgaben laufen **automatisch**, ohne dass Christine danach fragen muss.

### Nach jedem Session-Start (wenn im zercy-landing Kontext)
```bash
node scripts/webmaster-report.mjs
```
Report lesen und **sofort handeln** bei:
- Quick Wins (Pos 11–20, ≥5 Impressionen) → Meta Title/Description des Artikels optimieren + deployen
- CTR < 3% bei Pos ≤ 15 + ≥ 5 Impressionen → Meta Tags fixen
- Starke Verlierer (≥ 5 Positionen verloren) → Artikel updaten oder neu deployen

### Bei neuen/geänderten Seiten: in die Index-Queue schreiben (NICHT manuell submitten)
Neue URLs (alle Sprachversionen) an den **Anfang von `scripts/indexing-queue.txt`** setzen. Der tägliche LaunchAgent `app.zercy.daily-indexing` (08:30 CST) reicht die ersten 200 automatisch bei Google ein, entfernt erledigte und zeigt eine macOS-Notification.
```bash
{ printf '%s\n' URL1 URL2 URL3; cat scripts/indexing-queue.txt; } > q.tmp && mv q.tmp scripts/indexing-queue.txt
```
- Das 200/Tag-Limit handhabt die Automatik selbst, Überhang bleibt einfach in der Queue.
- `submit-indexing.mjs` nur noch für manuelle Sofort-Einreichung einzelner URLs.

### Wöchentlich (montags, beim ersten Session-Start der Woche)
1. `node scripts/webmaster-report.mjs` ausführen
2. Top-3-Quick-Wins sofort fixen (Meta Tags)
3. Neue Queries analysieren → fehlt ein Artikel dazu? → vorschlagen
4. Report-Zusammenfassung an Christine ausgeben

### CTR-Optimierungs-Regeln (beim Fixen von Meta Tags)
- Meta Title 45–60 Zeichen, exaktes Keyword möglichst am Anfang
- Für VS-Artikel: Wort "Comparison/Vergleich/comparación" direkt nach dem Slash
- Für Positions-Artikel: Zahl/Ergebnis im Titel ("4 Scenarios", "ab 700€")
- Description 160–200 Zeichen, erste 10 Wörter = Hook (Überraschung oder konkrete Zahl)
- Kein Em-Dash, kein generisches "Alles was du wissen musst"

### Tools
| Script | Zweck |
|---|---|
| `scripts/webmaster-report.mjs` | Wöchentlicher GSC-Report (Quick Wins, CTR, Gewinner/Verlierer) |
| `scripts/submit-indexing.mjs url1 url2...` | URLs bei Google Indexing API einreichen (200/Tag) |
| `scripts/reauth-indexing.mjs` | Einmalig: OAuth-Token mit Indexing-Scope erneuern |

### Credentials
- OAuth Token: `~/.zercy-analytics/tokens.json` (enthält `indexing` + `webmasters.readonly` + `analytics.readonly`)
- GSC Property: `sc-domain:zercy.app`
- GA4 Property: `properties/530287390`
- Google Cloud: `claude-code-mcp-487718`

---

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

## Deploy (IMMER alle Schritte, IMMER!)
```bash
cd "$HOME/Claude Code Projects/zercy-landing"
node scripts/validate-articles.mjs        # PFLICHT-GATE: bei Exit 1 STOPPEN + fixen, NICHT deployen
node scripts/generate-hreflang-map.mjs
npx astro build
npx vercel --prod --force --archive=tgz
git add -A && git commit -m "Beschreibung der Änderung" && git push
```

### 🚦 Qualitäts-Gate vor JEDEM Deploy (PFLICHT, nicht aus dem Gedächtnis prüfen)
`node scripts/validate-articles.mjs` prüft die heutigen (oder als Argument übergebenen) Artikel deterministisch gegen alle SEO/AEO/Stil-Regeln und gibt **Exit 1** bei jedem Verstoß: metaTitle 45-60, description 160-200, gültige Kategorie, heroImage-Datei existiert, 0 Em-Dashes, keine ASCII-gefoldeten Umlaute (DE), TL;DR-Box als 1. Zeile, ≥3 Frage-H2 (AEO), exakter FAQ-Heading + 4 W-Fragen (FAQPage-Schema!), interne Links mit trailing slash + ≥3, ≥1 externer Autoritäts-Link. **Bei Exit 1: erst fixen, dann erneut laufen lassen, NICHT deployen.** (Hätte den 2-ES-metaTitle-Fehler vom 2026-06-23 geblockt.) Neue Pflicht-Regel? → als Check ins Script aufnehmen, nicht ins Gedächtnis.
**NIEMALS** nur Vercel deployen ohne Git-Push. GitHub MUSS immer synchron sein mit dem was live ist. Nicht fragen ob gepusht werden soll — einfach machen. Das ist Teil des Deployments.

## 🔗 Canonical-URL-Konvention (KRITISCH für SEO — nie brechen!)

**Die einzige gültige URL-Form für Blog-Seiten: `https://www.zercy.app/<lang>/blog/<slug>/`** — also **www + trailing slash**. Canonical-Tag, Sitemap, hreflang und interne Links nutzen ALLE diese Form.

**Regeln (sonst entsteht GSC-Müll wie „Alternate page with proper canonical"):**
- **Interne Blog-Links IMMER mit trailing slash:** `](/en/blog/slug/)`, nie ohne. (Fix-Historie 2026-05-30: ~8400 Alt-Links nachträglich umgestellt.)
- **Index-Queue-URLs IMMER www + slash.** `new-article.mjs` macht das automatisch; manuelle Einträge auch.
- **Canonical in den 3 `[slug].astro`-Templates:** `https://www.zercy.app/<lang>/blog/${post.id}/` (mit Slash). Nicht ändern.

**Enforcement in `vercel.json` (NICHT entfernen):** Weiterleitungen sorgen dafür, dass falsche Formen auto-korrigiert werden:
- non-www → www (generische `/:path*`-Regel)
- www no-slash Blog → www +slash (`/blog/:slug`, `/en/blog/:slug`, `/es/blog/:slug`)
- Ergebnis: jede falsche Blog-URL landet per 308 auf der Canonical (non-www+no-slash = 2 Hops, das ist ok). `/api` + Datei-Assets (.jpg/.mp4/.xml) sind bewusst ausgenommen.
- ⚠️ JSON erlaubt keine Kommentare — diese Doku IST die Erklärung des Redirect-Blocks. Beim Bearbeiten von `vercel.json` die Blog-Redirects + den `/api`-Schutz erhalten.

## 📲 Social Media Auto-Posting (Instagram + Facebook) — KOMPLETT AUTOMATISCH

Aus einem Blog-Artikel wird automatisch ein IG-Carousel + FB-Reel und live gepostet. Kostenlos via Meta Graph API, kein Drittanbieter, kein App Review (eigenes Konto = Standard Access).

### Der EINE Befehl (für jede Stadt)
```bash
cd "$HOME/Claude Code Projects/zercy-landing"
node scripts/social-pipeline.mjs <city-slug>     # z.B. tokyo, barcelona
```
Macht alles: Carousel+Captions erzeugen (falls noch nicht da) → FB-Slideshow-Video → Medien aufbereiten (PNG→JPEG) → git push → Vercel-Deploy → warten bis Medien öffentlich → IG-Carousel + FB-Reel posten.
Flags: `--skip-deploy` (Medien schon live), `--ig-only`, `--fb-only`, `--no-post` (bauen+deployen ohne posten).

### Pipeline-Bausteine (scripts/)
| Script | Zweck |
|---|---|
| `generate-carousel.mjs <slug>` | Claude → Beat-Sheet (EN) → 6–8 Slides (1080×1350) + `caption.txt` (IG) + `caption-facebook.txt` (FB, echter Link) in `social-output/<slug>/` |
| `make-fb-slideshow.mjs <slug>` | ffmpeg → `slideshow-facebook.mp4` (4:5, ~18s, Crossfades) aus den Slides |
| `prep-social-media.mjs <slug>` | PNG→JPEG (`sips`) + MP4 → `public/social/<slug>/` (wird via zercy.app öffentlich) |
| `post-social.mjs <slug>` | postet via Meta API. IG: item-Container je Slide → CAROUSEL-Container → media_publish. FB: `POST /{page-id}/videos` mit `file_url` (wird als Reel veröffentlicht). |
| `social-pipeline.mjs <slug>` | Orchestrator = der EINE Befehl oben |
| `remotion/src/CarouselSlide.tsx` | Slide-Design (cover/content/cta), Composition `Carousel` |

### Meta-Zugang (KRITISCH)
- Alle Credentials lokal in **`~/.zercy-analytics/meta-api.json`** (NICHT in GitHub): app_id, app_secret, **system_user_token (läuft NIE ab)**, ig_user_id `17841426150732053`, fb_page_id `1152952871226938`.
- Meta-App „Zercy Poster" (Dev-Mode, NICHT publishen/Tech-Provider), System-User „Zercy Poster Bot" im Business „Zercy Travel". Graph API v21.0.
- **⚠️ Es gibt 2 FB-Seiten:** **„Zercy Travel"** (Page 1152952871226938, IG @zercytravel verknüpft, hier wird gepostet = die RICHTIGE) und **„Zercy App"** (61590442321489, leere Karteileiche, ignorieren). Cover/Bio/alles auf „Zercy Travel".

### Wichtige Regeln / Gotchas
- **MAX 5 Hashtags** in Reel-Captions (TikTok löscht Posts/Tags bei mehr). Hart begrenzt in `carousel-beatsheet.mjs` (`.slice(0,5)` + Prompt „EXACTLY 5 entries"). Gilt für alle Reel-Captions.
- **Reel-Musik:** IG/FB nutzen `slideshow-music.mp4` (lizenzfreier Track „Carefree", Kevin MacLeod, CC BY 4.0 → Credit-Zeile hängt `post-social.mjs` automatisch an). TikTok nutzt die stumme `slideshow-facebook.mp4` (Trending-Sound kommt manuell drauf, kein Doppel-Ton). Track: `assets/music/zercy-reel-music.mp3`. Cover-Slide hat KEIN „SWIPE" mehr (Video, kein Carousel).
- **IG-API akzeptiert nur JPEG** (kein PNG) → `prep-social-media.mjs` konvertiert. Pflicht.
- Medien müssen **öffentliche HTTPS-URLs** sein → liegen in `public/social/<slug>/`, deployt nach `zercy.app/social/<slug>/`. Werden committet (wie Blog-Bilder), damit Vercel sie sicher ausliefert.
- IG-Caption = `caption.txt` (Hashtags + „link in bio"). FB-Caption = `caption-facebook.txt` (echter Link im Text). CTA-Slide sagt plattform-neutral „Full guide on zercy.app".
- Identischer Text auf IG+FB ist KEIN SEO-/Reichweiten-Problem (geprüft).
- FB-Cover-Foto + IG-Bio-Link gehen NICHT per API → manuell (IG-Bio-Link nur in der Handy-App änderbar).
- Rate-Limit IG: ~50–100 Posts/24h (für Blog irrelevant). Carousel max 10 Slides = 1 Post.

### Status (2026-05-29)
- System gebaut + live getestet. Gepostet: Tokyo (IG+FB), Paris (IG manuell + FB auto). 8 Städte vorbereitet (rome, lisbon, amsterdam, prague, edinburgh, new-york, london; barcelona im Lauf).
- Posten am besten zeitlich verteilt (nicht alle auf einmal). Optional künftig: LaunchAgent/Queue für ~2×/Tag.

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

## 🦶 Footer-Lokalisierung (PFLICHT — Links IMMER in der Sprache der Seite)
Footer-Links (`<a href="/about">…</a> · Blog · Privacy · Impressum · Terms`) sind in JEDEM Template **hartkodiert** und stehen mehrfach (6 Blog-Templates `blog`/`en/blog`/`es/blog` × `[slug]`+`index`, App-Footer in `ZercyLayout.astro`, Standalone-Seiten `about/privacy/terms/impressum`). Blogs haben EIGENE Footer (wie bei Social-Links).
- **Label IMMER in Seitensprache:** DE = Über uns / Datenschutz / Impressum / AGB · EN = About / Privacy Policy / Legal Notice / Terms · ES = Sobre nosotros / Privacidad / Aviso legal / Términos. (App-Footer in `ZercyLayout` nutzt `FOOTER_LABELS[lang]` für alle 7 Sprachen, inkl. FR/NL/IT/PT.)
- **⚖️ Geo/legal: „Impressum" ist ein deutscher Rechtsbegriff** → NUR auf deutschen Seiten. EN = „Legal Notice", ES = „Aviso legal", FR = „Mentions légales" usw. (URL bleibt `/impressum`, nur das Label übersetzen.)
- **Tagline + Copy auch lokalisieren** (Copy „Mit Liebe und viel KI gemacht." / „Made with love…" / „Hecho con amor…"), KEINE Em-Dashes in der Tagline.
- **Tool:** `node scripts/fix-footers.mjs` (idempotent, token-basiert). Bei neuem Footer-Template hier eintragen + Script-Regel ergänzen.

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

### Booking.com Affiliate — via CJ (Commission Junction) ⚠️ ADVERTISER DEAKTIVIERT 2026-06-25
> **⚠️ STAND 2026-06-25: Booking.com hat sein „North America"-Programm (7864295) bei CJ DEAKTIVIERT** (CJ-Mail „Deactivated Advertiser Notification", pausiert oder geschlossen). Wir waren nur pending, nie freigegeben, nie etwas verdient → finanziell 0 Verlust. **Auf zercy.app bricht nichts** (Code war immer dormant, `BOOKING_CJ_PID=''`, keine CJ-Links live, verifiziert). **→ CJ-Weg zu Booking NICHT weiterverfolgen. Booking-Monetarisierung läuft künftig über Travelpayouts** (global, 5%, traffic-gated, besserer Weg, siehe Affiliate-Memory). Code bleibt dormant (PID NICHT setzen, es sei denn Booking reaktiviert + Mail kommt). CJ-Konto + W-8BEN/Payoneer bleiben gültig, falls wir CJ je für ANDERE Advertiser (z.B. Viator) nutzen. Das Folgende nur noch als Historie/Referenz:
- **Läuft NICHT über `?aid=`, sondern über CJ-Deep-Links.** Programm: „Booking.com North America" (CJ Advertiser **7864295**, Lead 4%, Serviceable Area nur CANADA+USA, KEIN Cookie-Tracking → nur in-session-Buchungen zählen). CJ Member-ID **7672553**.
- **Code ist vorbereitet & deployed (dormant):** `src/config/affiliates.js` → `BOOKING_CJ_PID=''` + `bookingLink()`; `BookingCTA.astro` nutzt `bookingLink()`; `ZercyLayout.astro` `<script is:inline>` hat eigene `BOOKING_CJ_PID` + `cjBookingLink()` für `zercyUrls.bookingHotels`. Leerer PID = normale Booking-URL (heutiges Verhalten).
- **GO-LIVE nach „Approved":** CJ → Links/Deep Link Generator → Website-PID holen (NICHT Member-ID 7672553) → **denselben PID in BEIDE Dateien** eintragen (`affiliates.js` + `ZercyLayout.astro`) → build + deploy + push → 1 Blog-CTA + 1 App-Hotel-Button testen (muss über anrdoezrs.net→booking.com gehen).
- **Danach:** zusätzlich regionale Booking-Programme bei CJ suchen (EU/Worldwide) wegen DE/ES/global-Publikum. Deals Finder Widget in City-Guides optional. Details: Memory `reference_zercy_cj_booking_affiliate.md`.
- **CJ-Spam-Regel:** Affiliate-Link NUR auf zercy.app, NIE Reddit/Quora/Foren/Kommentare/Mail (= Konto-Kündigung).

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
- **Alle Affiliate-IDs**: zentral in `zercyUrls` im ZercyLayout.astro (~Zeile 1108) + Blog-CTAs in `src/config/affiliates.js`
- Details: siehe Memory `project_zercy_affiliate.md`

### Affiliate-Expansions-Roadmap (Stand 2026-06-22)
Prinzip: vorhandenen Content monetarisieren, leichte Freigabe zuerst, geo-/dreisprachig. **Tier 1:** Travelpayouts (1 Anmeldung → Trip.com/Kiwi/GetYourGuide/Viator/Airalo/Transfers/Versicherung, niedrige Hürde = größter Hebel), Amazon Associates (Gear-Roundups, OneLink amazon.de/.com/.es, ⚠️ 3-Verkäufe/180-Tage → erst bei Traffic anmelden), Booking (CJ pending). (⚠️ DiscoverCars-Direkt ABGELEHNT → nur Placeholder, kein Verdienst; evtl. via Travelpayouts doch nutzbar.) **Tier 2:** GetYourGuide/Viator (Aktivitäten→City-Guides), Airalo/Holafly (eSIM-Guide), Expedia (via Partnerize, `expediaHotels()` schon im Code = 1-Link-Tausch). **Tier 3:** Reiseversicherung, Welcome Pickups, NordVPN, Wise, Priority Pass (eigenes Programm), Civitatis (ES/LATAM). Pro Netzwerk Link-Mechanik dormant vorbauen wie bei Booking. Voll in Memory `project_zercy_affiliate.md`.

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

## ⚠️ CONTENT-STRATEGIE (Stand 2026-06-22 — WICHTIG, GSC-Reality-Check)

### 🧭 STRATEGIE-GATE (PFLICHT, ICH halte den Plan, nicht Christine)
Ich bin der Marketing-Spezialist , die Strategie gehört in MEINEN Kopf. Bei JEDER Mengen-/Content-Anfrage (Artikel vorschlagen, „bau N Blogs", Batch, „mach mehr") nenne ich **ZUERST proaktiv den Konflikt mit unserer eigenen Kadenz** (1 tiefes Flagship alle ~2 Tage, NICHT Masse) UND eine Empfehlung, BEVOR ich produziere. Christine soll NICHT die Strategie im Kopf haben müssen und mich korrigieren. Beispiel-Reflex: „5 auf einmal ist ein Mini-Batch gegen unsere Kadenz , Vorschlag: staffeln, ODER bewusste Ausnahme weil alle Gewinner-Format + recherchiert + monetarisiert. Was willst du?" Ausnahme ist ok, aber als bewusste Entscheidung, die ICH anbiete, nicht als stiller Default. (Auslöser dieser Regel: 2026-06-23 , 5 Artikel begeistert geliefert statt den Strategie-Konflikt zu flaggen.)

**Massen-Publizieren ist VORBEI.** GSC zeigte: 2400 Seiten, Positionen 70-99, ~0 organische Klicks. Masse rankt nicht (junge Domain, Autorität fehlt) und ist riskant (Google „Scaled Content Abuse"). Neue Linie:
- **Cadence: 1 richtig tiefer Flagship-Artikel alle ~2 Tage, ×3 Sprachen** (nicht 50/Tag). Bei „mach 50 Blogs"-Anfragen freundlich auf den GSC-Befund hinweisen.
- **Gewinner-Format = Entscheidungs-Artikel „X lohnt sich? / worth it / vale la pena"** (Modell: Booking-Genius = Top-Performer). Hohe Kaufabsicht, wenig Konkurrenz, AI-Overview-fähig, **monetarisiert via Booking-Affiliate**.
- **Flagship-Qualität:** TL;DR-Antwortbox als erstes Element (für Google AI Overviews/Snippets), echte Zahlen, Entscheidungs-Framework („Nimm X wenn… / Nimm Y wenn…"), 1100-1400 Wörter.
- **Echter Engpass = Autorität/Backlinks** (ohne E-Mails): Product-Hunt-Launch, AI-Tool-/Startup-Verzeichnisse (Formulare), reaktive PR (Featured/Qwoted/HARO, Claude schreibt Zitate), Reddit/Quora. Details in Memory `project_zercy_seo_reality_check.md`.
- **Booking-Affiliate (CJ):** Bewerbung PENDING seit 2026-06-22. Code vorbereitet (dormant) — nach Freigabe `BOOKING_CJ_PID` in `src/config/affiliates.js` UND `src/layouts/ZercyLayout.astro` setzen (siehe Abschnitt „Booking.com Affiliate"). NICHT `?aid=`.

### 💰 AFFILIATE-VERLINKUNG IN ARTIKELN (PFLICHT bei jedem neuen Artikel)
Travelpayouts **Drive** (Script im `<head>`, Marker 542440) wandelt jeden Link zu einer verbundenen Partner-Marke automatisch in einen getrackten Affiliate-Link um (verifiziert 2026-06-22). **Darum: in JEDEN neuen Artikel logische Affiliate-Links setzen.**
- **Dichte (Marketing-Studie):** **2,4 Affiliate-Links pro Artikel** (~1200 W.), kontextuell, nur 1× pro Marke, beim ersten passenden Vorkommen. NICHT stopfen (Google straft Affiliate-Überladung = „Scaled Content Abuse").
- **Keyword → Partner-Domain** (verbundene Programme, einfach den Markennamen/Begriff als Markdown-Link setzen, Drive trackt):
  - eSIM → `https://www.airalo.com/` (auch Yesim `yesim.app`, Saily `saily.com`)
  - VPN → `https://nordvpn.com/`
  - Gepäckaufbewahrung/luggage storage/guardar equipaje → `https://radicalstorage.com/`
  - Flughafentransfer/airport transfer/traslado → `https://www.welcomepickups.com/`
  - Flugentschädigung/flight compensation/compensación → `https://www.airhelp.com/`
  - City Pass → `https://gocity.com/` · Aktivitäten/Tickets → `https://www.tiqets.com/` · Touren → `https://www.klook.com/`
- **`rel="sponsored nofollow"`** kommt automatisch (astro.config `AFFILIATE_HOSTS` + rehype). Neue Partner-Domain dort ergänzen.
- **Retrofit-Script** (idempotent, fasst bestehende Links nicht an): `node scripts/inject-affiliate-links.mjs` — nach jedem neuen Blog-Batch laufen lassen, fängt Keyword-Erwähnungen ohne Link ab. `--dry` für Vorschau. Stand 2026-06-22: 232 Links in 215 Artikel gesetzt.
- **NICHT** zu Booking/GetYourGuide/Viator/Trip.com/Agoda verlinken, solange die NICHT auf TP verbunden sind (Drive trackt sie sonst nicht). Booking läuft separat über CJ.
- **⚠️ PFLICHT: jede neue Affiliate-Kategorie per echtem KLICK testen, bevor man sie ausrollt.** Drives „linkswitcher" wählt pro Kategorie SEINEN Advertiser; ist der nicht abonniert → „marker is not subscribed" (kaputt). Copy-Link/Headless reichen NICHT, nur echter Klick. „geht" = Marken-Seite mit Tracking (member-ID 742545/travelpayouts).
- **Klick-verifiziert OK (2026-06-22):** Airalo, NordVPN, Radical Storage, Welcome Pickups, AirHelp, Go City, Economybookings. **KAPUTT/RAUS: Versicherung (EKTA→VisitorsCoverage nicht abonniert)** , NICHT zu ektatraveling.com verlinken bis VisitorsCoverage in TP gejoint ist.

## Blog-Artikel — Vollständige Checkliste (IMMER anwenden, ohne Aufforderung)

Wenn ein neuer Blog-Artikel für Zercy geschrieben wird, MÜSSEN alle folgenden Punkte automatisch erfüllt sein — ohne dass Christine danach fragen muss.

### 🚀 Schnellstart: Scaffold-Skript (empfohlen)
`node scripts/new-article.mjs spec.json` legt das komplette Gerüst regelkonform an: Duplikat-Check (Slugs + Topic-Key gegen echte Dateien), 3 Sprachdateien mit vollständigem Frontmatter + AEO-Skelett (FAQ + H2-Fragen), `photo-mapping.mjs`-Einträge (eindeutiger Topic-Key), hreflang-Map, URLs in die Index-Queue. Optional `--photos` (holt Foto) und `--dry-run` (nur prüfen). spec.json: `topic`, `query`, `category` (ID: tips/ai/offmap/move/smart/carry/stay/biz/green/hidden/dest/gear), optional `date`/`readingTime`/`bookingDest`, plus `de`/`en`/`es` mit `slug`/`title`/`metaTitle`/`description`. **Danach nur noch den Body schreiben** (TODOs ersetzen) + Build/Deploy. Erspart die handgepflegten Mechanik-Schritte (die häufigste Fehlerquelle).

### Sprachen & Dateipfade
- DE-Artikel → `src/content/blog/[slug].md`
- EN-Artikel → `src/content/blogen/[slug].md`
- ES-Artikel → `src/content/bloges/[slug].md`
- Slugs: lowercase, Bindestriche, keine Sonderzeichen
- **Immer alle 3 Sprachversionen schreiben** — DE + EN + ES gleichzeitig (gilt für ALLE Artikel, nicht nur City-Guides)

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

### 📌 Pinterest — Standard-Integration (automatisch in ALLEN Artikeln)

Alle Blog-Artikel haben automatisch folgende Pinterest-Features eingebaut (im [slug].astro Template, kein Handlungsbedarf bei neuen Artikeln):
- **Hover-Save-Button** auf dem Hero-Image (rot, erscheint beim Hovern oben links)
- **"Diesen Artikel auf Pinterest speichern"**-Link am Artikelende (vor "Zurück zum Blog")
- **Rich Pins Meta-Tags**: `og:site_name`, `article:published_time`, `article:author`

Pinterest-Konto: https://www.pinterest.com/zercy_travel/
Gilt für DE + EN + ES gleichzeitig. Bei neuen Artikeln nichts extra machen — ist im Template.

### 🎯 CTR-Optimierung — PFLICHT bei JEDEM Artikel (auch sofort bei neuen!)

Jeder Artikel muss **vor dem Deploy** CTR-optimierte Meta Tags haben. Nicht erst nach dem Indexieren. Das ist genauso Pflicht wie heroImage.

**Meta Title (45–60 Zeichen) — Regeln:**
- Primäres Keyword **exakt** so wie User es suchen (z.B. "airbnb vs hotel comparison", nicht "Airbnb gegen Hotel")
- Konkrete Zahl oder Ergebnis einbauen: "5 Tricks", "ab 700 Euro", "Top 10", "unter 1.000 Euro"
- Keine generischen Formulierungen: nie "Der ehrliche Vergleich", "Was du wissen musst", "Alles was du brauchst"
- Für "vs."-Artikel: beide Begriffe + "comparison/Vergleich/comparación" im Titel
- Für "lohnt sich/worth it"-Artikel: Antwort kurz im Titel andeuten ("Lohnt sich ab Level 2", "Nur in 4 Fällen")

**Meta Description (160–200 Zeichen) — Regeln:**
- **Erster Satz:** überraschende Tatsache ODER direkte Frage ODER konkretes Ergebnis
- Konkrete Details: Kosten ("ab 30 Euro"), Prozentsätze ("40%"), Anzahl ("4 Szenarien"), echte Städtenamen
- Kein vages "Tipps und Tricks" — immer konkret was der User bekommt
- Für "vs."-Artikel: Kostenvergleich + Überraschungsmoment ("40% der Airbnb-Wohnungen auch auf Booking.com")
- Keine Em-Dashes (— oder –)

**Bekannte Schwächen im Bestand (Stand 2026-05-25):**
- 548 Artikel mit Description < 160 Zeichen (müssen systematisch gefixt werden, Batch-Sessions)
- 179 Artikel mit metaTitle < 45 Zeichen
- 141 Artikel mit metaTitle > 60 Zeichen
- Priorität beim Fixen: Artikel mit GSC-Impressionen zuerst

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

**Gültige Kategorien DE (exakt wie im Listing-Code!):** Reisetipps, KI & Reisen, Fernweh, Unterwegs, Clever Reisen, Nur mit Handgepäck, **Wo übernachten**, Business Travel, Nachhaltig, Geheimtipps, sowie Amazon-Cluster (alle neu 2026-05-30): **Reise-Gadgets** (ID `gear`), **Reise-Kleidung** (ID `clothing`), **Gepäck & Packen** (ID `luggage`), **Reise-Komfort** (ID `comfort`)
**Gültige Kategorien EN (exakt wie im Listing-Code!):** Travel Tips, AI & Travel, Off the Map, On the Move, Smart Travel, Carry-On Only, **Where to Stay**, Business Travel, Travel Green, Hidden Gems, **Travel Gear** (`gear`), **Travel Clothing** (`clothing`), **Luggage & Packing** (`luggage`), **Travel Comfort** (`comfort`) · ES: **Equipo de viaje**, **Ropa de viaje**, **Equipaje y organización**, **Comodidad y bienestar**

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

DE-Links: `/blog/[slug]/` · EN-Links: `/en/blog/[slug]/` · ES-Links: `/es/blog/[slug]/`

> ⚠️ **TRAILING-SLASH-PFLICHT (KRITISCH für SEO):** Interne Blog-Links IMMER **mit Schrägstrich am Ende** schreiben (`](/en/blog/slug/)`, nicht `](/en/blog/slug)`). Canonical + Sitemap nutzen die Slash-Form; ohne Slash erzeugt Google „Alternate page with proper canonical" (Indexing-Müll). Eine Vercel-Weiterleitung in `vercel.json` fängt No-Slash zwar ab (308→Slash), aber gleich richtig schreiben spart den Redirect-Sprung. Gilt für Fließtext-Links UND den „Mehr lesen"-Block. (Fix-Historie 2026-05-30: ~8400 Alt-Links nachträglich umgestellt.)

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
- donde-alojarse-frankfurt, donde-alojarse-helsinki, donde-alojarse-ginebra, donde-alojarse-palermo
- donde-alojarse-verona, donde-alojarse-shanghai, donde-alojarse-beijing, donde-alojarse-fuerteventura
- donde-alojarse-cordoba-espana, donde-alojarse-sofia
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
- guia-street-food-viaje, mercados-navidad-europa-guia, clase-cocina-vacaciones-guia
- nochevieja-viaje-guia, vacaciones-barco-europa-guia, viaje-buceo-planificar-guia
- botiquin-viaje-guia
- cambio-cancelacion-vuelo-guia, cancelacion-hotel-consejos, documentos-viaje-guia
- solicitud-visa-guia, cambio-moneda-viaje-guia, vuelo-largo-comodidad-guia
- licencia-conducir-internacional-guia
- mejor-epoca-para-visitar-bali, mejor-epoca-para-visitar-grecia, mejor-epoca-para-visitar-turquia
- mejor-epoca-para-visitar-vietnam, mejor-epoca-para-visitar-islandia, mejor-epoca-para-visitar-costa-rica
- mejor-epoca-para-visitar-islas-canarias, mejor-epoca-para-visitar-mexico
- mejor-epoca-para-visitar-tailandia, mejor-epoca-para-visitar-japon, mejor-epoca-para-visitar-marruecos
- business-class-vale-la-pena, los-angeles-guia-viaje, donde-alojarse-london, donde-alojarse-liverpool

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
- wo-uebernachten-bangkok, wo-uebernachten-london, wo-uebernachten-liverpool
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
- wo-uebernachten-frankfurt, wo-uebernachten-helsinki, wo-uebernachten-genf, wo-uebernachten-palermo
- wo-uebernachten-verona, wo-uebernachten-shanghai, wo-uebernachten-peking, wo-uebernachten-fuerteventura
- wo-uebernachten-cordoba-spanien, wo-uebernachten-sofia
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
- google-flights-tricks-tipps-2026, ex-eu-routing-guenstiger-fliegen, airline-preisalgorithmus-erklaert
- positioning-flight-erklaert, booking-vs-expedia-vergleich-2026, flexible-dates-flug-hack
- hotel-rate-parity-erklaert, bid-upgrade-business-class, airline-allianzen-guide-2026
- priority-boarding-lohnt-sich, hotel-fruehstueck-inkludiert-lohnt-sich, flughafen-hotel-lohnt-sich
- extra-legroom-sitzplatz-lohnt-sich, direktflug-vs-umsteigen, hotel-treueprogramm-lohnt-sich
- reisefuehrer-tour-buchen-lohnt-sich
- flughafen-schlafen-guide, sicherheitskontrolle-tipps, flugverspaetung-entschaedigung-eu261
- beste-flughaefen-der-welt-2026, umsteigen-kurze-layover-tipps, handgepaeck-packen-system
- flugstreik-rechte-was-tun
- uebertourismus-alternativen-tipps, set-jetting-drehort-urlaub, bleisure-travel-guide
- house-sitting-gratis-urlaub, faehren-europa-guide, freiwilligenarbeit-urlaub-workaway
- round-the-world-ticket-erklaert
- guenstig-reisen-osteuropa-guide, guenstig-reisen-mittelamerika-guide, couchsurfing-guide-2026
- budget-fernflug-tricks, hotel-guenstiger-buchen-tipps, guenstigste-staedte-europa-2026
- reise-budget-sparen-anleitung
- 48-stunden-amsterdam, 48-stunden-paris, 48-stunden-new-york, 48-stunden-tokio, 48-stunden-wien
- 48-stunden-prag, 48-stunden-singapur, 48-stunden-dublin, 48-stunden-seoul, 48-stunden-lissabon
- 48-stunden-barcelona, 48-stunden-istanbul
- radurlaub-europa-guide, motorradreise-europa-guide, sprachreise-erwachsene-guide
- luxuszug-reisen-guide, weinreisen-europa-guide, festival-reisen-guide
- digital-detox-urlaub-guide
- gruppenreisen-organisieren-guide, paerchen-reise-tipps, solo-reisen-maenner-guide
- backpacking-europa-route, suedamerika-backpacking-route, mit-freunden-reisen-tipps
- mehrgenerationen-urlaub-guide
- usa-nationalparks-reiseguide, japan-budget-reisen-tipps, camping-europa-reiseguide
- wochenendtrip-europa-beste-ziele, sprachbarrieren-reisen-tipps, lateinamerika-sicherheit-tipps
- trekking-anfaenger-guide-weltweit
- flug-annullierung-rechte-eu261, gepaeck-verloren-was-tun, reisekrankenversicherung-guide
- reiseruecktrittsversicherung-guide, diebstahl-urlaub-praevention-tipps, zugverspaetung-rechte-europa
- notfall-ausland-was-tun
- street-food-reise-guide, weihnachtsmaerkte-europa-guide, kochkurs-urlaub-guide
- silvester-reisen-weltweit, hausboot-urlaub-europa, taucherreise-planen-guide
- reise-apotheke-guide
- flug-umbuchen-stornieren-guide, hotel-stornierung-tipps, reisedokumente-organisieren-guide
- visum-beantragen-guide, waehrungstausch-ausland-guide, langstreckenflug-komfort-guide
- internationaler-fuehrerschein-guide

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
- where-to-stay-bangkok, where-to-stay-london, where-to-stay-liverpool
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
- where-to-stay-frankfurt, where-to-stay-helsinki, where-to-stay-geneva, where-to-stay-palermo
- where-to-stay-verona, where-to-stay-shanghai, where-to-stay-beijing, where-to-stay-fuerteventura
- where-to-stay-cordoba-spain, where-to-stay-sofia
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
- google-flights-tips-tricks-2026, ex-eu-routing-cheaper-flights, airline-pricing-algorithm-explained
- positioning-flight-guide, booking-vs-expedia-comparison-2026, flexible-dates-flight-hack
- hotel-rate-parity-explained, bid-upgrade-business-class, airline-alliances-guide-2026
- priority-boarding-worth-it, hotel-breakfast-included-worth-it, airport-hotel-worth-it
- extra-legroom-seat-worth-it, direct-flight-vs-connecting, hotel-loyalty-program-worth-it
- tour-guide-worth-it
- sleeping-at-airport-guide, airport-security-tips, flight-delay-compensation-eu261
- best-airports-world-2026, short-layover-tips, carry-on-packing-system
- flight-strike-rights-what-to-do
- overtourism-alternatives-guide, set-jetting-filming-locations-guide, bleisure-trip-guide
- house-sitting-free-travel-guide, ferry-travel-europe-guide, volunteer-travel-workaway-guide
- round-the-world-ticket-guide
- budget-travel-eastern-europe, budget-travel-central-america, couchsurfing-guide-2026-en
- cheap-long-haul-flights-tricks, book-hotel-cheaper-tips, cheapest-cities-europe-2026
- travel-savings-budget-planning
- 48-hours-amsterdam, 48-hours-paris, 48-hours-new-york, 48-hours-tokyo, 48-hours-vienna
- 48-hours-prague, 48-hours-singapore, 48-hours-dublin, 48-hours-seoul, 48-hours-lisbon
- 48-hours-barcelona, 48-hours-istanbul
- cycling-holiday-europe-guide, motorcycle-road-trip-europe, language-immersion-travel-guide
- luxury-train-travel-guide, wine-travel-europe-guide, festival-travel-guide
- digital-detox-travel-guide
- group-travel-tips-guide, couples-travel-tips-guide, solo-travel-men-guide
- europe-backpacking-route-guide, south-america-backpacking-guide, traveling-with-friends-tips
- multigenerational-travel-guide
- usa-national-parks-guide, japan-budget-travel-tips, camping-europe-guide
- weekend-getaways-europe-best, language-barriers-travel-tips, latin-america-safety-tips
- trekking-beginners-guide-worldwide
- flight-cancellation-rights-eu261, lost-luggage-what-to-do, travel-health-insurance-guide
- trip-cancellation-insurance-guide, theft-prevention-travel-guide, train-delay-rights-europe
- emergency-abroad-what-to-do
- street-food-travel-guide, christmas-markets-europe-guide, cooking-class-holiday-guide
- new-years-eve-travel-guide, houseboat-holiday-europe, scuba-dive-trip-guide
- travel-first-aid-kit-guide
- flight-rebooking-guide, hotel-cancellation-tips, travel-documents-guide
- visa-application-guide, currency-exchange-travel-guide, long-haul-flight-comfort-guide
- international-driving-license-guide
- 48-hours-london, 48-hours-berlin, 48-hours-bangkok, 48-hours-sydney
- 48-hours-kyoto, 48-hours-budapest, 48-hours-copenhagen, 48-hours-munich
- 48-hours-dubrovnik, 48-hours-miami
- etias-2026-eu-entry-guide, skyscanner-vs-google-flights-kayak, airbnb-alternatives-2026
- travel-budget-app-2026, rv-camper-road-trip-usa, black-friday-travel-deals-guide
- caribbean-cruise-guide, workation-bali-guide-2026, pilgrimage-camino-santiago-guide
- travel-food-allergies-guide, japanese-ryokan-guide, chain-hotel-boutique-bnb-comparison
- japan-rail-pass-2026, new-zealand-road-trip-guide, norway-fjords-guide
- temple-hopping-asia-guide, hamam-turkish-bath-guide, schengen-90-day-rule-guide
- unique-accommodation-guide, photography-destinations-worldwide
- where-to-stay-udaipur, where-to-stay-varanasi, where-to-stay-kochi
- where-to-stay-cappadocia, where-to-stay-chengdu, where-to-stay-xian
- where-to-stay-cebu, where-to-stay-sapporo, where-to-stay-kanazawa
- where-to-stay-gdansk, where-to-stay-wroclaw, where-to-stay-tirana
- where-to-stay-sarajevo, where-to-stay-budva, where-to-stay-rovinj
- where-to-stay-hobart, where-to-stay-rotorua, where-to-stay-tromso
- where-to-stay-rovaniemi, where-to-stay-merida
- best-time-to-visit-bali, best-time-to-visit-greece, best-time-to-visit-turkey, best-time-to-visit-vietnam
- best-time-to-visit-iceland, best-time-to-visit-costa-rica, best-time-to-visit-canary-islands, best-time-to-visit-mexico
- 48-stunden-london, 48-stunden-berlin, 48-stunden-bangkok, 48-stunden-sydney
- 48-stunden-kyoto, 48-stunden-budapest, 48-stunden-kopenhagen, 48-stunden-muenchen
- 48-stunden-dubrovnik, 48-stunden-miami
- etias-2026-guide, skyscanner-google-flights-kayak-vergleich, airbnb-alternativen-2026
- reisekosten-app-2026, wohnmobil-roadtrip-usa-guide, black-friday-reisedeals-guide
- karibik-kreuzfahrt-guide, workation-bali-2026, pilgern-camino-auszeit-guide
- reisen-lebensmittelallergien-guide, japanisches-ryokan-guide, hotelkette-boutique-bnb-vergleich
- japan-rail-pass-2026-guide, neuseeland-roadtrip-guide, norwegen-fjorde-guide
- tempelhopping-asien-guide, hamam-tuerkisches-bad-guide, schengen-90-tage-regel-guide
- aussergewoehnliche-unterkuenfte-guide, foto-destinationen-weltweit-guide
- wo-uebernachten-udaipur, wo-uebernachten-varanasi, wo-uebernachten-kochi
- wo-uebernachten-kappadokien, wo-uebernachten-chengdu, wo-uebernachten-xian
- wo-uebernachten-cebu, wo-uebernachten-sapporo, wo-uebernachten-kanazawa
- wo-uebernachten-danzig, wo-uebernachten-breslau, wo-uebernachten-tirana
- wo-uebernachten-sarajevo, wo-uebernachten-budva, wo-uebernachten-rovinj
- wo-uebernachten-hobart, wo-uebernachten-rotorua, wo-uebernachten-tromso
- wo-uebernachten-rovaniemi, wo-uebernachten-merida
- beste-reisezeit-bali, beste-reisezeit-griechenland, beste-reisezeit-tuerkei, beste-reisezeit-vietnam
- beste-reisezeit-island, beste-reisezeit-costa-rica, beste-reisezeit-kanaren, beste-reisezeit-mexiko

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
Vor dem FAQ, nach dem `---` Trennstrich: 1–2 Sätze die Zercy erwähnen, natürlich eingebaut, nicht werblich aufdringlich. **IMMER mit Zercy-Logbook-Link.**

⚠️ **CTA MUSS zum Artikel-Typ passen (KRITISCH, sonst Logik-Bruch):** Das Logbook speichert **Reise-Optionen (Flüge, Hotels, Reiseziele/Stadtteile), keine Produkte.**
- **Reise-/City-/Destination-Artikel:** "Speichere die Auswahl im [Zercy Logbook](https://www.zercy.app/logbook), damit du beim Buchen alle Optionen zur Hand hast." (EN: "Save the shortlist in your [Zercy Logbook](...) so you have all options handy when booking.")
- **Produkt-/Gadget-Artikel (Kategorie `gear`) und andere Nicht-Reise-Themen:** NICHT „speichere die Auswahl (das Produkt) im Logbook" schreiben (Quatsch, man speichert keinen Koffer im Reise-Logbook). Stattdessen zur Reiseplanung überleiten, z.B.: "Wenn dein Gepäck steht, beginnt die eigentliche Reise: Mit Zercy vergleichst du Flüge und Hotels mit Live-Preisen und sicherst dir die besten Optionen in deinem [Zercy Logbook](https://www.zercy.app/logbook)." (EN: "Once your bag is sorted, the real trip begins: with Zercy you compare flights and hotels at live prices and save the best options in your Logbook.")

⚠️ **ALLGEMEIN — Logik-Check (PFLICHT bei jedem neuen Artikel, besonders bei neuen Themen-Typen):** Skelett-Bausteine (CTA, FAQ-W-Fragen, „beste Reisezeit"-/Stadtteil-Struktur, `bookingDest`-Banner) sind auf Reise-/Destination-Artikel gemünzt. Bei neuen/anderen Themen-Typen IMMER prüfen, ob jeder Baustein im Kontext **logisch** ist und nicht aus dem Template „durchrutscht". Lieber den Baustein an das Thema anpassen als blind übernehmen.

### ✅ Bereits vorhandene Themenartikel — IMMER HIER PRÜFEN vor neuen Vorschlägen!

**Stand: 2026-05-30 | 383 Themenartikel**

**Neu 2026-06-26 (Reise-Geldkarte + Fast Track, LIVE):** Reise-Geldkarte lohnt sich (reise-geldkarte-lohnt-sich / travel-money-card-worth-it / tarjeta-viaje-sin-comisiones-vale-la-pena) , **geo-differenziert** (DE=DACH-Karten + Kautionsregel, EN=US/UK Schwab/Wise/Revolut, ES=España+LATAM); Fast Track Security lohnt sich (fast-track-flughafen-lohnt-sich / airport-fast-track-security-worth-it / fast-track-aeropuerto-vale-la-pena).

**Neu 2026-07-01 (LIVE):** eSIM vs Roaming lohnt sich (reise-esim-oder-roaming-lohnt-sich / travel-esim-vs-roaming-worth-it / esim-viaje-o-roaming-vale-la-pena, Affiliate Airalo, EU-Roaming-Geo-Nuance) + Inflight WiFi lohnt sich (wlan-im-flugzeug-lohnt-sich / inflight-wifi-worth-it / wifi-en-vuelo-vale-la-pena, Gratis-Trend United Starlink/JetBlue/Delta).

**Neu 2026-07-07 (LIVE):** Interrail/Eurail-Pass lohnt sich (interrail-pass-lohnt-sich / eurail-pass-worth-it / pase-eurail-interrail-vale-la-pena, Geo: DE=Interrail EN=Eurail ES=beide) + Kreuzfahrt-Getränkepaket lohnt sich (kreuzfahrt-getraenkepaket-lohnt-sich / cruise-drink-package-worth-it / paquete-bebidas-crucero-vale-la-pena) + Mietwagen-Tankregelung lohnt sich (mietwagen-tankregelung-lohnt-sich / rental-car-fuel-policy-worth-it / politica-combustible-alquiler-vale-la-pena, Affiliate EconomyBookings). ⚠️ Lektion: `validate-articles.mjs` fing >10 FAQ-Fehler, die die Subagenten-Selbstberichte übersahen (Ja/Nein-Fragen statt W-Wort, fehlende ¿ in ES) , Gate IMMER laufen lassen, Subagent-„alles ok" nie blind glauben.

**Neu 2026-06-28 (Resort Fee + EU-Handgepäck-2027, LIVE , war Sonntag-Batch, erledigt):** Resort Fee (resort-fee-hotel-lohnt-sich / resort-fees-worth-it / resort-fee-hotel-vale-la-pena, FTC-Junk-Fees-Rule Mai 2025) + **EU-Handgepäck-Regeln 2027** (eu-handgepaeck-regeln-2027 / eu-hand-luggage-rules-2027 / nuevas-reglas-equipaje-mano-ue-2027, Maße 40x30x15/100cm/7kg frei ab 2027, A4E, Spanien-179-Mio-Bußgeld, US-nach-Europa-Winkel). `_sunday-drafts/` wurde geleert/entfernt. (Muster bestätigt: Artikel HALTEN = außerhalb `src/content` schreiben, dann am Upload-Tag rein-`git mv` + Fotos + Gate + Deploy.)

**Neu 2026-06-23 (5 Flagship-"lohnt sich"-Entscheidungsartikel, recherchiert, Booking-Genius-Format ×3 Sprachen):** Mietwagen-Versicherung/CDW lohnt sich (mietwagen-versicherung-lohnt-sich / rental-car-insurance-worth-it / seguro-coche-alquiler-vale-la-pena, Affiliate EconomyBookings), Premium Economy lohnt sich (premium-economy-lohnt-sich / premium-economy-worth-it / premium-economy-vale-la-pena), Flughafentransfer vs Taxi (flughafentransfer-vs-taxi-lohnt-sich / airport-transfer-vs-taxi-worth-it / traslado-aeropuerto-vs-taxi-vale-la-pena, Affiliate Welcome Pickups), Global Entry/TSA PreCheck (global-entry-tsa-precheck-lohnt-sich / -worth-it / -vale-la-pena), Sitzplatzreservierung (sitzplatz-reservieren-lohnt-sich / seat-selection-worth-it / pagar-elegir-asiento-vale-la-pena). Alle mit TL;DR-Box, echten Zahlen, Entscheidungsraster, FAQPage-Schema.

**Neu 2026-05-30 (Batch 1):** Paris vs Rom (Vergleich), Beste Reisezeit Neuseeland, Beste Reisezeit Portugal, eSIM-Reise-Guide 2026, Europa Nebensaison — alle 3 Sprachen.
**Neu 2026-05-30 (Gadget-Batch, Kategorie „Reise-Gadgets", Amazon-ready, noch ohne Affiliate-Links):** Beste Reisewaagen, Bestes Handgepäck, Beste Koffer, Beste Packwürfel, Beste Reise-Powerbanks, Beste Reise-Kopfhörer, Beste Reiseadapter, Beste Reiserucksäcke, Koffergurte+Zubehör, Reise-Gadgets fürs Fliegen mit Kindern — alle 3 Sprachen.
**Neu 2026-05-30 (Batch 3, Pinterest-Trend-informiert, 2 neue Amazon-Kategorien):** Kategorie „Reise-Kleidung" (clothing): Bergoutfit-Guide, Beste packbare Jacken, Beste Kompressionssocken, Beste Reiseschuhe. Kategorie „Gepäck & Packen" (luggage, + 6 Gepäck-Artikel von „Reise-Gadgets" hierher umgezogen): Beste Underseat-Taschen, Beste Reisetaschen/Duffel, Beste Kulturbeutel. Reiseziele (Pinterest-Trend): Lofoten-Inseln, Fotogenste/aesthetic Reiseziele, Beste Florida-Strände. Alle 3 Sprachen. Produkt-Artikel mit Reiseplanungs-CTA, Reiseziele mit Logbook-CTA.
**Neu 2026-05-30 (Batch 4, 20 Themen, neue Amazon-Kategorie „Reise-Komfort & Wellness" = comfort, Indigo #6366F1, Herz-Icon):** Komfort (comfort): Reise-Nackenkissen, Schlafmasken, Ohrstöpsel, Reise-Fläschchen/TSA-Sets, Reisedecken. Gadgets (gear): Gepäck-Tracker, Wasserfilter-Flaschen, E-Reader, Reise-WLAN-Router. Kleidung (clothing): Merino-Reisekleidung, Reise-Regenjacken, „Was anziehen Langstreckenflug", knitterfreie Kleidung. Gepäck (luggage): Laptop-Reiserucksäcke, Dry Bags, Schuhbeutel. Reiseziele (Pinterest/Backlog, dest/offmap): San Juan PR, Zadar, 48h Florenz, Beste Reisezeit Südafrika. Alle 3 Sprachen.
**Neu 2026-06-15 (Batch 4, 30 Themen):** 5 Beste-Reisezeit (Irland, Kolumbien, Malediven, Kambodscha, Deutschland), 6 Vergleiche (Marokko vs Ägypten, Malediven vs Bali, Sevilla vs Granada, Edinburgh vs Glasgow, Vietnam vs Kambodscha, Amsterdam vs Brüssel), Listicles (romantischste Reiseziele, beste Solo-Frauen-Ziele, unterschätzte Städte Europas, Wildlife-Watching, UNESCO-Welterbe, Rooftop-Bars, klarste Strände, schönste Bahnhöfe, Street-Art-Städte, Nachtmärkte Asien, Food-Märkte, schönste Cafés, Schloss-Hotels), Praktisch (Touristenfallen vermeiden, Leute treffen solo, Flug verpasst, Reiseangst, Babymoon, nur-mit-Rucksack). Alle 3 Sprachen.
**Neu 2026-06-12 (Batch 3, 30: 10 Amazon-Produkte + 20 Pinterest-Trends):** Produkt-Roundups (comfort/clothing/luggage/gear, echte Marken, noch keine Affiliate-Links): Reise-Waschset, Reise-Sandalen, packbare Sonnenhüte, reef-safe Sonnencreme, Strandtaschen, faltbare Wasserflaschen, kompakte Reiseschirme, RFID-Geldbörsen/Geldgürtel, Strandmuscheln, Reise-Bademode. Pinterest-Trend-Themen: Florenz Landmarks, Antalya-Region, Beste Reiseziele Mexiko, Urlaubs-Foto-Ideen, Schönste Orte Italien/Türkei/Griechenland/Spanien/Portugal/Frankreich/Kroatien, Beste Beach Towns Europa, Küstenstädte Italien, Griechische Inseln für Paare, Sunset-Spots, Küstenstraßen, Lavendelfelder Provence, Sommer-Städtetrips, Nationalparks weltweit, Flitterwochen-Inseln. Alle 3 Sprachen.
**Neu 2026-06-12 (Batch 50/2, 30 Themen):** 6 Vergleiche (Bangkok vs Singapur, Bali vs Thailand, Costa Rica vs Panama, Rom vs Florenz, Cancún vs Tulum, Dubrovnik vs Split), 5 Beste-Reisezeit (Frankreich, Norwegen, Schweiz, Jordanien, Philippinen), Trend/Pinterest (Schönste Dörfer Europas, Instagrammable Places, Blaue Städte, Bunteste Städte, Girls-Trip-Ziele, Bucket-List 2026, Märchenhafte Städte, Schönste Schlösser, Schönste Wasserfälle, Beste Inseln, Schönste Seen Europas), Erlebnis (Beste Surfspots, Beste Roadtrips, Wüsten-Reiseziele, Spa-/Thermalstädte), Praktisch (Itinerary bauen, Wie lange pro Stadt, Günstige Unterkünfte, Layover vs Stopover). Alle 3 Sprachen.
**Neu 2026-06-11 (Batch 50, 30 Themen):** 6 Vergleiche (Tokio vs Kyoto, Prag vs Budapest, Lissabon vs Porto, Kroatien vs Griechenland, Island vs Norwegen, Peru vs Bolivien), 5 Beste-Reisezeit (Spanien, Italien, Kroatien, Indien, Schottland), Trend (Destination Dupes 2026, Coolcation 2026, Wohin pro Monat 2026, Günstigste Länder 2026, Sicherste Länder Solo 2026, Kirschblüte weltweit, Herbstlaub, Walbeobachtung, Dark-Sky/Stargazing), Erlebnis (Thermalquellen, schönste Zugstrecken, Food-Städte, Strände Südostasien, Coworking-Städte), Praktisch (Multi-City-Trip, Red-Eye-Flug, Flugangst, Error Fares, Reise-Scams). Alle 3 Sprachen.
**Neu 2026-05-30 (Batch 5, 30 Themen):** comfort: Kaffeebereiter, Fußstützen/Fußhängematten, Pillenboxen, Luftbefeuchter, Mikrofaser-Handtücher. gear: Kompaktkameras, Reise-Drohnen, Solar-Powerbanks, Action-Cams, Steckdosenleisten, Handy-Gimbals. clothing: Quick-Dry-Kleidung, Reise-Unterwäsche, Zip-Off-Hosen, UV-Schutzkleidung, Reisekleider. luggage: Hartschale-vs-Weichschale, Kinder-Handgepäck, Kleidersäcke, Anti-Diebstahl-Taschen, Weekender. Reiseziele: Tiflis (Georgien), 48h Valencia, Beste Reisezeit Peru/Australien/Ägypten/Brasilien/Indonesien/Kanada/Sri Lanka. Alle 3 Sprachen.

Airline-Allianzen Guide, Airline Preisalgorithmus, Airbnb Alternativen 2026, Algarve vs. Costa del Sol, Außergewöhnliche Unterkünfte, Backpacking Europa Route,
Beste Reisezeit Bali, Beste Reisezeit Costa Rica, Beste Reisezeit Griechenland, Beste Reisezeit Island, Beste Reisezeit Japan, Beste Reisezeit Kanaren, Beste Reisezeit Marokko, Beste Reisezeit Mexiko, Beste Reisezeit Thailand, Beste Reisezeit Türkei, Beste Reisezeit Vietnam, Backpacking Südamerika Route, Barcelona vs. Madrid, Beste Flughäfen 2026, Bid Upgrade Business Class, Bleisure Travel Guide, Booking vs. Expedia Vergleich, Black Friday Reisedeals, Budget Mittelamerika, Budget Osteuropa, Budget-Fernflug 7 Tricks, Camping Europa Guide, Couchsurfing 2026, Diebstahl im Urlaub Prävention, Digital Detox Urlaub, Digitaler Nomade werden, ETIAS 2026 Guide, Direktflug vs. Umsteigen, Erster Alleinreise Guide, Ex-EU Routing, Extra Legroom Sitz, Fähren Europa Guide, Festival-Reisen Guide, Flug umbuchen & stornieren, Foto-Destinationen weltweit, Flug-Annullierung EU261, Flughafen schlafen Guide, Flughafen-Hotel lohnt sich, Flexible Dates Hack, Flugstreik Rechte, Flugverspätung EU261 Entschädigung, Freiwilligenarbeit Workaway, Gap Year mit 40, Gepäck verloren, Google Flights Tricks, Gruppenreisen organisieren, Günstigste EU-Städte 2026, Handgepäck packen System, Hotel günstig buchen Tricks, Hotel Rate Parity, Hotel-Frühstück lohnt sich, Hotel-Treueprogramm lohnt sich, Hamam Guide, Hausboot Urlaub Europa, Hotel Stornierung Tipps, Hotel vs. Boutique vs. BnB Vergleich, House Sitting Guide, Internationaler Führerschein Guide, Japan Budget Reisen, Japan Rail Pass 2026, Japanisches Ryokan Guide, Karibik Kreuzfahrt Guide, Kleinkind reisen unter 3, Kochkurs Urlaub Guide, Kurze Layover Tipps, Langstreckenflug Komfort Guide, Lateinamerika Sicherheit, Lebensmittelallergien beim Reisen, Luxuszug Reisen Guide, Mallorca vs. Ibiza, Mehrgenerationen-Urlaub, Mit Freunden reisen Tipps, Motorradreise Europa, Neuseeland Roadtrip Guide, New York vs. Los Angeles, Norwegen Fjorde Guide, Notfall im Ausland, Pärchen-Reise Tipps, Portugal vs. Spanien, Positioning Flight Guide, Priority Boarding lohnt sich, Radurlaub Europa Guide, Reise-Apotheke Guide, Reise-Budget sparen Guide, Reise-Budget-App 2026, Reisedokumente organisieren, Reisekrankenversicherung Guide, Reiserücktrittsversicherung Guide, Reisen als Student Budget, Reisen nach der Rente 50+, Reiseleiter buchen lohnt sich, Round-the-World Ticket, Schengen 90-Tage-Regel Guide, Set-Jetting Guide, Sicherheitskontrolle Tipps, Skyscanner vs. Google Flights vs. Kayak, Solo Reisen Männer, Sprachbarrieren beim Reisen, Sprachreise Erwachsene, Thailand vs. Vietnam, Trekking Anfänger weltweit, Türkei vs. Griechenland, Silvester Reisen weltweit, Skyscanner vs. Kayak Guide, Street Food Reise Guide, Taucherreise planen Guide, Tempelhopping Asien Guide, Übertourismus Alternativen, Ungewöhnliche Unterkünfte Guide, USA Nationalparks Guide, Visum beantragen Guide, Währungstausch im Ausland, Weihnachtsmärkte Europa Guide, Weinreisen Europa Guide, Weltreise 6 Monate planen, Wochenendtrip Europa beste Ziele, Zugverspätung Rechte Europa,

48h Amsterdam, 48h Bangkok, 48h Berlin, 48h Budapest, 48h Dublin, 48h Dubrovnik, 48h Kopenhagen, 48h Kyoto, 48h Lissabon, 48h London, 48h Miami, 48h München, 48h New York, 48h Paris, 48h Prag, 48h Seoul, 48h Singapur, 48h Sydney, 48h Tokio, 48h Wien, 48h Rom, 48h Barcelona, 48h Istanbul, Ägypten Reiseguide, Airbnb Experiences, Airbnb vs. Hotel, Airport Hacks, Albanien Riviera, Algarve Guide 2026, All-Inclusive Urlaub, Apulien/Süditalien, Argentinien Reiseguide, Auslands-SIM Guide, Australien Rundreise, Azoren Reiseguide, Backpacking Einsteiger, Bahn vs. Flieger Europa, Bali vs. Lombok, Bangkok 3 Tage, Balkan Road Trip, Barrierefreies Reisen, Bergwandern Alpen Anfänger, Beste Badeziele weltweit 2026, Beste Frühlingsziele Europa, Beste Herbstziele, Beste Offline Apps, Beste Reise-Kreditkarten 2026, Beste Travel Apps 2026, Bolivien & Salar de Uyuni, Booking Apartments vs. Airbnb, Booking Genius, Booking vs. Direkt, Boutique Hotels, Brasilien Reiseguide, Bulgarien Reiseguide, Business Class, Business Class ohne Meilen, Campervan Europa, Capsule Wardrobe Handgepäck, Chile Reiseguide, City Cards & Museumspässe, CO2 Kompensation, Costa Rica Rundreise, Costa Rica Surfen, Cyber-Sicherheit, Dänemark Reiseguide, Digital Nomad Visa, Dominikanische Republik Guide, Ecuador & Galápagos, Europäische Städte im Winter, Färöer Inseln, Familienurlaub Europa Ziele, Familienurlaub mit Kindern Tipps, Fernwanderwege Welt, Fiji & Pazifik Inselhopping, Finnland Reiseguide, Flughafentransfer Tipps 2026, Flugverspätung Rechte, Flusskreuzfahrten Europa, Food Travel, Frühbucher vs. Last Minute, Geheimtipps Europa, Geld im Ausland, Glamping Europa, Griechenland Inseln Vergleich, Guatemala Reiseguide, Günstig Fliegen, Handgepäck Flüssigkeiten, Handgepäck vs. Aufgegeben, Hidden City Ticketing, Honeymoon Planung, Hostel Guide (Buchen), Hostel oder Hotel 2026, Hotel-Kategorien erklärt, Hotel Upgrade Tipps, Indien Reiseguide, Indonesien Reiseguide, Inselhopping Karibik, Interrail Guide 2026, Irland Rundreise, Island Reiseguide, Japan 3-Wochen-Route, Japan beyond Tokyo, Jetlag, Jordanien Reiseguide, Kambodscha Reiseguide, Kanada Reiseguide, Kanaren-Vergleich, Kap Verde Reiseguide, Kenia Reiseguide, KI & Reiseplanung (4 Artikel), Kolumbien Reiseguide, Kreuzfahrt Einsteiger, Kreuzfahrt Städte, Kroatien Island Hopping, Langstreckenflug mit Kindern, Laos Reiseguide, Lissabon Off the Beaten, Lounge Zugang, Los Angeles, Luxusreisen günstig, Madeira Reiseguide, Madrid 24h, Malediven Guide, Malta & Gozo Guide, Marokko Roadtrip, Marokko Städteguide, Mauritius Reiseguide, Meilen & Punkte Anfänger, Mexiko Rundreise, Mietwagen (3 Artikel), Mit Hund Europa, Mit Katze reisen Europa, Modena Ferrari, Nachtzüge Europa, Namibia Reiseguide, Nepal Reiseguide & Trekking, Neuseeland Guide, Niederlande Rundreise, Nordlichter 2026, Nur Handgepäck, Oman Reiseguide, Open Jaw Tickets, Osaka vs. Kyoto, Panama Reiseguide, Patagonien 3 Wochen, Pauschalreise vs. Individualreise, Peru Guide, Philippinen Reiseguide, Plastik-frei Reisen, Polen Rundreise, Porto Guide, Portugal Rundreise, Powerbank Regeln, Reise-Packliste, Reisefehler vermeiden, Reisefotografie, Reiseimpfungen Guide, Reisekreditkarte 2026, Reisen kleines Budget, Reisen mit Baby, Reisen mit Teenagern, Reisen nach 60, Reiseversicherung, Riads Marokko, Roadtrip Etappen, Route 66 USA, Ruanda & Gorilla Trekking, Rumänien Reiseguide, Sabbatical planen, Safari Ostafrika, Sansibar Stone Town, Santiago de Compostela, Schönste Strände Europa, Schottland Highlands Roadtrip, Schweden Reiseguide, Schweiz Reise-Highlights, Segelurlaub Einsteiger, Skiurlaub Europa, Skandinavien Rundreise, Slow Travel, Slowenien Guide, Solo Reisen Frauen, Sri Lanka Rundreise, Stopover Tourismus, Südafrika Rundreise, Südkorea 2-Wochen-Route, Südostasien Budget, Surfurlaub Anfänger, Taiwan Reiseguide, Tansania Reiseguide, Tauchen & Schnorcheln, Thailand 2-Wochen-Route, Tokio Foodie, Trinkgeld weltweit, Türkei Road Trip, Ungarn Reiseguide, US Westküste Roadtrip, Usbekistan Seidenstraße, Vegan Reisen, Vietnam 2-Wochen-Route, Visa-on-Arrival Länder, Wann Flüge buchen, Was ist Zercy, Wellness & Spa Reisen, Wien am Wochenende, Wintersonnen Januar, Wohnungstausch, Wohnmobil Roadtrip USA, Workation Bali 2026, Workation Portugal & Spanien, Workation Steuern, Yoga-Retreats 2026, Zercy Logbook, Zugreisen Europa

**Regel:** Vor JEDEM neuen Themenartikel-Vorschlag prüfen, ob er schon existiert. **Maßgeblich sind die echten Dateien, nicht diese (driftende) Liste:** `ls src/content/blog/*<thema>*.md` (bzw. `blogen`/`bloges`). Diese Liste nur als Ergänzung lesen; nach jeder neuen Batch aktualisieren.

---

### ✅ Bereits vorhandene City-Guides — IMMER HIER PRÜFEN vor neuen Vorschlägen!

**Stand: 2026-05-30 | 219 Städte**

**Neu 2026-06-15 (Batch 4, 20 City-Guides):** Sorrent, Taormina, Lecce, Korfu, Segovia, Aveiro, Carcassonne, Bamberg, York, Cork, Pula, Ohrid, Takayama, Jaisalmer, Sapa, Petra, Bariloche, Florianópolis, Sedona, Sayulita — alle 3 Sprachen.
**Neu 2026-06-12 (Batch 50/2, 20 City-Guides):** Positano, Comer See, Naxos, Milos, Toledo, Cádiz, Lagos (PT), Colmar, Annecy, Rothenburg, Heidelberg, Lauterbrunnen, Hvar, Ninh Binh, Ubud, El Nido, Jodhpur, San Miguel de Allende, Banff, Savannah — alle 3 Sprachen.
**Neu 2026-06-11 (Batch 50, 20 City-Guides):** Cinque Terre, Siena, Matera, Sintra, Hallstatt, Zermatt, Paros, Zakynthos, Ronda, Girona, Rotterdam, Fès, Chefchaouen, Hue, Yogyakarta, Galle, Nara, Hakone, Guanajuato, Byron Bay — alle 3 Sprachen.
**Neu 2026-05-30 (Batch):** Punta Cana, Amalfi (Amalfiküste), Manila, Galway, Izmir — alle 3 Sprachen, mit IG-Carousel + FB-Reel.

**Agadir**, **Alicante**, Amsterdam, **Breslau (Wrocław)**, **Budva**, Antalya, **Antigua (Guatemala)**, **Agra**, **Amman**, **Antwerpen**, Athen, Auckland, **Austin**, **Beijing (Peking)**, Bali, Bangkok, Barcelona, Berlin, Bilbao, **Bled**, Bogotá, Bologna, Bordeaux, Boston, **Bratislava**, Brisbane, Brüssel, **Brügge**, Budapest, Bukarest, **Belgrad**, **Bath**, Buenos Aires, **Bergen**, **Busan**, **Cairns**, Cancún, Cape Town, **Cebu**, **Chengdu**, Cartagena, Chiang Mai, Chicago, **Christchurch**, Colombo, **Córdoba (Arg)**, **Córdoba (Spanien)**, Cusco, **Da Nang**, **Danzig (Gdańsk)**, **Dar es Salaam**, Delhi, **Dresden**, Dublin, Dubrovnik, Edinburgh, Florenz, Frankfurt, Funchal, **Fuerteventura**, Fukuoka, **Genf**, **Gent**, Goa, **Gold Coast**, Granada, **Gran Canaria**, **Graz**, Guadalajara, **Göteborg**, Hamburg, Hanoi, **Helsinki**, **Hiroshima**, **Hobart**, Ho Chi Minh Stadt, Hoi An, Hongkong, **Ibiza**, Innsbruck, **Interlaken**, Istanbul, Jaipur, **Kanazawa**, **Kappadokien**, Johannesburg, Kairo, Kathmandu, **Kochi**, **Koh Samui**, Kopenhagen, Kotor, **Köln**, Krakau, **Krabi**, **Kreta**, Kuala Lumpur, Kyoto, **Langkawi**, Lanzarote, Las Vegas, Lima, **Liverpool**, Lissabon, **Manchester**, Ljubljana, London, Los Angeles, **Luang Prabang**, **Luzern**, **Luxor**, **Lyon**, Madrid, Mailand, Málaga, Marrakesch, Marseille, Melbourne, Medellín, Mendoza, **Mérida (Mexiko)**, Mexico City, Miami, **Mombasa**, **Montevideo**, Montreal, **Mostar**, München, Mumbai, Mykonos, Nashville, Nairobi, Neapel, **Nha Trang**, **Nikosia**, Nizza, New Orleans, New York, Oaxaca, Osaka, Oslo, Palermo, Palma de Mallorca, Paris, Penang, **Perth**, Philadelphia, Phuket, **Phnom Penh**, Playa del Carmen, **Plovdiv**, **Pokhara**, Porto, Prag, Puerto Vallarta, Québec City, Queenstown, Reykjavik, **Rhodos**, Riga, Rio de Janeiro, Rom, **Rotorua**, **Rovaniemi**, **Rovinj**, **Salvador (Bahia)**, Salzburg, **San Diego**, **Sapporo**, **Sarajevo**, San Francisco, **San Sebastián**, Santiago, Santorini, São Paulo, Seattle, Seoul, Sevilla, **Shanghai**, Siem Reap, Singapur, **Sofia**, Split, Stockholm, **Straßburg**, Sydney, Taipei, Tallinn, Teneriffa, **Thessaloniki**, **Tirana**, Tokio, Toronto, **Turin**, **Tromsø**, Tulum, Valencia, Valletta, **Valparaíso**, Vancouver, Venedig, Verona, Vilnius, Washington D.C., **Udaipur**, **Varanasi**, **Wellington**, Warschau, Wien, **Zagreb**, **Xi'an**, Zürich

**Regel:** Vor JEDEM neuen City-Guide-Vorschlag prüfen, ob die Stadt schon existiert. **Maßgeblich sind die echten Dateien, nicht diese (driftende) Liste:** `ls src/content/blog/wo-uebernachten-<stadt>.md` (bzw. `where-to-stay-`/`donde-alojarse-`). Diese Liste nur als Ergänzung lesen; nach jeder neuen Batch aktualisieren.

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
- [ ] **LOGIK-CHECK: Liest sich der Text im Kontext sinnvoll?** CTA passt zum Artikel-Typ (Logbook = Reise-Optionen, NICHT Produkte), keine durchgerutschten Template-Bausteine, interne Links MIT trailing slash
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
- [ ] `npx astro build` erfolgreich + `npx vercel --prod --force --archive=tgz` deployed
- [ ] **Neuen Slug oben in die Artikel-Liste eingetragen** (DE + EN)
- [ ] Google Indexierung ist automatisch (Sitemap mit `lastmod` wird bei jedem Build aktualisiert)
- [ ] **Pinterest-CSV erzeugt** (`node scripts/make-pinterest-csv.mjs`) + Christine gesagt, sie soll sie hochladen (Import content → Upload .csv)

### Nach dem Schreiben — Deploy + Google Indexierung

⚠️ **AUTOMATISCHE PFLICHT: Nach jedem Deploy mit neuen Seiten die URLs in die Index-Queue schreiben!**

1. `npx astro build` — baut alle Seiten + generiert Sitemap automatisch.
2. `npx vercel --prod --force --archive=tgz` — deployed alles.
3. **Index-Queue füllen (statt manuellem submit) — IMMER am Ende der Session (ohne Aufforderung):**
   ```bash
   # neue URLs (DE/EN/ES) an den Anfang von scripts/indexing-queue.txt setzen
   # WICHTIG: URLs MIT trailing slash (= Canonical-Form), sonst „Alternate page with proper canonical" in GSC
   { printf '%s\n' https://www.zercy.app/blog/[slug]/ https://www.zercy.app/en/blog/[slug]/ https://www.zercy.app/es/blog/[slug]/; cat scripts/indexing-queue.txt; } > q.tmp && mv q.tmp scripts/indexing-queue.txt
   ```
   - Der LaunchAgent `app.zercy.daily-indexing` (08:30 CST) reicht täglich die ersten 200 ein und räumt die Queue auf. **Kein manuelles `submit-indexing.mjs` nötig**, kein 200/Tag-Jonglieren von Hand (Überhang bleibt in der Queue).
   - Gilt für Blog-Artikel (DE/EN/ES), neue Seiten, geänderte Seiten.
   - `submit-indexing.mjs` (Token in `~/.zercy-analytics/tokens.json`) nur noch für manuelle Sofort-Einreichung einzelner URLs.
4. **Neuen Slug in die Artikel-Liste eintragen** (damit nächste Session ihn für interne Links nutzen kann).
5. **📌 PINTEREST-CSV ERZEUGEN (PFLICHT bei jedem neuen Batch, ohne Aufforderung):**
   ```bash
   node scripts/make-pinterest-csv.mjs        # nimmt alle Artikel mit pubDate==heute, alle 3 Sprachen, geplant 30/Tag ab morgen
   ```
   → CSV landet auf `~/Desktop/zercy-pinterest-<datum>.csv`. **Christine sagen, sie soll sie hochladen:** pinterest.com → Settings (˅ oben rechts) → **Import content** → **„Upload .csv or .txt file"**.
   - Bei >67 Artikeln (>200 Pins) warnt das Script → dann mit `--langs` aufteilen (z.B. erst `de,en`, dann `es`) oder `--since`/`--date` nutzen.
   - **NIE dieselben Artikel doppelt** (sofort UND in einer Cutoff-Welle) pinnen → Dubletten. Das Script nimmt per Default nur den heutigen Batch, das ist sauber.
6. Bestätigung an Christine: Artikel live + in Index-Queue + **Pinterest-CSV liegt auf dem Desktop, bitte hochladen**.

### Sitemap & Google Search Console — AUTOMATISCH (nicht manuell pflegen!)
- **@astrojs/sitemap** ist im `astro.config.mjs` eingebaut (seit 2026-04-17).
- Bei jedem `npx astro build` wird `sitemap-index.xml` + `sitemap-0.xml` automatisch neu generiert mit ALLEN Seiten.
- `robots.txt` verweist auf `https://zercy.app/sitemap-index.xml`.
- **Nie wieder eine manuelle `public/sitemap.xml` anlegen** — die alte wurde am 2026-04-17 gelöscht, weil sie nur 11 von 75 Seiten enthielt.
- Google Search Console ist eingerichtet (Property: zercy.app). Die Sitemap dort ist submitted.
- Google findet neue Seiten automatisch via `lastmod` in der Sitemap (typisch 1–3 Tage nach Deploy). Kein manueller Ping nötig (deprecated seit 2023).
