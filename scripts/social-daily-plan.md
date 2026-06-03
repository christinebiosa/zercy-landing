# Zercy Daily Social Plan

**Trigger:** Christine sagt **„daily"** (1×/Tag) → Claude macht alle 3 Kanäle + aktualisiert diese Datei.

## Kadenz (Stand 2026-05-31, neue Konten — später hochfahren)
- **Instagram:** 2/Tag (**REEL** = 9:16-Video, seit 2026-06-01 statt Carousel — mehr Reichweite) — **Claude postet** (Meta API, automatisch)
- **Facebook:** 2/Tag (Reel) — **Claude postet** (Meta API, automatisch)
- **TikTok:** 2/Tag (Produkt-Reel) — **Claude pusht Entwurf + gibt Caption**, **Christine postet** (bis Audit durch → dann postet Claude auch hier automatisch)

## Wer macht was bei „daily"
1. Claude postet 2 IG + 2 FB (nächste 2 aus IG/FB-Queue) → automatisch erledigt.
2. Claude pusht 2 TikTok-Entwürfe in Christines Postfach + gibt die 2 Captions.
3. Christine postet die 2 TikToks (Sound + Caption + posten).
4. Claude hakt hier ab + zeigt das Programm für morgen.

## IG + FB Queue (City-Guides: Carousel + Reel gebaut + deployed)
- [x] prague — 2026-05-31
- [x] edinburgh — 2026-05-31
- [x] new-york — 2026-06-01 (IG-Reel + FB-Reel)
- [x] london — 2026-06-01 (IG-Reel + FB-Reel)
- [ ] punta-cana
- [ ] amalfi
- [ ] manila
- [ ] galway
- [ ] izmir
→ Wenn knapp: Produkt-Medien deployen → 10 Produkt-Roundups als Nachschub (haben Carousel+Reel, müssen nur auf zercy.app deployed werden für die Meta-API).

## TikTok Queue (Produkt-Reels, als Entwurf pushen — Limit ~4 pending)
- [x] luggage-trackers — gepostet 2026-05-31
- [x] drones — gepostet 2026-05-31
- [x] cameras — gepostet 2026-05-31
- [x] powerbanks — gepostet 2026-05-31
- [ ] merino — im Postfach
- [ ] jackets — im Postfach
- [ ] shoes — im Postfach
- [ ] dresses — im Postfach
- [ ] neck-pillows — im Postfach (2026-05-31)
- [ ] weekender — im Postfach (2026-05-31)
→ ALLE 10 gepusht. Wenn alle gepostet: nächster Reel-Batch (Komfort/Gear/Kleidung-Artikel haben alle Slides; neu rendern + pushen). Optional: City-Guides auch als TikTok (Carousel-Generator kann beides).

## Captions → Google Doc (ab 2026-06-02)
Christine kopiert Captions vom Handy in WhatsApp. Statt sie in den Chat zu schreiben (nerviges Formatieren): **Captions ins Google Doc** „Zercy TikTok Captions" (ID `1FUWgeWezIdTeSxwZVQW4_RaPZpshyA6NDUUbvHOiCC8`, christine.bork@biosacr.com) anhängen — jede Caption als EINE Zeile (Dreifachklick markiert den Block). Tool: `mcp__google-workspace__batch_update_doc` mit `end_of_segment=true`. Format: `— STADT —` Zeile, dann Caption-Zeile (ein Emoji + 5 Hashtags). Neue immer unten anhängen, nicht überschreiben.

## Regeln (Reels)
- **MAX 5 Hashtags** pro Caption (TikTok löscht mehr). Hart begrenzt in carousel-beatsheet.mjs.
- Captions IMMER als ein durchgehender Block geben (kein Zeilenumbruch, keine Doppel-Leerzeichen) — Christine kopiert direkt.
- IG/FB = slideshow-music.mp4 (Musik + Credit). TikTok = stumme slideshow-facebook.mp4 (Trending-Sound manuell).

## Bereit für morgen (TikTok-Entwürfe im Postfach)
- [ ] madrid — im Postfach (2026-06-01), 5 Hashtags
- [ ] bali — im Postfach (2026-06-01), 5 Hashtags

## Log
- 2026-06-01: lisbon + amsterdam (clean, ohne SWIPE) gepostet ✓. SWIPE aus allen Reels entfernt, Musik (CC BY) für IG/FB. madrid + bali neu gebaut + ins TikTok-Postfach für morgen.
- 2026-05-30: IG+FB = rome (+ lisbon, amsterdam). TikTok-Pipeline gebaut.
- 2026-05-31 DAILY RUN ✅: IG+FB = prague + edinburgh (je Carousel+Reel, Claude gepostet). TikTok = neck-pillows + weekender als Entwurf gepusht → damit alle 10 Reels durch. Christine postet TikTok semi-auto. (lisbon/amsterdam waren gestern.)
