# Documentary Reels Pipeline — Design

- **Datum:** 2026-05-28
- **Status:** Design genehmigt, Implementierungsplan ausstehend
- **Projekt:** zercy-landing
- **Baut auf:** `scripts/generate-video.mjs` (bestehende Video-Pipeline)

## Ziel

Aus einem bestehenden Blog-Artikel (z.B. `wo-uebernachten-paris`) automatisch eine 35 bis 40 Sekunden lange Mikro-Doku im Hochformat erzeugen, je eine Version pro Sprache (DE/EN/ES), bereit für Instagram Reels, Facebook und später TikTok. Der Look soll bewusst gegen den Strich des typischen Reise-Listicles gehen: ruhig, filmisch, dokumentarisch, mit umgekehrter Dramaturgie.

Kernidee: Wir verkaufen nicht Hotels, sondern in welche Version einer Stadt du morgens aufwachst. Wo du schläfst, entscheidet, welche Stadt du bekommst.

## Nicht-Ziele (YAGNI)

- Kein Auto-Posting in diesem Projekt. Die Pipeline liefert fertige MP4-Dateien. Das Posten (Publer oder manuell) ist ein separater, späterer Schritt.
- Keine KI-Videogenerierung als Basis-Motor. Optional später für einen einzelnen Hero-Shot, nicht jetzt.
- Keine neue Sprachunterstützung über DE/EN/ES hinaus.
- Kein ElevenLabs. Wir bleiben bei Edge TTS (gratis).

## Das Format: Dramaturgie-Template

Feste Struktur, die Claude pro Artikel mit Inhalt füllt. "Von hinten reinkommen" heißt: der Cold Open zeigt eine Konsequenz oder ein Rätsel, das erst der Reveal auflöst.

| Beat | Sekunden | Inhalt | On-Screen |
|---|---|---|---|
| Cold Open | 0 bis 3 | Atmo plus eine rätselhafte Zeile, von hinten gedacht | nur Ton, evtl. Schwarzbild |
| These | 3 bis 10 | "Paris ist nicht eine Stadt. Es sind fünf." | Kontrast-Stills |
| Körper | 10 bis 30 | 3 bis 4 Viertel als Charaktere, je ein Stimmungssatz | Chyron, z.B. `LE MARAIS · 4e` |
| Reveal | 30 bis 38 | die eine Antwort, bindet an den Cold Open zurück | Endcard plus "Link in Bio" |

Tonregeln für den Text (gleichzeitig die Pausen-Steuerung für Edge TTS):
- Kurze Sätze, oft nur eine Aussage. Punkte erzeugen bei Edge TTS hörbare Pausen.
- Präsens, "du", sinnlich, sparsam. Kein Hype, keine Floskeln.
- Keine Em-Dashes (Projekt-Stilregel).

## Architektur

Wir behalten das Skelett von `scripts/generate-video.mjs` und tauschen die Render-Seele aus.

**Bleibt unverändert:**
- Artikel-Einlesen über die Slugs `wo-uebernachten-` / `where-to-stay-` / `donde-alojarse-` aus `src/content/blog`, `blogen`, `bloges`.
- Drei-Sprachen-Output `slug-de.mp4`, `slug-en.mp4`, `slug-es.mp4` in `video-output/`.
- Keys aus `~/.zercy-analytics/video-api-keys.json` (Pexels, Anthropic).
- Edge TTS für Voiceover plus Subtitle-Timing (`--write-subtitles`).
- Caching von Zwischenschritten in `video-temp/`.

**Wird ersetzt oder neu:**

| Baustein | Jetzt | Neu |
|---|---|---|
| Script-Generierung | Listicle (hook/fact1-3/cta), Claude Haiku | Doku-Beat-Sheet (Cold Open/These/Viertel/Reveal), Claude |
| Bildquelle | Pexels-Videos | Pexels/Unsplash-**Stills** (Hochformat, hochauflösend) |
| Renderer | ffmpeg drawtext + SRT burn-in | **Remotion** (React-Video): Ken Burns, Doku-Typo, Chyrons, ruhige Untertitel, Grade |
| Musik | keine | kleine lizenzfreie Bibliothek, ein wiederkehrendes Motiv, unter die Stimme geduckt |

Begründung Remotion: Es gibt programmatische, pixelgenaue Kontrolle über Typografie, Chyrons, Untertitel-Timing, Übergänge und einen konsistenten Grade. Damit lässt sich der Doku-Look deterministisch und voll skriptbar erzeugen, was reines ffmpeg-drawtext nicht sauber hergibt. Ein Bild-Master, drei Audiospuren: das Bildmaterial und die Animation bleiben pro Stadt gleich, nur Voiceover, Untertitel und Endcard wechseln pro Sprache.

## Komponenten

Jede Komponente hat einen Zweck, eine klare Schnittstelle und benannte Abhängigkeiten.

### 1. `beatsheet` (Script-Generierung)
- **Zweck:** Aus den drei Artikel-Exzerpten ein strukturiertes Doku-Beat-Sheet erzeugen.
- **Eingabe:** Artikel-Texte DE/EN/ES plus Stadtname.
- **Ausgabe:** JSON pro Sprache: `coldOpen`, `thesis`, `neighborhoods[] {name, label, line, query}`, `reveal`, plus pro Beat ein Bild-Suchbegriff (`query`) und der Chyron-Text (`label`).
- **Abhängigkeit:** Anthropic SDK (bereits vorhanden).

### 2. `stills` (Bildbeschaffung)
- **Zweck:** Pro Beat hochauflösende Hochformat-Stills holen und filtern.
- **Eingabe:** Bild-Suchbegriffe aus dem Beat-Sheet.
- **Ausgabe:** lokale Bilddateien in `video-temp/`, gemappt auf Beats.
- **Abhängigkeit:** Pexels API (vorhanden), optional Unsplash als Fallback. Filter: Orientierung Hochformat, Mindestauflösung.

### 3. `voice` (Voiceover plus Untertitel-Timing)
- **Zweck:** Pro Sprache eine Audiospur plus zeitgenaue Untertitel erzeugen.
- **Eingabe:** zusammengesetzter Narrationstext pro Sprache.
- **Ausgabe:** `mp3` plus `srt`/`vtt` mit Wort-Timings.
- **Abhängigkeit:** Edge TTS CLI. Tuning: langsameres `--rate`, ein ruhiger Erzähler-Voice-Kandidat pro Sprache (z.B. de-DE-ConradNeural, en-US-GuyNeural, es-ES-AlvaroNeural, im Plan final auswählen).

### 4. `compose` (Remotion-Render)
- **Zweck:** Bilder, Bewegung, Typografie, Untertitel, Stimme, Musik und Grade zu einem 1080x1920-Video montieren.
- **Eingabe:** Beat-Sheet, Still-Pfade, Audiospur, Untertitel-Cues, Musik-Track-Auswahl, Sprache.
- **Ausgabe:** `slug-<lang>.mp4`.
- **Abhängigkeit:** Remotion (neue Dev-Dependency), Edge-TTS-Timing für Untertitel-Sync.

### 5. `music` (Audiobett)
- **Zweck:** Einen passenden lizenzfreien Track plus Atmo auswählen und unter die Stimme ducken.
- **Eingabe:** Stimmung/Beat-Anzahl.
- **Ausgabe:** Audio-Referenz für `compose`.
- **Abhängigkeit:** kleine kuratierte Bibliothek im Repo (Pixabay/Uppbeat, lizenzfrei). Copyright-sicher für IG/FB.

### Orchestrierung
`scripts/generate-video.mjs` ruft die Komponenten in der Reihenfolge beatsheet → stills → voice → compose auf, einmal für das Bild-Master, dann pro Sprache für Stimme/Untertitel/Endcard. Batch-Modus über die bestehende Queue bleibt erhalten.

## Datenfluss

```
Blog-Artikel (DE/EN/ES Markdown)
   -> beatsheet (Claude)   : Beat-Sheet JSON pro Sprache (Narration + Chyron + Bild-Query)
   -> stills (Pexels)      : Hochformat-Stills pro Beat, gecacht
   -> voice (Edge TTS)     : mp3 + srt mit Wort-Timing, pro Sprache
   -> music                : lizenzfreier Track + Atmo
   -> compose (Remotion)   : Ken Burns + Grade + Korn + Typo/Chyrons + Untertitel + Audio
   -> video-output/slug-de.mp4, slug-en.mp4, slug-es.mp4
```

## Look Bible (Signatur, gilt für jedes Video)

- **Stimme:** Edge TTS, langsames Tempo, ruhiger Erzähler-Voice, Pausen durch kurze Sätze.
- **Untertitel:** eine ruhige Zeile, klare Type, plus Viertel-Chyron. Kein Karaoke, keine springenden Wörter.
- **Grade:** ein fester cineastischer Look plus Film-Korn über allem, damit Stockmaterial gewollt wirkt.
- **Schnitt:** 2 bis 3 Sekunden pro Bild, langsame Push-ins und Parallax. Die Ruhe ist das Statement.
- **Sound:** Atmo zuerst, ein wiederkehrendes Motiv, bewusste Stille im Cold Open.

## Fehlerbehandlung

- Kein Artikel zum Slug gefunden: klarer Fehler, Abbruch (wie bisher).
- Zu wenige Stills für einen Beat: Fallback auf breitere Suche, dann auf einen geteilten Stadt-Pool.
- Edge TTS oder Remotion-Render schlägt fehl: Zwischenstände in `video-temp/` bleiben erhalten, Lauf ist idempotent und überspringt fertige Outputs.
- Remotion-Render-Länge richtet sich nach der Audiodauer der jeweiligen Sprache.

## Test / Verifikation

- Ein Smoke-Run mit einer Stadt (Paris), Sichtprüfung aller drei MP4s auf: Cold-Open-Wirkung, Chyron-Korrektheit, Untertitel-Sync, Grade-Konsistenz, Musik-Ducking.
- Prüfen, dass alle drei Sprachversionen dasselbe Bild-Master nutzen.
- Längen-Check: 35 bis 40 Sekunden pro Video.

## Offene Punkte / Risiken

- Still-Relevanz pro Viertel: generische Stadt-Stills statt spezifischer Straßen. Mildernd: Suchbegriffe pro Viertel, Grade vereinheitlicht.
- Remotion-Setup im Astro-Repo: separates Verzeichnis (`remotion/` oder `video/`), eigene Dependencies, damit der Astro-Build unberührt bleibt.
- Edge-TTS-Erzählerstimme klingt evtl. weniger filmisch als gewünscht. Upgrade-Pfad auf ElevenLabs bleibt offen, ohne die Architektur zu ändern.

## Entscheidungs-Log (2026-05-28)

1. **Bild-Engine:** Motion-Stills (Ken-Burns-Doku).
2. **Bildquelle:** Stock-Stills primär (Pexels/Unsplash).
3. **Sprachen:** DE + EN + ES, ein Bild-Master plus drei Spuren.
4. **Musik:** kleine lizenzfreie Bibliothek mit wiederkehrendem Motiv.
5. **Stimme:** Edge TTS behalten (gratis), Essay-Ton über Voice-Wahl, Tempo und kurze Sätze.
