#!/usr/bin/env node
// scripts/finalize-social.mjs
// Einmal-Korrektur fuer bereits erzeugte Staedte:
//  1) CTA-Slide mit fester Marken-Copy (CTA_SUB) neu rendern
//  2) Facebook-Slideshow (MP4) bauen
//  3) caption-facebook.txt aus caption.txt ableiten (echter Link statt "in our bio")
// Usage: node scripts/finalize-social.mjs paris
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';
import { toFacebookCaption, CTA_SUB } from './social/carousel-beatsheet.mjs';

const BASE = path.resolve('/Users/christinebork/Claude Code Projects/zercy-landing');

function finalize(slug) {
  const pdir = path.join(BASE, 'remotion/public/renders-social', slug);
  const outdir = path.join(BASE, 'social-output', slug);
  if (!existsSync(pdir) || !existsSync(outdir)) throw new Error(`Kein Output fuer ${slug}`);

  // 1) CTA-Slide neu rendern
  for (const f of readdirSync(pdir).filter((x) => /^slide-\d+\.props\.json$/.test(x))) {
    const p = path.join(pdir, f);
    const o = JSON.parse(readFileSync(p, 'utf8'));
    if (o.kind !== 'cta') continue;
    o.sub = CTA_SUB;
    writeFileSync(p, JSON.stringify(o));
    const png = path.join(outdir, `slide-${String(o.index).padStart(2, '0')}.png`);
    console.log(`  🎨 ${slug}: CTA neu (${path.basename(png)})`);
    execFileSync('npx', ['remotion', 'still', 'src/index.ts', 'Carousel', png, `--props=${p}`],
      { cwd: path.join(BASE, 'remotion'), stdio: 'inherit' });
  }

  // 2) Facebook-Slideshow
  execFileSync('node', [path.join(BASE, 'scripts/make-fb-slideshow.mjs'), slug], { stdio: 'inherit' });

  // 3) FB-Caption
  const cap = readFileSync(path.join(outdir, 'caption.txt'), 'utf8');
  const url = `https://www.zercy.app/en/blog/where-to-stay-${slug}`;
  writeFileSync(path.join(outdir, 'caption-facebook.txt'), toFacebookCaption(cap, url));
  console.log(`✅ finalize ${slug}`);
}

const slug = process.argv[2];
if (!slug) { console.error('Usage: node scripts/finalize-social.mjs <city-slug>'); process.exit(1); }
finalize(slug);
