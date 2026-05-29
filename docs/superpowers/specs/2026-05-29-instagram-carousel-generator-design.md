# Instagram/Facebook Carousel-Generator — Design

- **Datum:** 2026-05-29
- **Status:** Design genehmigt, Implementierungsplan ausstehend
- **Projekt:** zercy-landing
- **Baut auf:** der Doku-Reels-Pipeline (`scripts/video/`, `remotion/`) — maximale Wiederverwendung

## Ziel

Aus einem bestehenden Blog-Artikel automatisch ein fertiges **Instagram/Facebook-Carousel** erzeugen: 6–8 Slides als PNG (4:5) plus eine englische Caption, bereit für den Bulk-Import in einen Scheduler (Publer/Metricool). Carousels sind das tägliche Basis-Format; Reels (bestehende Pipeline) kommen für Top-Seiten dazu.

Aufruf: `node scripts/generate-carousel.mjs <city-slug>` → `social-output/<slug>/slide-01.png … slide-0N.png` + `caption.txt`.

## Nicht-Ziele (YAGNI)

- Kein Auto-Posting. Output sind Dateien für den Scheduler. Posten macht Publer/Metricool.
- Nur **Englisch** (eine kohärente IG-Sprache). Kein DE/ES für Social.
- Keine Animation/Video (das ist die Reels-Pipeline).
- Keine eigene Scheduler-Logik.

## Sprache & Stimme

- Caption + Slide-Text auf **Englisch**, im Zercy-Ton: direkt, „you", kurze Sätze, keine Em-Dashes, keine Floskeln.

## Slide-Struktur

Generisch, funktioniert für City-Guides UND Themen-Artikel. Aus dem Artikel via Claude befüllt:

| Slide | Typ | Inhalt |
|---|---|---|
| 1 | `cover` | Titel/Hook (z.B. „Where to actually stay in Paris") + „SWIPE →" + Logo |
| 2…N-1 | `content` | je ein Viertel/Kernpunkt: Heading + 1 knackige Zeile + „best for: …" |
| N | `cta` | „Save this for your trip 📌" + „Full guide → link in bio" + Logo |

Anzahl content-Slides: 4–6 → gesamt **6–8 Slides**.

## Visueller Stil (Hybrid)

Pro Slide: Pexels-Hochformat-Foto + cineastischer Grade (gleiche `Grade`-Komponente wie die Reels) + lesbares Text-Panel im Marken-Stil:
- Schrift: Plus Jakarta Sans (Headings 700/800), Inter (Body).
- Farben: Navy `#0F172A` / Weiß-Text, Akzent Ocean-Blue `#0EA5E9` bzw. Sunset-Orange `#F97316`.
- Lesbarkeits-Scrim (Gradient) unter dem Text.
- Footer: kleines Zercy-Logo + Slide-Zähler „2/7".
- Cover bolder (große Headline + SWIPE-Hinweis); content kompakter (Heading + Zeile + best-for); CTA mit Save-Hinweis.
- Format: **1080×1350 (4:5)**.

## Daten-Vertrag — Carousel-Beat-Sheet

Ausgabe von `carousel-beatsheet.mjs` (Claude), validiert:
```js
{
  topic: "paris",                       // = city-slug, fuer Bild-/Ordnernamen
  cover:  { title: "Where to actually stay in Paris", hook: "5 cities in one. Pick the right one.", query: "paris rooftops skyline" },
  slides: [                              // 4-6 content-Slides
    { heading: "Le Marais", line: "For people who never want to sleep.", bestFor: "nightlife, boutique hotels", query: "le marais paris street night" },
    ...
  ],
  cta:    { headline: "Save this for your trip", sub: "Full guide -> link in bio", query: "paris seine sunrise" },
  caption: "<komplette EN IG/FB-Caption: Hook + Wert + soft CTA + keywords + wenige Hashtags>"
}
```
Invariante: `slides.length` zwischen 4 und 6; jedes Slide-Objekt hat `heading`, `line`, `query` (bestFor optional); cover/cta haben `query`.

## Architektur (Wiederverwendung)

```
scripts/social/carousel-beatsheet.mjs   # Claude -> Carousel-Beat-Sheet + Caption (EN). parseCarouselSheet (rein, testbar) + generateCarouselSheet (Claude)
scripts/social/carousel-props.mjs       # buildSlideProps: Beat-Sheet + Bildpfade -> Array von Slide-Props (rein, testbar)
scripts/generate-carousel.mjs           # Orchestrator
remotion/src/Carousel.tsx               # Remotion-Komposition: rendert EINEN Slide (kind cover|content|cta) 1080x1350
remotion/src/components/carousel/*      # CarouselCover, CarouselContent, CarouselCta (+ Wiederverwendung von Grade)
```
- **Stills:** wiederverwendet `scripts/video/stills.mjs` (`fetchStill`, Pexels) → Bilder nach `remotion/public/renders-social/<slug>/imgN.jpg`, Props via `staticFile`.
- **Rendering:** pro Slide ein `npx remotion still remotion/src/index-carousel.ts Carousel <out.png> --props=<file>` (Remotion „still" rendert ein Standbild). Eigener Entry/Root (`index-carousel.ts`) oder zusätzliche Composition im bestehenden Root.
- **Caption:** kommt aus dem Beat-Sheet → `caption.txt` im Output-Ordner.
- **Output:** `social-output/<slug>/slide-01.png … slide-0N.png` + `caption.txt`.

## Daten-/Ablauffluss

```
Blog-Artikel (EN: src/content/blogen/where-to-stay-<slug>.md, sonst DE/ES als Kontext)
  -> carousel-beatsheet (Claude)  : Cover + content-Slides + CTA + Caption (EN, JSON)
  -> stills (Pexels)              : 1 Hochformat-Foto pro Slide -> public/renders-social/<slug>/imgN.jpg
  -> carousel-props               : Slide-Props (kind, imageSrc, Texte, index/total)
  -> Remotion still (pro Slide)   : slide-01.png … slide-0N.png (1080x1350, Foto+Grade+Marken-Typo)
  -> caption.txt
  -> social-output/<slug>/
```

## Fehlerbehandlung

- Kein EN-Artikel zum Slug → klarer Fehler, Abbruch.
- Zu wenige Stills für einen Slide → breitere Pexels-Suche, dann geteilter Stadt-Pool (wie Reels-Pipeline).
- Idempotenz: bereits geholte Stills/erzeugte PNGs via `existsSync` überspringen.

## Test / Verifikation

- Unit-Tests (node:test) für die reinen Funktionen: `parseCarouselSheet` (Validierung/Invarianten), `buildSlideProps` (korrektes Mapping cover/content/cta + index/total).
- Smoke: `node scripts/generate-carousel.mjs paris` → 6–8 PNGs + caption.txt; **visuelle Prüfung per Headless-Screenshot/Bildansicht** (Cover-Wirkung, Lesbarkeit, Grade, Slide-Zähler, Marken-Look).
- Remotion-Composition zuerst mit Default-Props rendern (Compile-Check), bevor echte Daten.

## Infra

- `social-output/` und `remotion/public/renders-social/` in `.gitignore` und `.vercelignore` (kein Deploy-/Repo-Müll, analog `video-output`/`renders`).
- Keine neuen Vercel-Functions, keine Änderung am Astro-Build.

## Entscheidungs-Log (2026-05-29)
1. Sprache: **nur Englisch**.
2. Look: **Hybrid** (Foto + Grade + lesbare Marken-Typo).
3. Format: **1080×1350 (4:5)**.
4. Posten: extern via Scheduler (Publer/Metricool), nicht selbst gebaut.
5. Maximale Wiederverwendung der Reels-Pipeline (Beat-Sheet-Muster, stills.mjs, Remotion, Grade).
