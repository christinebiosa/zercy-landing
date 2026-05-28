# Documentary Reels Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aus einem bestehenden Blog-Artikel automatisch je eine 35-bis-40-Sekunden-Mikro-Doku im Hochformat pro Sprache (DE/EN/ES) erzeugen, mit Motion-Stills, Doku-Dramaturgie, ruhigen Untertiteln und lizenzfreier Musik.

**Architecture:** Das bestehende Skelett von `scripts/generate-video.mjs` (Artikel lesen, 3 Sprachen, Edge TTS, Output) bleibt. Die Logik wird in kleine, einzeln testbare Module unter `scripts/video/` zerlegt. Das Rendering wechselt von ffmpeg-drawtext auf ein separates Remotion-Projekt unter `remotion/`, das deterministisch Ken Burns, Typografie, Chyrons, Untertitel und Grade erzeugt.

**Tech Stack:** Node 26 (ESM `.mjs`), `node:test` als Test-Runner, Anthropic SDK, Pexels API, Edge TTS CLI, Remotion v4 (React/TypeScript), ffmpeg (nur indirekt über Remotion).

---

## Dateistruktur

```
scripts/
  generate-video.mjs          # Orchestrator (umgeschrieben, ruft Module)
  video/
    srt.mjs                   # parseSrt, groupCues  (reine Funktionen)
    srt.test.mjs
    beatsheet.mjs             # parseBeatSheet (Validierung) + generateBeatSheet (Claude)
    beatsheet.test.mjs
    stills.mjs                # selectStill (rein) + fetchStill (Integration)
    stills.test.mjs
    voice.mjs                 # buildNarration (rein) + synthVoice (edge-tts)
    voice.test.mjs
    music.mjs                 # pickTrack (rein, deterministisch)
    music.test.mjs
    props.mjs                 # buildProps (rein, Kern-Mapping)
    props.test.mjs
remotion/
  package.json                # eigenes Remotion-Projekt, eigene Dependencies
  tsconfig.json
  remotion.config.ts
  src/
    index.ts                  # registerRoot
    Root.tsx                  # Composition-Definition
    DocReel.tsx               # die Komposition
    components/
      KenBurnsImage.tsx
      Chyron.tsx
      Subtitles.tsx
      Grade.tsx
      EndCard.tsx
  public/
    music/                    # lizenzfreie Tracks (.mp3)
    renders/                  # vom Orchestrator befüllte Asset-Ordner pro Lauf
```

### Daten-Verträge (durchgängig konsistent)

**Beat-Sheet** (Ausgabe von `generateBeatSheet`, Eingabe für alles Weitere):
```js
{
  cityName: "Paris",
  beats: [
    { kind: "coldOpen",     query: "Paris empty street dawn",        label: null },
    { kind: "thesis",       query: "Paris rooftops skyline morning", label: null },
    { kind: "neighborhood", query: "Le Marais Paris night street",   label: "LE MARAIS · 4e" },
    { kind: "neighborhood", query: "Saint-Germain Paris cafe",       label: "SAINT-GERMAIN · 6e" },
    { kind: "reveal",       query: "Paris seine bridge sunrise",     label: null }
  ],
  narration: {
    de: ["...", "...", "...", "...", "..."],  // genau beats.length Zeilen, gleiche Reihenfolge
    en: ["...", "...", "...", "...", "..."],
    es: ["...", "...", "...", "...", "..."]
  }
}
```
Invariante: `narration.de.length === narration.en.length === narration.es.length === beats.length`.

**Cue** (aus `parseSrt`/`groupCues`): `{ startMs: number, endMs: number, text: string }`

**Props** (aus `buildProps`, Eingabe für Remotion):
```js
{
  width: 1080, height: 1920, fps: 30,
  durationInFrames: number,
  lang: "de",
  audioSrc: "renders/paris-de/voice.mp3",   // staticFile-relativ
  musicSrc: "music/quiet-motif-01.mp3",
  beats: [ { kind, imageSrc, label, startFrame, endFrame } ],
  subtitles: [ { startFrame, endFrame, text } ]
}
```

---

## Task 1: SRT-Parser

**Files:**
- Create: `scripts/video/srt.mjs`
- Test: `scripts/video/srt.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// scripts/video/srt.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSrt } from './srt.mjs';

const SAMPLE = `1
00:00:00,063 --> 00:00:00,463
Es

2
00:00:00,463 --> 00:00:00,800
ist

3
00:00:00,800 --> 00:00:01,500
sechs.
`;

test('parseSrt liest Cues mit ms-Zeitstempeln', () => {
  const cues = parseSrt(SAMPLE);
  assert.equal(cues.length, 3);
  assert.deepEqual(cues[0], { startMs: 63, endMs: 463, text: 'Es' });
  assert.deepEqual(cues[2], { startMs: 800, endMs: 1500, text: 'sechs.' });
});

test('parseSrt ignoriert leere Eingabe', () => {
  assert.deepEqual(parseSrt(''), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/video/srt.test.mjs`
Expected: FAIL mit `Cannot find module './srt.mjs'` bzw. `parseSrt is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/video/srt.mjs

function tsToMs(ts) {
  // Format HH:MM:SS,mmm
  const m = ts.trim().match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!m) return null;
  const [, h, min, s, ms] = m;
  return ((+h * 60 + +min) * 60 + +s) * 1000 + +ms;
}

export function parseSrt(text) {
  if (!text || !text.trim()) return [];
  const blocks = text.replace(/\r/g, '').trim().split(/\n\n+/);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const timeLine = lines.find(l => l.includes('-->'));
    if (!timeLine) continue;
    const [a, b] = timeLine.split('-->');
    const startMs = tsToMs(a);
    const endMs = tsToMs(b);
    if (startMs == null || endMs == null) continue;
    const textLines = lines.slice(lines.indexOf(timeLine) + 1).join(' ').trim();
    if (textLines) cues.push({ startMs, endMs, text: textLines });
  }
  return cues;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/video/srt.test.mjs`
Expected: PASS (2 Tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/video/srt.mjs scripts/video/srt.test.mjs
git commit -m "feat(video): SRT-Parser fuer Edge-TTS-Untertitel"
```

---

## Task 2: Untertitel zu ruhigen Phrasen gruppieren

**Files:**
- Modify: `scripts/video/srt.mjs`
- Test: `scripts/video/srt.test.mjs`

Edge TTS liefert wortweise Cues (Karaoke). Wir wollen ruhige, kurze Zeilen. `groupCues` fasst aufeinanderfolgende Wörter zu Phrasen zusammen, bis ein Satzende erreicht ist oder ein Maximum an Wörtern/Dauer überschritten wird.

- [ ] **Step 1: Write the failing test**

```js
// am Ende von scripts/video/srt.test.mjs ergaenzen
import { groupCues } from './srt.mjs';

test('groupCues fasst bis zum Satzende zusammen', () => {
  const cues = [
    { startMs: 0,   endMs: 300,  text: 'Es' },
    { startMs: 300, endMs: 600,  text: 'ist' },
    { startMs: 600, endMs: 1000, text: 'sechs.' },
    { startMs: 1000,endMs: 1300, text: 'Du' },
    { startMs: 1300,endMs: 1700, text: 'wachst' },
    { startMs: 1700,endMs: 2100, text: 'auf.' },
  ];
  const phrases = groupCues(cues, { maxWords: 8, maxMs: 5000 });
  assert.equal(phrases.length, 2);
  assert.deepEqual(phrases[0], { startMs: 0, endMs: 1000, text: 'Es ist sechs.' });
  assert.deepEqual(phrases[1], { startMs: 1000, endMs: 2100, text: 'Du wachst auf.' });
});

test('groupCues bricht bei maxWords um', () => {
  const cues = Array.from({ length: 6 }, (_, i) => ({
    startMs: i * 300, endMs: i * 300 + 300, text: `w${i}`,
  }));
  const phrases = groupCues(cues, { maxWords: 3, maxMs: 5000 });
  assert.equal(phrases.length, 2);
  assert.equal(phrases[0].text, 'w0 w1 w2');
  assert.equal(phrases[1].text, 'w3 w4 w5');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/video/srt.test.mjs`
Expected: FAIL mit `groupCues is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/video/srt.mjs ergaenzen
export function groupCues(cues, { maxWords = 6, maxMs = 2800 } = {}) {
  const out = [];
  let cur = null;
  let words = 0;
  for (const c of cues) {
    if (!cur) {
      cur = { startMs: c.startMs, endMs: c.endMs, text: c.text };
      words = 1;
    } else {
      cur.text += ' ' + c.text;
      cur.endMs = c.endMs;
      words++;
    }
    const endsSentence = /[.!?…]$/.test(c.text);
    const tooLong = words >= maxWords || (cur.endMs - cur.startMs) >= maxMs;
    if (endsSentence || tooLong) {
      out.push(cur);
      cur = null;
      words = 0;
    }
  }
  if (cur) out.push(cur);
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/video/srt.test.mjs`
Expected: PASS (4 Tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/video/srt.mjs scripts/video/srt.test.mjs
git commit -m "feat(video): Untertitel-Cues zu ruhigen Phrasen gruppieren"
```

---

## Task 3: Beat-Sheet-Validierung

**Files:**
- Create: `scripts/video/beatsheet.mjs`
- Test: `scripts/video/beatsheet.test.mjs`

`parseBeatSheet` nimmt den rohen Claude-Antworttext, extrahiert das JSON und validiert die Invarianten. Wirft bei Verletzung einen klaren Fehler.

- [ ] **Step 1: Write the failing test**

```js
// scripts/video/beatsheet.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBeatSheet } from './beatsheet.mjs';

const VALID = JSON.stringify({
  cityName: 'Paris',
  beats: [
    { kind: 'coldOpen', query: 'paris dawn', label: null },
    { kind: 'thesis', query: 'paris skyline', label: null },
    { kind: 'neighborhood', query: 'le marais', label: 'LE MARAIS · 4e' },
    { kind: 'reveal', query: 'seine sunrise', label: null },
  ],
  narration: {
    de: ['a', 'b', 'c', 'd'],
    en: ['a', 'b', 'c', 'd'],
    es: ['a', 'b', 'c', 'd'],
  },
});

test('parseBeatSheet akzeptiert gueltiges JSON mit Vortext', () => {
  const bs = parseBeatSheet('Hier dein Beat-Sheet:\n' + VALID);
  assert.equal(bs.cityName, 'Paris');
  assert.equal(bs.beats.length, 4);
  assert.equal(bs.narration.de.length, 4);
});

test('parseBeatSheet wirft bei ungleicher Zeilenanzahl', () => {
  const broken = JSON.parse(VALID);
  broken.narration.es = ['a', 'b'];
  assert.throws(() => parseBeatSheet(JSON.stringify(broken)), /narration\.es/);
});

test('parseBeatSheet wirft ohne JSON', () => {
  assert.throws(() => parseBeatSheet('kein json hier'), /kein JSON/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/video/beatsheet.test.mjs`
Expected: FAIL mit `parseBeatSheet is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/video/beatsheet.mjs
const LANGS = ['de', 'en', 'es'];

export function parseBeatSheet(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Beat-Sheet enthielt kein JSON');
  let obj;
  try {
    obj = JSON.parse(match[0]);
  } catch (e) {
    throw new Error('Beat-Sheet-JSON nicht parsebar: ' + e.message);
  }
  if (!obj.cityName) throw new Error('Beat-Sheet ohne cityName');
  if (!Array.isArray(obj.beats) || obj.beats.length === 0) {
    throw new Error('Beat-Sheet ohne beats');
  }
  for (const [i, b] of obj.beats.entries()) {
    if (!b.kind || !b.query) throw new Error(`Beat ${i} ohne kind/query`);
    if (!('label' in b)) b.label = null;
  }
  for (const lang of LANGS) {
    const lines = obj.narration?.[lang];
    if (!Array.isArray(lines)) throw new Error(`narration.${lang} fehlt`);
    if (lines.length !== obj.beats.length) {
      throw new Error(`narration.${lang} hat ${lines.length} Zeilen, erwartet ${obj.beats.length}`);
    }
  }
  return obj;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/video/beatsheet.test.mjs`
Expected: PASS (3 Tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/video/beatsheet.mjs scripts/video/beatsheet.test.mjs
git commit -m "feat(video): Beat-Sheet-Validierung mit Invarianten"
```

---

## Task 4: Beat-Sheet via Claude generieren

**Files:**
- Modify: `scripts/video/beatsheet.mjs`

Dünne Integrationsschicht: ruft Claude mit dem Doku-Dramaturgie-Prompt, gibt das Ergebnis an `parseBeatSheet`. Kein Unit-Test (echter API-Call), wird im Smoke-Run (Task 11) verifiziert.

- [ ] **Step 1: Implementierung ergänzen**

```js
// scripts/video/beatsheet.mjs ergaenzen
import Anthropic from '@anthropic-ai/sdk';

const DOC_PROMPT = (cityName, deBody, enBody, esBody) => `Du schreibst das Drehbuch fuer eine 35-bis-40-Sekunden-Mikro-Doku ueber "Wo uebernachten in ${cityName}".

Stadt: ${cityName}

Auszuege der Artikel:
DE: ${deBody.slice(0, 800)}
EN: ${enBody.slice(0, 800)}
ES: ${esBody.slice(0, 800)}

Dramaturgie (Pflicht, "von hinten reinkommen"):
- coldOpen: eine raetselhafte, sinnliche Zeile, die erst der Reveal aufloest. Kein Hallo, keine Stadt nennen.
- thesis: die Idee, dass die Stadt mehrere Staedte ist und der Stadtteil entscheidet.
- neighborhood (3 bis 4 Stueck): je ein Viertel als Charakter, EIN Stimmungssatz, KEINE Hotelnamen, KEINE Preise.
- reveal: die eine Antwort, bindet an den coldOpen zurueck.

Ton: kurze Saetze, oft nur eine Aussage. Praesens, "du", sinnlich, sparsam. Keine Floskeln. KEINE Gedankenstriche (em-dash).

Antworte NUR mit JSON in genau dieser Struktur:
{
  "cityName": "${cityName}",
  "beats": [
    { "kind": "coldOpen", "query": "englischer Bildsuchbegriff", "label": null },
    { "kind": "thesis", "query": "...", "label": null },
    { "kind": "neighborhood", "query": "...", "label": "VIERTEL · BEZIRK" },
    { "kind": "reveal", "query": "...", "label": null }
  ],
  "narration": {
    "de": ["eine Zeile pro Beat, gleiche Reihenfolge"],
    "en": ["one line per beat"],
    "es": ["una linea por beat"]
  }
}
Wichtig: narration.de, narration.en und narration.es haben GENAU so viele Zeilen wie beats Eintraege.
"query" ist ein konkreter englischer Bildsuchbegriff fuer ein Hochformat-Foto. "label" ist der Chyron-Text, nur bei neighborhood gesetzt.`;

export async function generateBeatSheet({ cityName, deBody, enBody, esBody, apiKey }) {
  const anthropic = new Anthropic({ apiKey });
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: DOC_PROMPT(cityName, deBody, enBody, esBody) }],
  });
  return parseBeatSheet(msg.content[0].text);
}
```

- [ ] **Step 2: Syntax-Check**

Run: `node --check scripts/video/beatsheet.mjs`
Expected: kein Output, Exit 0.

- [ ] **Step 3: Bestehende Tests laufen weiter**

Run: `node --test scripts/video/beatsheet.test.mjs`
Expected: PASS (3 Tests, unveraendert).

- [ ] **Step 4: Commit**

```bash
git add scripts/video/beatsheet.mjs
git commit -m "feat(video): Doku-Beat-Sheet via Claude generieren"
```

---

## Task 5: Stills auswählen und holen

**Files:**
- Create: `scripts/video/stills.mjs`
- Test: `scripts/video/stills.test.mjs`

`selectStill` ist rein und wählt aus einer Pexels-Foto-Antwort das beste Hochformat-Bild. `fetchStill` ist die Integrationsschicht (Download).

- [ ] **Step 1: Write the failing test**

```js
// scripts/video/stills.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectStill } from './stills.mjs';

const RESPONSE = {
  photos: [
    { width: 4000, height: 2000, src: { portrait: 'p1', large2x: 'l1' } }, // Querformat -> raus
    { width: 1200, height: 1800, src: { portrait: 'p2', large2x: 'l2' } }, // Hochformat ok
    { width: 2000, height: 3000, src: { portrait: 'p3', large2x: 'l3' } }, // groesser & hoch
  ],
};

test('selectStill nimmt das groesste Hochformat-Bild, portrait-URL', () => {
  assert.equal(selectStill(RESPONSE), 'p3');
});

test('selectStill faellt auf large2x zurueck wenn portrait fehlt', () => {
  const r = { photos: [{ width: 1000, height: 1500, src: { large2x: 'only-large' } }] };
  assert.equal(selectStill(r), 'only-large');
});

test('selectStill gibt null bei keinem Hochformat', () => {
  const r = { photos: [{ width: 4000, height: 1000, src: { portrait: 'x' } }] };
  assert.equal(selectStill(r), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/video/stills.test.mjs`
Expected: FAIL mit `selectStill is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/video/stills.mjs
import { writeFileSync, existsSync } from 'fs';

export function selectStill(response) {
  const photos = (response?.photos || []).filter(p => p.height > p.width && p.width >= 600);
  if (photos.length === 0) return null;
  photos.sort((a, b) => (b.width * b.height) - (a.width * a.height));
  const best = photos[0];
  return best.src.portrait || best.src.large2x || best.src.original || null;
}

export async function fetchStill({ query, apiKey, outPath }) {
  if (existsSync(outPath)) return outPath;
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=15`;
  const res = await fetch(url, { headers: { Authorization: apiKey } });
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status} fuer "${query}"`);
  const data = await res.json();
  const imgUrl = selectStill(data);
  if (!imgUrl) throw new Error(`Kein Hochformat-Still fuer "${query}"`);
  const imgRes = await fetch(imgUrl);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  writeFileSync(outPath, buf);
  return outPath;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/video/stills.test.mjs`
Expected: PASS (3 Tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/video/stills.mjs scripts/video/stills.test.mjs
git commit -m "feat(video): Hochformat-Stills auswaehlen und holen"
```

---

## Task 6: Voiceover-Text und Edge-TTS

**Files:**
- Create: `scripts/video/voice.mjs`
- Test: `scripts/video/voice.test.mjs`

`buildNarration` setzt die Beat-Zeilen einer Sprache zu einem Fließtext zusammen (Punkte erzeugen die Pausen). `synthVoice` ruft Edge TTS für Audio plus Untertitel.

- [ ] **Step 1: Write the failing test**

```js
// scripts/video/voice.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNarration, EDGE_VOICES } from './voice.mjs';

const BS = {
  beats: [{ kind: 'coldOpen' }, { kind: 'thesis' }, { kind: 'reveal' }],
  narration: {
    de: ['Es ist sechs.', 'Paris ist fuenf Staedte.', 'Hier waere ich.'],
    en: ['It is six.', 'Paris is five cities.', 'Here I would be.'],
    es: ['Son las seis.', 'Paris son cinco ciudades.', 'Aqui estaria.'],
  },
};

test('buildNarration verbindet Zeilen mit Leerzeichen', () => {
  assert.equal(buildNarration(BS, 'de'), 'Es ist sechs. Paris ist fuenf Staedte. Hier waere ich.');
});

test('EDGE_VOICES hat ruhige Erzaehler pro Sprache', () => {
  assert.ok(EDGE_VOICES.de && EDGE_VOICES.en && EDGE_VOICES.es);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/video/voice.test.mjs`
Expected: FAIL mit `buildNarration is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/video/voice.mjs
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';

// Ruhige, tiefere Erzaehler-Stimmen fuer den Doku-Ton
export const EDGE_VOICES = {
  de: 'de-DE-ConradNeural',
  en: 'en-US-GuyNeural',
  es: 'es-ES-AlvaroNeural',
};

export function buildNarration(beatSheet, lang) {
  return beatSheet.narration[lang].map(s => s.trim()).join(' ');
}

// Langsameres Tempo fuer den Essay-Ton
const RATE = '-15%';

export function synthVoice({ text, lang, audioPath, srtPath }) {
  if (existsSync(audioPath) && existsSync(srtPath)) return;
  const voice = EDGE_VOICES[lang];
  const tmpTxt = audioPath + '.txt';
  writeFileSync(tmpTxt, text, 'utf8');
  execSync(
    `edge-tts --voice "${voice}" --rate="${RATE}" --file "${tmpTxt}" ` +
    `--write-media "${audioPath}" --write-subtitles "${srtPath}"`,
    { stdio: 'pipe' }
  );
  unlinkSync(tmpTxt);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/video/voice.test.mjs`
Expected: PASS (2 Tests).

- [ ] **Step 5: Commit**

```bash
git add scripts/video/voice.mjs scripts/video/voice.test.mjs
git commit -m "feat(video): Voiceover-Text + Edge-TTS Erzaehlerstimme"
```

---

## Task 7: Musik-Auswahl plus Bibliothek

**Files:**
- Create: `scripts/video/music.mjs`
- Test: `scripts/video/music.test.mjs`
- Create: `remotion/public/music/.gitkeep`
- Create: `remotion/public/music/README.md`

`pickTrack` wählt deterministisch (kein `Math.random`, da im Workflow verboten und für Reproduzierbarkeit unerwünscht) anhand des Stadtnamens einen Track aus der Bibliothek.

- [ ] **Step 1: Write the failing test**

```js
// scripts/video/music.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickTrack } from './music.mjs';

const TRACKS = ['a.mp3', 'b.mp3', 'c.mp3'];

test('pickTrack ist deterministisch pro Stadt', () => {
  assert.equal(pickTrack(TRACKS, 'Paris'), pickTrack(TRACKS, 'Paris'));
});

test('pickTrack verteilt verschiedene Staedte', () => {
  const picks = new Set(['Paris', 'Rome', 'Tokyo', 'Lima'].map(c => pickTrack(TRACKS, c)));
  assert.ok(picks.size >= 2);
});

test('pickTrack wirft bei leerer Bibliothek', () => {
  assert.throws(() => pickTrack([], 'Paris'), /keine Musik/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/video/music.test.mjs`
Expected: FAIL mit `pickTrack is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/video/music.mjs
export function pickTrack(tracks, cityName) {
  if (!tracks || tracks.length === 0) throw new Error('keine Musik in der Bibliothek');
  let hash = 0;
  for (const ch of cityName) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return tracks[hash % tracks.length];
}
```

- [ ] **Step 4: Bibliotheks-Ordner und Hinweis anlegen**

```bash
mkdir -p remotion/public/music
touch remotion/public/music/.gitkeep
```

```markdown
<!-- remotion/public/music/README.md -->
# Musik-Bibliothek

Lege hier 3 bis 5 lizenzfreie, ruhige Tracks als `.mp3` ab (z.B. von Pixabay Music oder Uppbeat).
Pflicht: lizenzfrei und fuer Instagram/Facebook freigegeben, sonst drohen Stummschaltungen.
Empfehlung: ein wiederkehrendes Motiv als Marken-Sound.
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test scripts/video/music.test.mjs`
Expected: PASS (3 Tests).

- [ ] **Step 6: Commit**

```bash
git add scripts/video/music.mjs scripts/video/music.test.mjs remotion/public/music/.gitkeep remotion/public/music/README.md
git commit -m "feat(video): deterministische Musik-Auswahl + Bibliotheks-Ordner"
```

---

## Task 8: Props-Builder (Kern-Mapping)

**Files:**
- Create: `scripts/video/props.mjs`
- Test: `scripts/video/props.test.mjs`

`buildProps` übersetzt Beat-Sheet plus Assets plus Untertitel-Cues in das Remotion-Props-Objekt. Beat-Zeitspannen werden proportional zur Zeichenlänge der Narration verteilt, Untertitel-Frames aus den Cues berechnet.

- [ ] **Step 1: Write the failing test**

```js
// scripts/video/props.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildProps } from './props.mjs';

const beatSheet = {
  cityName: 'Paris',
  beats: [
    { kind: 'coldOpen', query: 'q1', label: null },
    { kind: 'neighborhood', query: 'q2', label: 'LE MARAIS · 4e' },
    { kind: 'reveal', query: 'q3', label: null },
  ],
  narration: { de: ['aa', 'bbbb', 'cc'], en: [], es: [] },
};

const props = buildProps({
  beatSheet,
  lang: 'de',
  imageSrcs: ['renders/paris/img0.jpg', 'renders/paris/img1.jpg', 'renders/paris/img2.jpg'],
  audioDurationSec: 8,
  cues: [{ startMs: 0, endMs: 1000, text: 'Es ist sechs.' }],
  musicSrc: 'music/a.mp3',
  fps: 30,
});

test('buildProps setzt Grundwerte', () => {
  assert.equal(props.width, 1080);
  assert.equal(props.height, 1920);
  assert.equal(props.fps, 30);
  assert.equal(props.durationInFrames, 240); // 8s * 30
  assert.equal(props.lang, 'de');
  assert.equal(props.musicSrc, 'music/a.mp3');
});

test('buildProps verteilt Beats proportional und lueckenlos', () => {
  assert.equal(props.beats.length, 3);
  assert.equal(props.beats[0].startFrame, 0);
  assert.equal(props.beats[2].endFrame, 240);
  for (let i = 1; i < props.beats.length; i++) {
    assert.equal(props.beats[i].startFrame, props.beats[i - 1].endFrame);
  }
  // mittlerer Beat (Text "bbbb") ist laenger als die aeusseren ("aa","cc")
  const len0 = props.beats[0].endFrame - props.beats[0].startFrame;
  const len1 = props.beats[1].endFrame - props.beats[1].startFrame;
  assert.ok(len1 > len0);
  assert.equal(props.beats[1].label, 'LE MARAIS · 4e');
  assert.equal(props.beats[1].imageSrc, 'renders/paris/img1.jpg');
});

test('buildProps rechnet Untertitel-Cues in Frames', () => {
  assert.deepEqual(props.subtitles[0], { startFrame: 0, endFrame: 30, text: 'Es ist sechs.' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/video/props.test.mjs`
Expected: FAIL mit `buildProps is not a function`.

- [ ] **Step 3: Write minimal implementation**

```js
// scripts/video/props.mjs
export function buildProps({ beatSheet, lang, imageSrcs, audioDurationSec, cues, musicSrc, fps = 30 }) {
  const width = 1080, height = 1920;
  const durationInFrames = Math.max(1, Math.round(audioDurationSec * fps));
  const lines = beatSheet.narration[lang];

  const weights = lines.map(l => Math.max(1, l.length));
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const beats = [];
  let acc = 0;
  for (let i = 0; i < beatSheet.beats.length; i++) {
    const startFrame = i === 0 ? 0 : beats[i - 1].endFrame;
    acc += weights[i];
    const endFrame = i === beatSheet.beats.length - 1
      ? durationInFrames
      : Math.round((acc / totalWeight) * durationInFrames);
    beats.push({
      kind: beatSheet.beats[i].kind,
      imageSrc: imageSrcs[i],
      label: beatSheet.beats[i].label,
      startFrame,
      endFrame,
    });
  }

  const subtitles = cues.map(c => ({
    startFrame: Math.round((c.startMs / 1000) * fps),
    endFrame: Math.round((c.endMs / 1000) * fps),
    text: c.text,
  }));

  return { width, height, fps, durationInFrames, lang, musicSrc, beats, subtitles, audioSrc: null };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/video/props.test.mjs`
Expected: PASS (3 Tests).

- [ ] **Step 5: Run alle Modul-Tests**

Run: `node --test scripts/video/`
Expected: PASS (alle Suites grün).

- [ ] **Step 6: Commit**

```bash
git add scripts/video/props.mjs scripts/video/props.test.mjs
git commit -m "feat(video): Props-Builder Beat-Sheet zu Remotion-Props"
```

---

## Task 9: Remotion-Projekt aufsetzen plus Smoke-Render

**Files:**
- Create: `remotion/package.json`
- Create: `remotion/tsconfig.json`
- Create: `remotion/remotion.config.ts`
- Create: `remotion/src/index.ts`
- Create: `remotion/src/Root.tsx`
- Create: `remotion/src/DocReel.tsx`

Erst ein minimal lauffähiges Remotion-Projekt mit einer Komposition, die nur eine Farbfläche plus den Stadtnamen zeigt. Damit verifizieren wir die Render-Toolchain isoliert, bevor die echten Komponenten dazukommen.

- [ ] **Step 1: package.json anlegen**

```json
{
  "name": "zercy-remotion",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "render": "remotion render src/index.ts DocReel"
  },
  "dependencies": {
    "@remotion/cli": "^4.0.0",
    "remotion": "^4.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: tsconfig.json anlegen**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "lib": ["DOM", "ES2020"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: remotion.config.ts anlegen**

```ts
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
```

- [ ] **Step 4: Komposition (zunächst minimal) anlegen**

```tsx
// remotion/src/DocReel.tsx
import { AbsoluteFill } from 'remotion';

export type DocReelProps = {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  lang: string;
  audioSrc: string | null;
  musicSrc: string | null;
  beats: Array<{ kind: string; imageSrc: string; label: string | null; startFrame: number; endFrame: number }>;
  subtitles: Array<{ startFrame: number; endFrame: number; text: string }>;
  cityName?: string;
};

export const DocReel: React.FC<DocReelProps> = ({ cityName = 'Zercy' }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ color: 'white', fontSize: 90, fontFamily: 'Helvetica, sans-serif' }}>{cityName}</div>
    </AbsoluteFill>
  );
};
```

```tsx
// remotion/src/Root.tsx
import { Composition } from 'remotion';
import { DocReel } from './DocReel';

const DEFAULTS = {
  width: 1080, height: 1920, fps: 30, durationInFrames: 90,
  lang: 'de', audioSrc: null, musicSrc: null, beats: [], subtitles: [], cityName: 'Zercy',
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="DocReel"
    component={DocReel}
    durationInFrames={90}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={DEFAULTS}
    calculateMetadata={({ props }) => ({
      durationInFrames: props.durationInFrames || 90,
      fps: props.fps || 30,
      width: props.width || 1080,
      height: props.height || 1920,
    })}
  />
);
```

```ts
// remotion/src/index.ts
import { registerRoot } from 'remotion';
import { RemotionRoot } from './Root';

registerRoot(RemotionRoot);
```

- [ ] **Step 5: Dependencies installieren**

Run: `cd remotion && npm install`
Expected: Installation ohne Fehler, `node_modules` entsteht.

- [ ] **Step 6: Smoke-Render**

Run: `cd remotion && npx remotion render src/index.ts DocReel out/smoke.mp4`
Expected: Eine Datei `remotion/out/smoke.mp4` entsteht (3 Sekunden, dunkelblau mit "Zercy"). Visuell prüfen mit `open remotion/out/smoke.mp4`.

- [ ] **Step 7: out/ und node_modules ignorieren**

```bash
printf 'node_modules/\nout/\n' > remotion/.gitignore
```

- [ ] **Step 8: Commit**

```bash
git add remotion/package.json remotion/package-lock.json remotion/tsconfig.json remotion/remotion.config.ts remotion/src/index.ts remotion/src/Root.tsx remotion/src/DocReel.tsx remotion/.gitignore
git commit -m "feat(video): Remotion-Projekt + Smoke-Render"
```

---

## Task 10: Remotion-Komponenten (Ken Burns, Chyron, Untertitel, Grade, Endcard)

**Files:**
- Create: `remotion/src/components/KenBurnsImage.tsx`
- Create: `remotion/src/components/Chyron.tsx`
- Create: `remotion/src/components/Subtitles.tsx`
- Create: `remotion/src/components/Grade.tsx`
- Create: `remotion/src/components/EndCard.tsx`
- Modify: `remotion/src/DocReel.tsx`

- [ ] **Step 1: KenBurnsImage**

```tsx
// remotion/src/components/KenBurnsImage.tsx
import { AbsoluteFill, Img, interpolate, useCurrentFrame, staticFile } from 'remotion';

export const KenBurnsImage: React.FC<{ src: string; durationInFrames: number }> = ({ src, durationInFrames }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.08], { extrapolateRight: 'clamp' });
  const y = interpolate(frame, [0, durationInFrames], [0, -24], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#000' }}>
      <Img
        src={staticFile(src)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale}) translateY(${y}px)` }}
      />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Chyron**

```tsx
// remotion/src/components/Chyron.tsx
import { interpolate, useCurrentFrame } from 'remotion';

export const Chyron: React.FC<{ label: string }> = ({ label }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, 1000], [0, 1, 1], { extrapolateRight: 'clamp' });
  return (
    <div style={{
      position: 'absolute', left: 64, bottom: 360, opacity,
      color: 'white', fontFamily: 'Helvetica, sans-serif', fontSize: 30, letterSpacing: 4,
      fontWeight: 700, textShadow: '0 2px 8px rgba(0,0,0,0.7)',
    }}>
      {label}
    </div>
  );
};
```

- [ ] **Step 3: Subtitles**

```tsx
// remotion/src/components/Subtitles.tsx
import { AbsoluteFill, useCurrentFrame } from 'remotion';

type Cue = { startFrame: number; endFrame: number; text: string };

export const Subtitles: React.FC<{ cues: Cue[] }> = ({ cues }) => {
  const frame = useCurrentFrame();
  const current = cues.find(c => frame >= c.startFrame && frame < c.endFrame);
  if (!current) return null;
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 220 }}>
      <div style={{
        maxWidth: 880, textAlign: 'center', color: 'white',
        fontFamily: 'Helvetica, sans-serif', fontSize: 40, lineHeight: 1.3, fontWeight: 500,
        textShadow: '0 2px 10px rgba(0,0,0,0.85)',
      }}>
        {current.text}
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Grade (Vignette plus Korn plus leichter Farbstich)**

```tsx
// remotion/src/components/Grade.tsx
import { AbsoluteFill } from 'remotion';

export const Grade: React.FC = () => (
  <>
    {/* leichter cineastischer Farbstich + Vignette */}
    <AbsoluteFill style={{
      background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)',
      mixBlendMode: 'multiply',
    }} />
    <AbsoluteFill style={{ backgroundColor: 'rgba(20,40,55,0.10)', mixBlendMode: 'soft-light' }} />
    {/* Film-Korn via SVG-Noise */}
    <AbsoluteFill style={{ opacity: 0.07, mixBlendMode: 'overlay' }}>
      <svg width="100%" height="100%">
        <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" /></filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  </>
);
```

- [ ] **Step 5: EndCard**

```tsx
// remotion/src/components/EndCard.tsx
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

export const EndCard: React.FC<{ durationInFrames: number }> = ({ durationInFrames }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 120, opacity }}>
      <div style={{
        color: 'white', fontFamily: 'Helvetica, sans-serif', fontSize: 52, fontWeight: 800,
        textShadow: '0 2px 12px rgba(0,0,0,0.8)',
      }}>
        zercy.app
      </div>
      <div style={{ color: 'white', fontFamily: 'Helvetica, sans-serif', fontSize: 26, opacity: 0.85, marginTop: 8 }}>
        Link in Bio
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 6: DocReel verdrahten**

```tsx
// remotion/src/DocReel.tsx (ersetzt den minimalen Body aus Task 9)
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';
import { KenBurnsImage } from './components/KenBurnsImage';
import { Chyron } from './components/Chyron';
import { Subtitles } from './components/Subtitles';
import { Grade } from './components/Grade';
import { EndCard } from './components/EndCard';

export type DocReelProps = {
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  lang: string;
  audioSrc: string | null;
  musicSrc: string | null;
  beats: Array<{ kind: string; imageSrc: string; label: string | null; startFrame: number; endFrame: number }>;
  subtitles: Array<{ startFrame: number; endFrame: number; text: string }>;
  cityName?: string;
};

export const DocReel: React.FC<DocReelProps> = ({ durationInFrames, audioSrc, musicSrc, beats, subtitles }) => {
  const lastBeat = beats[beats.length - 1];
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {beats.map((b, i) => {
        const dur = b.endFrame - b.startFrame;
        return (
          <Sequence key={i} from={b.startFrame} durationInFrames={dur}>
            <KenBurnsImage src={b.imageSrc} durationInFrames={dur} />
            {b.label ? <Chyron label={b.label} /> : null}
          </Sequence>
        );
      })}

      <Grade />
      <Subtitles cues={subtitles} />

      {lastBeat ? (
        <Sequence from={lastBeat.startFrame} durationInFrames={lastBeat.endFrame - lastBeat.startFrame}>
          <EndCard durationInFrames={lastBeat.endFrame - lastBeat.startFrame} />
        </Sequence>
      ) : null}

      {audioSrc ? <Audio src={staticFile(audioSrc)} /> : null}
      {musicSrc ? <Audio src={staticFile(musicSrc)} volume={0.16} /> : null}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 7: Studio-Vorschau prüfen (visuell)**

Run: `cd remotion && npx remotion studio src/index.ts`
Expected: Studio öffnet im Browser. Mit `defaultProps` (leere beats) erscheint schwarzer Frame ohne Crash. Studio wieder schließen. (Echte Props folgen im Smoke-Run Task 11.)

- [ ] **Step 8: Commit**

```bash
git add remotion/src/components remotion/src/DocReel.tsx
git commit -m "feat(video): Remotion-Komponenten KenBurns/Chyron/Untertitel/Grade/EndCard"
```

---

## Task 11: Orchestrator umschreiben plus End-to-End-Smoke

**Files:**
- Modify: `scripts/generate-video.mjs` (komplett ersetzen)

Der Orchestrator verdrahtet alle Module: Beat-Sheet → Stills (einmal, Bild-Master) → pro Sprache Voice plus Untertitel → Props → Remotion-Render. Assets werden nach `remotion/public/renders/` kopiert, damit `staticFile` sie findet.

- [ ] **Step 1: Orchestrator schreiben**

```js
#!/usr/bin/env node
// scripts/generate-video.mjs
/**
 * Zercy Documentary Reels Pipeline
 * Erzeugt 35-40s Mikro-Dokus (DE/EN/ES) aus einem Blog-Artikel.
 * Usage: node scripts/generate-video.mjs paris
 * Output: video-output/paris-de.mp4, paris-en.mp4, paris-es.mp4
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { homedir } from 'os';
import path from 'path';

import { generateBeatSheet } from './video/beatsheet.mjs';
import { fetchStill } from './video/stills.mjs';
import { buildNarration, synthVoice } from './video/voice.mjs';
import { pickTrack } from './video/music.mjs';
import { parseSrt, groupCues } from './video/srt.mjs';
import { buildProps } from './video/props.mjs';

const KEYS = JSON.parse(readFileSync(`${homedir()}/.zercy-analytics/video-api-keys.json`, 'utf8'));
const BASE_DIR = path.resolve('/Users/christinebork/Claude Code Projects/zercy-landing');
const OUT_DIR = path.join(BASE_DIR, 'video-output');
const TEMP_DIR = path.join(BASE_DIR, 'video-temp');
const REMOTION_DIR = path.join(BASE_DIR, 'remotion');
const PUBLIC_RENDERS = path.join(REMOTION_DIR, 'public', 'renders');
const MUSIC_DIR = path.join(REMOTION_DIR, 'public', 'music');
const LANGS = ['de', 'en', 'es'];

function ensureDirs() {
  [OUT_DIR, TEMP_DIR, PUBLIC_RENDERS].forEach(d => { if (!existsSync(d)) mkdirSync(d, { recursive: true }); });
}

function readArticle(slug) {
  for (const sub of ['blog', 'blogen', 'bloges']) {
    const p = path.join(BASE_DIR, 'src/content', sub, `${slug}.md`);
    if (existsSync(p)) return readFileSync(p, 'utf8');
  }
  return '';
}

function body(md) {
  return md.replace(/^---[\s\S]+?---\n/, '').replace(/[#*`]/g, '').trim();
}

function ffprobeDuration(file) {
  const out = execFileSync('ffprobe', ['-v', 'quiet', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return parseFloat(out.trim());
}

async function generateCity(slug) {
  ensureDirs();
  console.log(`\n🎬 Doku-Reel fuer: ${slug}`);

  const deMd = readArticle(`wo-uebernachten-${slug}`);
  const enMd = readArticle(`where-to-stay-${slug}`);
  const esMd = readArticle(`donde-alojarse-${slug}`);
  if (!deMd && !enMd && !esMd) throw new Error(`Keine Artikel fuer: ${slug}`);

  const cityName = slug.charAt(0).toUpperCase() + slug.slice(1);

  // 1. Beat-Sheet (Claude)
  console.log('  📝 Beat-Sheet...');
  const beatSheet = await generateBeatSheet({
    cityName, deBody: body(deMd), enBody: body(enMd), esBody: body(esMd), apiKey: KEYS.anthropic_api_key,
  });

  // 2. Stills (Bild-Master, sprachunabhaengig) -> nach public/renders/<slug>/imgN.jpg
  console.log('  🖼  Stills...');
  const imgDir = path.join(PUBLIC_RENDERS, slug);
  if (!existsSync(imgDir)) mkdirSync(imgDir, { recursive: true });
  const imageSrcs = [];
  for (let i = 0; i < beatSheet.beats.length; i++) {
    const outPath = path.join(imgDir, `img${i}.jpg`);
    await fetchStill({ query: beatSheet.beats[i].query, apiKey: KEYS.pexels_api_key, outPath });
    imageSrcs.push(`renders/${slug}/img${i}.jpg`);
  }

  // 3. Musik einmal waehlen (Bild-Master)
  const tracks = readdirSync(MUSIC_DIR).filter(f => f.endsWith('.mp3'));
  const musicSrc = `music/${pickTrack(tracks, cityName)}`;

  // 4. pro Sprache: Voice + Untertitel + Props + Render
  for (const lang of LANGS) {
    console.log(`  🎙  ${lang.toUpperCase()}...`);
    const langDir = path.join(PUBLIC_RENDERS, slug, lang);
    if (!existsSync(langDir)) mkdirSync(langDir, { recursive: true });

    const audioPath = path.join(langDir, 'voice.mp3');
    const srtPath = path.join(TEMP_DIR, `${slug}-${lang}.srt`);
    synthVoice({ text: buildNarration(beatSheet, lang), lang, audioPath, srtPath });

    const audioDurationSec = ffprobeDuration(audioPath);
    const cues = groupCues(parseSrt(readFileSync(srtPath, 'utf8')));

    const props = buildProps({ beatSheet, lang, imageSrcs, audioDurationSec, cues, musicSrc, fps: 30 });
    props.audioSrc = `renders/${slug}/${lang}/voice.mp3`;
    props.cityName = cityName;

    const propsFile = path.join(TEMP_DIR, `${slug}-${lang}.props.json`);
    writeFileSync(propsFile, JSON.stringify(props));

    const outFile = path.join(OUT_DIR, `${slug}-${lang}.mp4`);
    console.log(`  🎞  Render ${lang.toUpperCase()}...`);
    execFileSync('npx', ['remotion', 'render', 'src/index.ts', 'DocReel', outFile, `--props=${propsFile}`],
      { cwd: REMOTION_DIR, stdio: 'inherit' });
    console.log(`    ✓ ${outFile}`);
  }

  console.log(`\n✅ Fertig: video-output/${slug}-{de,en,es}.mp4`);
}

const slug = process.argv[2];
if (!slug) { console.error('Usage: node scripts/generate-video.mjs <city-slug>'); process.exit(1); }
generateCity(slug).catch(err => { console.error('❌', err.message); process.exit(1); });
```

- [ ] **Step 2: Voraussetzungen prüfen**

Run: `which edge-tts ffprobe && ls remotion/public/music/*.mp3`
Expected: Pfade zu `edge-tts` und `ffprobe` erscheinen, und mindestens eine `.mp3` liegt in der Musik-Bibliothek. Fehlt etwas: `pip install edge-tts`, `brew install ffmpeg`, bzw. lizenzfreie Tracks ablegen (siehe Task 7 README).

- [ ] **Step 3: Syntax-Check**

Run: `node --check scripts/generate-video.mjs`
Expected: kein Output, Exit 0.

- [ ] **Step 4: End-to-End-Smoke mit Paris**

Run: `node scripts/generate-video.mjs paris`
Expected: Drei Dateien `video-output/paris-de.mp4`, `paris-en.mp4`, `paris-es.mp4` entstehen.

- [ ] **Step 5: Visuelle Verifikation (Pflicht)**

Run: `open video-output/paris-de.mp4`
Prüfen:
- Cold Open wirkt (ruhiger Einstieg, kein Hype)
- Chyrons zeigen die Viertel korrekt
- Untertitel sind synchron und ruhig (eine Zeile, kein Karaoke)
- Grade ist konsistent über alle Clips
- Musik liegt leise unter der Stimme
- Länge 35 bis 40 Sekunden
- Alle drei Sprachen nutzen dasselbe Bildmaterial (paris-en.mp4 und paris-es.mp4 gegenprüfen)

- [ ] **Step 6: Commit**

```bash
git add scripts/generate-video.mjs
git commit -m "feat(video): Orchestrator auf Doku-Pipeline umgestellt"
```

---

## Self-Review (vom Plan-Autor durchgeführt)

**Spec-Abdeckung:**
- Dramaturgie-Template → Task 4 (Prompt) + Task 8 (Beat-Timing) + Task 10 (Darstellung). ✓
- Motion-Stills / Ken Burns → Task 10 (KenBurnsImage). ✓
- Stock-Stills (Pexels) → Task 5. ✓
- DE/EN/ES, ein Bild-Master + drei Spuren → Task 11 (Stills einmal, Voice/Props pro Sprache). ✓
- Lizenzfreie Musik + Ducking → Task 7 (Bibliothek/Auswahl) + Task 10 (Audio volume 0.16). ✓
- Edge TTS Erzählerstimme → Task 6. ✓
- Remotion statt ffmpeg-drawtext → Tasks 9, 10. ✓
- Untertitel als ruhige Phrasen, kein Karaoke → Task 2 (groupCues) + Task 10 (Subtitles). ✓
- Grade plus Korn → Task 10 (Grade). ✓
- Output-Dateien, kein Posting → Task 11. ✓
- Idempotenz/Caching → `existsSync`-Guards in fetchStill/synthVoice. ✓

**Platzhalter-Scan:** Keine TBD/TODO, jeder Code-Schritt zeigt vollständigen Code. ✓

**Typ-Konsistenz:** Beat-Sheet-Form (`beats[]`, `narration{de,en,es}[]`), Cue-Form (`{startMs,endMs,text}`), Props-Form (`{beats[],subtitles[]}`) sind über Tasks 1, 3, 8, 10, 11 identisch verwendet. `buildProps` setzt `audioSrc: null`, der Orchestrator füllt es danach (Task 11 Step 1). ✓
