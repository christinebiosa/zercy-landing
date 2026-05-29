# Instagram/Facebook Carousel-Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aus einem Blog-Artikel automatisch ein 6–8-Slide Instagram/Facebook-Carousel (PNG, 1080×1350) + englische Caption erzeugen, bereit für Bulk-Import in einen Scheduler.

**Architecture:** Maximale Wiederverwendung der Doku-Reels-Pipeline. Reine Module unter `scripts/social/` (Beat-Sheet-Validierung, Props-Builder) mit `node:test`; Claude erzeugt Slide-Struktur + Caption; Bilder via bestehendem `scripts/video/stills.mjs` (Pexels); Rendering über eine neue Remotion-Composition `Carousel`, die EINEN Slide als Standbild rendert (`remotion still`).

**Tech Stack:** Node 26 (ESM `.mjs`), `node:test`, Anthropic SDK, Pexels, Remotion v4 (React/TS, `remotion still`).

---

## Dateistruktur

```
scripts/social/
  carousel-beatsheet.mjs        # parseCarouselSheet (rein) + generateCarouselSheet (Claude)
  carousel-beatsheet.test.mjs
  carousel-props.mjs            # buildSlideProps (rein)
  carousel-props.test.mjs
scripts/generate-carousel.mjs   # Orchestrator
remotion/src/CarouselSlide.tsx  # rendert EINEN Slide (kind cover|content|cta), 1080x1350
remotion/src/Root.tsx           # MODIFY: Composition "Carousel" ergaenzen (neben DocReel)
.gitignore / remotion/.gitignore / .vercelignore  # MODIFY: social-output, renders-social ausschliessen
```

### Daten-Verträge

**Carousel-Beat-Sheet** (aus `generateCarouselSheet`, validiert von `parseCarouselSheet`):
```js
{
  topic: "paris",
  cover:  { title: "Where to actually stay in Paris", hook: "Five cities in one. Pick right.", query: "paris rooftops skyline" },
  slides: [ { heading: "Le Marais", line: "For people who never want to sleep.", bestFor: "nightlife, boutique", query: "le marais paris night" } ],  // 4-6
  cta:    { headline: "Save this for your trip", sub: "Full guide -> link in bio", query: "paris seine sunrise" },
  caption: "<EN caption>"
}
```
Invariante: `slides.length` ist 4–6; jedes content-slide hat `heading`,`line`,`query` (`bestFor` optional); `cover`/`cta` haben ihre Felder; `caption` nicht leer.

**Slide-Props-Array** (aus `buildSlideProps`, ein Eintrag je gerendertem Slide, Reihenfolge cover → content… → cta):
```js
{ kind:'cover',   width:1080, height:1350, imageSrc, index, total, title, hook }
{ kind:'content', width:1080, height:1350, imageSrc, index, total, heading, line, bestFor }
{ kind:'cta',     width:1080, height:1350, imageSrc, index, total, headline, sub }
```
`total = 2 + slides.length`; `index` 1..total; `imageSrc = "renders-social/<topic>/imgK.jpg"` (K 0-basiert: 0=cover, 1..N=content, N+1=cta).

---

## Task 1: Carousel-Beat-Sheet-Validierung

**Files:**
- Create: `scripts/social/carousel-beatsheet.mjs`
- Test: `scripts/social/carousel-beatsheet.test.mjs`

- [ ] **Step 1: Create `scripts/social/carousel-beatsheet.test.mjs`:**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCarouselSheet } from './carousel-beatsheet.mjs';

const VALID = JSON.stringify({
  topic: 'paris',
  cover: { title: 'Where to stay in Paris', hook: 'Five cities in one.', query: 'paris skyline' },
  slides: [
    { heading: 'Le Marais', line: 'Never sleep.', bestFor: 'nightlife', query: 'le marais' },
    { heading: 'Saint-Germain', line: 'Old money calm.', query: 'saint germain' },
    { heading: 'Montmartre', line: 'Hilltop romance.', query: 'montmartre' },
    { heading: 'Bastille', line: 'Local and loud.', query: 'bastille paris' },
  ],
  cta: { headline: 'Save this', sub: 'Link in bio', query: 'seine sunrise' },
  caption: 'Where to stay in Paris. Save it.',
});

test('parseCarouselSheet akzeptiert gueltiges JSON mit Vortext', () => {
  const s = parseCarouselSheet('Here:\n' + VALID);
  assert.equal(s.topic, 'paris');
  assert.equal(s.slides.length, 4);
  assert.equal(s.cover.title, 'Where to stay in Paris');
});

test('parseCarouselSheet wirft bei zu wenigen slides', () => {
  const b = JSON.parse(VALID); b.slides = b.slides.slice(0, 3);
  assert.throws(() => parseCarouselSheet(JSON.stringify(b)), /slides/);
});

test('parseCarouselSheet wirft ohne JSON', () => {
  assert.throws(() => parseCarouselSheet('nope'), /kein JSON/);
});
```

- [ ] **Step 2: Run** `node --test scripts/social/carousel-beatsheet.test.mjs` — expect FAIL (`parseCarouselSheet is not a function`).

- [ ] **Step 3: Create `scripts/social/carousel-beatsheet.mjs`:**

```js
// scripts/social/carousel-beatsheet.mjs
export function parseCarouselSheet(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Beat-Sheet enthielt kein JSON');
  let o;
  try { o = JSON.parse(m[0]); } catch (e) { throw new Error('Carousel-JSON nicht parsebar: ' + e.message); }
  if (!o.topic) throw new Error('Beat-Sheet ohne topic');
  if (!o.cover || !o.cover.title || !o.cover.hook || !o.cover.query) throw new Error('cover unvollstaendig (title/hook/query)');
  if (!Array.isArray(o.slides) || o.slides.length < 4 || o.slides.length > 6) {
    throw new Error(`slides muss 4-6 Eintraege haben, hat ${o.slides ? o.slides.length : 0}`);
  }
  for (const [i, s] of o.slides.entries()) {
    if (!s.heading || !s.line || !s.query) throw new Error(`slide ${i} ohne heading/line/query`);
    if (!('bestFor' in s)) s.bestFor = '';
  }
  if (!o.cta || !o.cta.headline || !o.cta.sub || !o.cta.query) throw new Error('cta unvollstaendig (headline/sub/query)');
  if (!o.caption || !o.caption.trim()) throw new Error('caption fehlt');
  return o;
}
```

- [ ] **Step 4: Run** `node --test scripts/social/carousel-beatsheet.test.mjs` — expect PASS (3 tests).

- [ ] **Step 5: Commit**
```bash
git add scripts/social/carousel-beatsheet.mjs scripts/social/carousel-beatsheet.test.mjs
git commit -m "feat(social): Carousel-Beat-Sheet-Validierung"
```

---

## Task 2: Carousel-Beat-Sheet via Claude

**Files:**
- Modify: `scripts/social/carousel-beatsheet.mjs` (append)

- [ ] **Step 1: Add at the TOP of `scripts/social/carousel-beatsheet.mjs`:**
```js
import Anthropic from '@anthropic-ai/sdk';
```

- [ ] **Step 2: Append at the END of `scripts/social/carousel-beatsheet.mjs`:**
```js
const CAROUSEL_PROMPT = (slug, cityName, enBody) => `You write an English Instagram/Facebook carousel about "Where to stay in ${cityName}", from the blog article below.

Article excerpt:
${enBody.slice(0, 1200)}

Tone: direct, "you", short sentences, no em-dashes, no fluff. Travel-savvy, confident.

Return ONLY JSON in exactly this shape:
{
  "topic": "${slug}",
  "cover": { "title": "scroll-stopping hook headline (max 7 words)", "hook": "one short promise line", "query": "english photo search term" },
  "slides": [
    { "heading": "Neighborhood name", "line": "one vivid mood line", "bestFor": "2-4 keywords", "query": "english photo search term" }
  ],
  "cta": { "headline": "Save this for your trip", "sub": "Full guide -> link in bio", "query": "english photo search term" },
  "caption": "Full IG/FB caption in English: hook line, 2-3 value lines, soft CTA 'Full guide in our bio', a few niche travel hashtags. Short sentences, no em-dashes."
}
Rules: "slides" has 4 to 6 entries (one neighborhood each, no hotel names, no prices). Every "query" is a concrete English photo search term for a vertical image.`;

export async function generateCarouselSheet({ slug, cityName, enBody, apiKey }) {
  const anthropic = new Anthropic({ apiKey });
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: CAROUSEL_PROMPT(slug, cityName, enBody) }],
  });
  return parseCarouselSheet(msg.content[0].text);
}
```

- [ ] **Step 3: Run** `node --check scripts/social/carousel-beatsheet.mjs` — exit 0. And `node --test scripts/social/carousel-beatsheet.test.mjs` — still 3 pass.

- [ ] **Step 4: Commit**
```bash
git add scripts/social/carousel-beatsheet.mjs
git commit -m "feat(social): Carousel-Beat-Sheet via Claude (EN)"
```

---

## Task 3: Slide-Props-Builder

**Files:**
- Create: `scripts/social/carousel-props.mjs`
- Test: `scripts/social/carousel-props.test.mjs`

- [ ] **Step 1: Create `scripts/social/carousel-props.test.mjs`:**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSlideProps } from './carousel-props.mjs';

const sheet = {
  topic: 'paris',
  cover: { title: 'Where to stay in Paris', hook: 'Five cities in one.', query: 'q0' },
  slides: [
    { heading: 'Le Marais', line: 'Never sleep.', bestFor: 'nightlife', query: 'q1' },
    { heading: 'Saint-Germain', line: 'Calm.', bestFor: 'culture', query: 'q2' },
    { heading: 'Montmartre', line: 'Romance.', bestFor: 'views', query: 'q3' },
    { heading: 'Bastille', line: 'Local.', bestFor: 'food', query: 'q4' },
  ],
  cta: { headline: 'Save this', sub: 'Link in bio', query: 'q5' },
  caption: 'x',
};
const imageSrcs = ['renders-social/paris/img0.jpg','renders-social/paris/img1.jpg','renders-social/paris/img2.jpg','renders-social/paris/img3.jpg','renders-social/paris/img4.jpg','renders-social/paris/img5.jpg'];

const props = buildSlideProps({ sheet, imageSrcs });

test('buildSlideProps erzeugt cover + content + cta in Reihenfolge', () => {
  assert.equal(props.length, 6); // 1 cover + 4 content + 1 cta
  assert.equal(props[0].kind, 'cover');
  assert.equal(props[1].kind, 'content');
  assert.equal(props[5].kind, 'cta');
});

test('buildSlideProps setzt index/total und Bild korrekt', () => {
  assert.equal(props[0].total, 6);
  assert.equal(props[0].index, 1);
  assert.equal(props[5].index, 6);
  assert.equal(props[0].imageSrc, 'renders-social/paris/img0.jpg');
  assert.equal(props[1].imageSrc, 'renders-social/paris/img1.jpg');
  assert.equal(props[5].imageSrc, 'renders-social/paris/img5.jpg');
  assert.equal(props[0].width, 1080);
  assert.equal(props[0].height, 1350);
});

test('buildSlideProps mappt Texte je kind', () => {
  assert.equal(props[0].title, 'Where to stay in Paris');
  assert.equal(props[0].hook, 'Five cities in one.');
  assert.equal(props[1].heading, 'Le Marais');
  assert.equal(props[1].line, 'Never sleep.');
  assert.equal(props[1].bestFor, 'nightlife');
  assert.equal(props[5].headline, 'Save this');
  assert.equal(props[5].sub, 'Link in bio');
});
```

- [ ] **Step 2: Run** `node --test scripts/social/carousel-props.test.mjs` — expect FAIL.

- [ ] **Step 3: Create `scripts/social/carousel-props.mjs`:**

```js
// scripts/social/carousel-props.mjs
export function buildSlideProps({ sheet, imageSrcs }) {
  const W = 1080, H = 1350;
  const total = 2 + sheet.slides.length;
  const out = [];
  out.push({ kind: 'cover', width: W, height: H, imageSrc: imageSrcs[0], index: 1, total, title: sheet.cover.title, hook: sheet.cover.hook });
  sheet.slides.forEach((s, i) => {
    out.push({ kind: 'content', width: W, height: H, imageSrc: imageSrcs[i + 1], index: i + 2, total, heading: s.heading, line: s.line, bestFor: s.bestFor || '' });
  });
  out.push({ kind: 'cta', width: W, height: H, imageSrc: imageSrcs[total - 1], index: total, total, headline: sheet.cta.headline, sub: sheet.cta.sub });
  return out;
}
```

- [ ] **Step 4: Run** `node --test scripts/social/carousel-props.test.mjs` — expect PASS (3 tests). Then `node --test scripts/social/*.test.mjs` — all green.

- [ ] **Step 5: Commit**
```bash
git add scripts/social/carousel-props.mjs scripts/social/carousel-props.test.mjs
git commit -m "feat(social): Slide-Props-Builder fuer Carousel"
```

---

## Task 4: Remotion-Carousel-Slide + Composition + Smoke-Render

**Files:**
- Create: `remotion/src/CarouselSlide.tsx`
- Modify: `remotion/src/Root.tsx`

- [ ] **Step 1: Create `remotion/src/CarouselSlide.tsx`:**

```tsx
import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { Grade } from './components/Grade';

export type SlideProps = {
  width: number; height: number;
  kind: 'cover' | 'content' | 'cta';
  imageSrc: string;
  index: number; total: number;
  title?: string; hook?: string;
  heading?: string; line?: string; bestFor?: string;
  headline?: string; sub?: string;
};

const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif';
const NAVY = '#0F172A';
const OCEAN = '#0EA5E9';
const SUNSET = '#F97316';

export const CarouselSlide: React.FC<SlideProps> = (p) => {
  return (
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      {p.imageSrc ? (
        <Img src={staticFile(p.imageSrc)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : null}
      <Grade />
      {/* Lesbarkeits-Scrim unten */}
      <AbsoluteFill style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.45) 38%, rgba(15,23,42,0) 70%)' }} />

      {/* Footer: Logo + Zaehler */}
      <div style={{ position: 'absolute', bottom: 48, left: 56, right: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'rgba(255,255,255,0.85)', fontFamily: FONT, fontSize: 30, fontWeight: 700 }}>
        <span>{'✈'} Zercy</span>
        <span style={{ color: 'rgba(255,255,255,0.65)' }}>{p.index}/{p.total}</span>
      </div>

      {/* Inhalt je kind */}
      {p.kind === 'cover' && (
        <div style={{ position: 'absolute', left: 56, right: 56, bottom: 150, color: '#fff', fontFamily: FONT }}>
          <div style={{ fontSize: 78, fontWeight: 800, lineHeight: 1.05, textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>{p.title}</div>
          <div style={{ fontSize: 40, fontWeight: 500, marginTop: 22, color: 'rgba(255,255,255,0.92)' }}>{p.hook}</div>
          <div style={{ fontSize: 30, fontWeight: 700, marginTop: 30, color: SUNSET, letterSpacing: 2 }}>SWIPE {'→'}</div>
        </div>
      )}
      {p.kind === 'content' && (
        <div style={{ position: 'absolute', left: 56, right: 56, bottom: 150, color: '#fff', fontFamily: FONT }}>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.1, color: '#fff', textShadow: '0 2px 14px rgba(0,0,0,0.6)' }}>{p.heading}</div>
          <div style={{ fontSize: 42, fontWeight: 500, marginTop: 18, lineHeight: 1.3 }}>{p.line}</div>
          {p.bestFor ? <div style={{ fontSize: 30, fontWeight: 700, marginTop: 22, color: OCEAN }}>best for: {p.bestFor}</div> : null}
        </div>
      )}
      {p.kind === 'cta' && (
        <div style={{ position: 'absolute', left: 56, right: 56, bottom: 150, color: '#fff', fontFamily: FONT }}>
          <div style={{ fontSize: 70, fontWeight: 800, lineHeight: 1.08, textShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>{p.headline}</div>
          <div style={{ fontSize: 40, fontWeight: 600, marginTop: 22, color: SUNSET }}>{p.sub}</div>
        </div>
      )}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: REPLACE `remotion/src/Root.tsx`** with (adds the `Carousel` composition next to the existing `DocReel`):

```tsx
import React from 'react';
import { Composition } from 'remotion';
import { DocReel } from './DocReel';
import { CarouselSlide } from './CarouselSlide';

const DOC_DEFAULTS = {
  width: 1080, height: 1920, fps: 30, durationInFrames: 90,
  lang: 'de', audioSrc: null, musicSrc: null, beats: [], subtitles: [],
};

const SLIDE_DEFAULTS = {
  width: 1080, height: 1350, kind: 'cover' as const, imageSrc: '',
  index: 1, total: 7, title: 'Zercy', hook: '', heading: '', line: '', bestFor: '', headline: '', sub: '',
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="DocReel"
      component={DocReel}
      durationInFrames={90}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={DOC_DEFAULTS}
      calculateMetadata={({ props }) => ({
        durationInFrames: props.durationInFrames || 90,
        fps: props.fps || 30,
        width: props.width || 1080,
        height: props.height || 1920,
      })}
    />
    <Composition
      id="Carousel"
      component={CarouselSlide}
      durationInFrames={1}
      fps={30}
      width={1080}
      height={1350}
      defaultProps={SLIDE_DEFAULTS}
    />
  </>
);
```

- [ ] **Step 3: Smoke-Render eines Standbilds mit Default-Props** (kein imageSrc → nur Navy + Grade + Cover-Text; prüft, dass die Composition kompiliert/rendert):

Run: `cd "/Users/christinebork/Claude Code Projects/zercy-landing/remotion" && npx remotion still src/index.ts Carousel out/slide-check.png`
Expected: erzeugt `remotion/out/slide-check.png` (non-empty, 1080×1350). Visuell prüfen mit `open remotion/out/slide-check.png` (dunkler Slide mit „Zercy" + „1/7" + „SWIPE →").

- [ ] **Step 4: Commit**
```bash
cd "/Users/christinebork/Claude Code Projects/zercy-landing"
git add remotion/src/CarouselSlide.tsx remotion/src/Root.tsx
git commit -m "feat(social): Remotion Carousel-Slide-Composition (cover/content/cta)"
```

---

## Task 5: Orchestrator + Ignores + End-to-End-Smoke

**Files:**
- Create: `scripts/generate-carousel.mjs`
- Modify: `.gitignore`, `remotion/.gitignore`, `.vercelignore`

- [ ] **Step 1: Ignores ergänzen** (verhindert Repo-/Deploy-Müll):
```bash
cd "/Users/christinebork/Claude Code Projects/zercy-landing"
printf '\nsocial-output/\n' >> .gitignore
printf 'public/renders-social/\n' >> remotion/.gitignore
printf 'social-output\n' >> .vercelignore
```

- [ ] **Step 2: Create `scripts/generate-carousel.mjs`:**

```js
#!/usr/bin/env node
// scripts/generate-carousel.mjs
// Erzeugt ein IG/FB-Carousel (PNG-Slides + EN-Caption) aus einem Blog-Artikel.
// Usage: node scripts/generate-carousel.mjs paris
// Output: social-output/paris/slide-01.png ... + caption.txt
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { homedir } from 'os';
import path from 'path';

import { generateCarouselSheet } from './social/carousel-beatsheet.mjs';
import { buildSlideProps } from './social/carousel-props.mjs';
import { fetchStill } from './video/stills.mjs';

const KEYS = JSON.parse(readFileSync(`${homedir()}/.zercy-analytics/video-api-keys.json`, 'utf8'));
const BASE_DIR = path.resolve('/Users/christinebork/Claude Code Projects/zercy-landing');
const OUT_DIR = path.join(BASE_DIR, 'social-output');
const REMOTION_DIR = path.join(BASE_DIR, 'remotion');
const PUBLIC_SOCIAL = path.join(REMOTION_DIR, 'public', 'renders-social');

function readEnArticle(slug) {
  for (const name of [`where-to-stay-${slug}`, slug]) {
    const p = path.join(BASE_DIR, 'src/content/blogen', `${name}.md`);
    if (existsSync(p)) return readFileSync(p, 'utf8');
  }
  return '';
}
function body(md) { return md.replace(/^---[\s\S]+?---\n/, '').replace(/[#*`]/g, '').trim(); }

async function generate(slug) {
  console.log(`\n🎠 Carousel fuer: ${slug}`);
  const enMd = readEnArticle(slug);
  if (!enMd) throw new Error(`Kein EN-Artikel fuer: ${slug} (src/content/blogen/where-to-stay-${slug}.md)`);
  const cityName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  console.log('  📝 Beat-Sheet (Claude)...');
  const sheet = await generateCarouselSheet({ slug, cityName, enBody: body(enMd), apiKey: KEYS.anthropic_api_key });

  // Bilder: cover + content + cta -> renders-social/<slug>/imgK.jpg
  const imgDir = path.join(PUBLIC_SOCIAL, slug);
  if (!existsSync(imgDir)) mkdirSync(imgDir, { recursive: true });
  const queries = [sheet.cover.query, ...sheet.slides.map(s => s.query), sheet.cta.query];
  const imageSrcs = [];
  console.log('  🖼  Stills...');
  for (let i = 0; i < queries.length; i++) {
    const outPath = path.join(imgDir, `img${i}.jpg`);
    await fetchStill({ query: queries[i], apiKey: KEYS.pexels_api_key, outPath });
    imageSrcs.push(`renders-social/${slug}/img${i}.jpg`);
  }

  const slides = buildSlideProps({ sheet, imageSrcs });

  const outDir = path.join(OUT_DIR, slug);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < slides.length; i++) {
    const propsFile = path.join(PUBLIC_SOCIAL, slug, `slide-${i}.props.json`);
    writeFileSync(propsFile, JSON.stringify(slides[i]));
    const num = String(i + 1).padStart(2, '0');
    const outPng = path.join(outDir, `slide-${num}.png`);
    console.log(`  🎨 Slide ${i + 1}/${slides.length}...`);
    execFileSync('npx', ['remotion', 'still', 'src/index.ts', 'Carousel', outPng, `--props=${propsFile}`],
      { cwd: REMOTION_DIR, stdio: 'inherit' });
  }

  writeFileSync(path.join(outDir, 'caption.txt'), sheet.caption + '\n');
  console.log(`\n✅ Fertig: social-output/${slug}/ (${slides.length} Slides + caption.txt)`);
}

const slug = process.argv[2];
if (!slug) { console.error('Usage: node scripts/generate-carousel.mjs <city-slug>'); process.exit(1); }
generate(slug).catch(err => { console.error('❌', err.message); process.exit(1); });
```

- [ ] **Step 3: Voraussetzungen prüfen**

Run: `which npx && ls "$HOME/.zercy-analytics/video-api-keys.json" && ls "/Users/christinebork/Claude Code Projects/zercy-landing/src/content/blogen/where-to-stay-paris.md"`
Expected: alle drei Pfade existieren.

- [ ] **Step 4: Syntax-Check**

Run: `cd "/Users/christinebork/Claude Code Projects/zercy-landing" && node --check scripts/generate-carousel.mjs`
Expected: exit 0.

- [ ] **Step 5: End-to-End-Smoke (Paris)** — echter Claude-Call + Pexels + Remotion-Stills (mehrere Minuten möglich; ggf. im Hintergrund):

Run: `cd "/Users/christinebork/Claude Code Projects/zercy-landing" && node scripts/generate-carousel.mjs paris`
Expected: `social-output/paris/slide-01.png` … `slide-0N.png` (6–8 Stück) + `caption.txt`.

- [ ] **Step 6: Visuelle Verifikation (Pflicht)**

Run: `open "/Users/christinebork/Claude Code Projects/zercy-landing/social-output/paris/slide-01.png"`
Prüfen: Cover-Hook lesbar, Foto + Grade, „SWIPE →", Logo + „1/N"; content-Slides Heading/line/best-for lesbar; CTA-Slide; alle 1080×1350. Caption (`caption.txt`) liest sich als EN IG-Caption mit „link in bio".

- [ ] **Step 7: Commit**
```bash
cd "/Users/christinebork/Claude Code Projects/zercy-landing"
git add scripts/generate-carousel.mjs .gitignore remotion/.gitignore .vercelignore
git status   # sicherstellen: keine PNG/Bilder/social-output gestaged
git commit -m "feat(social): Carousel-Orchestrator + Ignores"
```

---

## Self-Review (vom Plan-Autor)

**Spec-Abdeckung:**
- Slide-Struktur cover/content/cta → Task 1 (Validierung), Task 3 (Props), Task 4 (Rendering). ✓
- Hybrid-Look (Foto + Grade + Marken-Typo, Scrim, Zähler, Logo) → Task 4 (CarouselSlide). ✓
- 1080×1350 → Task 3 (props) + Task 4 (Composition). ✓
- EN-Caption → Task 2 (Prompt erzeugt caption) + Task 5 (caption.txt). ✓
- Bilder via stills.mjs → Task 5. ✓
- Output `social-output/<slug>/` + Ignores → Task 5. ✓
- EN-only (liest blogen) → Task 5 (`readEnArticle`). ✓
- Wiederverwendung (Grade, stills.mjs, Remotion-Root) → Tasks 4, 5. ✓
- Tests für reine Funktionen → Tasks 1, 3. Rendering smoke+visuell → Tasks 4, 6. ✓

**Platzhalter-Scan:** Keine TBD/TODO; jeder Code-Schritt vollständig. ✓

**Typ-Konsistenz:** `parseCarouselSheet`-Output (cover/slides/cta/caption) → `buildSlideProps({sheet,imageSrcs})` → Slide-Props (kind/imageSrc/index/total/Texte) → `SlideProps` in CarouselSlide.tsx. `total = 2 + slides.length`, `imageSrc = renders-social/<topic>/imgK.jpg` durchgängig. Composition-ID „Carousel" konsistent in Root + Orchestrator. ✓
