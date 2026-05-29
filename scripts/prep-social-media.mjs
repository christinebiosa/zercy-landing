#!/usr/bin/env node
// scripts/prep-social-media.mjs
// Bereitet die Carousel-Medien fuer das Auto-Posting vor:
//  - konvertiert PNG-Slides -> JPEG (IG-API akzeptiert kein PNG)
//  - kopiert JPEGs + Slideshow-MP4 nach public/social/<slug>/ (wird via zercy.app oeffentlich)
// Usage: node scripts/prep-social-media.mjs tokyo
import { readdirSync, mkdirSync, copyFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';

const BASE = path.resolve('/Users/christinebork/Claude Code Projects/zercy-landing');

function prep(slug) {
  const src = path.join(BASE, 'social-output', slug);
  const dst = path.join(BASE, 'public', 'social', slug);
  if (!existsSync(src)) throw new Error(`Kein social-output/${slug}`);
  mkdirSync(dst, { recursive: true });

  const slides = readdirSync(src).filter((f) => /^slide-\d+\.png$/.test(f)).sort();
  if (!slides.length) throw new Error(`Keine Slides in ${slug}`);
  for (const f of slides) {
    const out = path.join(dst, f.replace('.png', '.jpg'));
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '90', path.join(src, f), '--out', out],
      { stdio: 'ignore' });
  }
  const mp4 = path.join(src, 'slideshow-facebook.mp4');
  const hasVideo = existsSync(mp4);
  if (hasVideo) copyFileSync(mp4, path.join(dst, 'slideshow-facebook.mp4'));

  console.log(`✅ prep ${slug}: ${slides.length} JPEGs${hasVideo ? ' + Video' : ''} -> public/social/${slug}/`);
  console.log(`   Danach deployen, dann: node scripts/post-social.mjs ${slug}`);
}

const slug = process.argv[2];
if (!slug) { console.error('Usage: node scripts/prep-social-media.mjs <slug>'); process.exit(1); }
prep(slug);
