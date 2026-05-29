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
