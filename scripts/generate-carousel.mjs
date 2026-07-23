#!/usr/bin/env node
// scripts/generate-carousel.mjs
// Erzeugt ein IG/FB-Carousel (PNG-Slides + EN-Caption) aus einem Blog-Artikel.
// Usage: node scripts/generate-carousel.mjs paris
// Output: social-output/paris/slide-01.png ... + caption.txt
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { homedir } from 'os';
import path from 'path';

import { generateCarouselSheet, toFacebookCaption } from './social/carousel-beatsheet.mjs';
import { buildSlideProps } from './social/carousel-props.mjs';
import { fetchStill } from './video/stills.mjs';

const KEYS = JSON.parse(readFileSync(`${homedir()}/.zercy-analytics/video-api-keys.json`, 'utf8'));
const BASE_DIR = path.resolve('/Users/christinebork/Claude Code Projects/zercy-landing');
const OUT_DIR = path.join(BASE_DIR, 'social-output');
const REMOTION_DIR = path.join(BASE_DIR, 'remotion');
const PUBLIC_SOCIAL = path.join(REMOTION_DIR, 'public', 'renders-social');

function fmField(md, key) {
  const m = md.match(/^---([\s\S]*?)---/);
  if (!m) return '';
  const r = m[1].match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, 'm'));
  return r ? r[1].trim() : '';
}
// City-Guides (where-to-stay-<slug>) -> Neighborhood-Carousel + where-to-stay-URL.
// Alle anderen Artikel (Produkt-Roundups: gear/clothing/comfort/luggage) -> Produkt-Carousel + /en/blog/<slug>/-URL.
function resolveArticle(slug) {
  const cityPath = path.join(BASE_DIR, 'src/content/blogen', `where-to-stay-${slug}.md`);
  if (existsSync(cityPath)) {
    const md = readFileSync(cityPath, 'utf8');
    const name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return { md, mode: 'city', name, category: '', url: `https://www.zercy.app/en/blog/where-to-stay-${slug}/` };
  }
  const p = path.join(BASE_DIR, 'src/content/blogen', `${slug}.md`);
  if (existsSync(p)) {
    const md = readFileSync(p, 'utf8');
    const name = (fmField(md, 'title').replace(/\s*\|\s*Zercy\s*$/, '').trim()) || slug;
    const PRODUCT_CATS = ['Travel Gear', 'Travel Clothing', 'Luggage & Packing', 'Travel Comfort'];
    const mode = slug.endsWith('-worth-it') ? 'decision' : PRODUCT_CATS.includes(fmField(md, 'category')) ? 'product' : 'guide';
    return { md, mode, name, category: fmField(md, 'category'), url: `https://www.zercy.app/en/blog/${slug}/` };
  }
  return null;
}
function body(md) { return md.replace(/^---[\s\S]+?---\n/, '').replace(/[#*`]/g, '').trim(); }

async function generate(slug) {
  console.log(`\n🎠 Carousel fuer: ${slug}`);
  const art = resolveArticle(slug);
  if (!art) throw new Error(`Kein EN-Artikel fuer: ${slug} (weder where-to-stay-${slug}.md noch ${slug}.md in src/content/blogen)`);
  console.log(`  📂 Modus: ${art.mode} ("${art.name}")`);

  console.log('  📝 Beat-Sheet (Claude)...');
  const sheet = await generateCarouselSheet({ slug, name: art.name, enBody: body(art.md), apiKey: KEYS.anthropic_api_key, mode: art.mode, category: art.category });

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
  writeFileSync(path.join(outDir, 'caption-facebook.txt'), toFacebookCaption(sheet.caption, art.url) + '\n');
  console.log(`\n✅ Fertig: social-output/${slug}/ (${slides.length} Slides + caption.txt + caption-facebook.txt)`);
}

const slug = process.argv[2];
if (!slug) { console.error('Usage: node scripts/generate-carousel.mjs <city-slug>'); process.exit(1); }
generate(slug).catch(err => { console.error('❌', err.message); process.exit(1); });
