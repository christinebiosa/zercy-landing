#!/usr/bin/env node
// scripts/rerender-reels.mjs
// Rendert Reel-Slides NEU aus den gespeicherten Props (slide-N.props.json),
// OHNE Texte/Beat-Sheet neu zu generieren (kein Claude-Call, keine neuen Stills).
// Zweck: Template-Aenderungen (z.B. SWIPE entfernt) auf bestehende Reels anwenden.
// Danach: make-fb-slideshow + prep-social-media pro Slug.
// Usage: node scripts/rerender-reels.mjs            -> alle Slugs mit Props
//        node scripts/rerender-reels.mjs lisbon amsterdam   -> nur diese
import { readdirSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';

const BASE = path.resolve('/Users/christinebork/Claude Code Projects/zercy-landing');
const REMOTION_DIR = path.join(BASE, 'remotion');
const PROPS_ROOT = path.join(REMOTION_DIR, 'public', 'renders-social');
const OUT_ROOT = path.join(BASE, 'social-output');

function slugsWithProps() {
  return readdirSync(PROPS_ROOT, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(s => existsSync(path.join(PROPS_ROOT, s)) &&
      readdirSync(path.join(PROPS_ROOT, s)).some(f => /^slide-\d+\.props\.json$/.test(f)));
}

function rerenderSlug(slug) {
  const propsDir = path.join(PROPS_ROOT, slug);
  const outDir = path.join(OUT_ROOT, slug);
  if (!existsSync(outDir)) { console.log(`  ⚠ ${slug}: kein social-output, skip`); return false; }
  const propFiles = readdirSync(propsDir)
    .filter(f => /^slide-\d+\.props\.json$/.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)) - parseInt(b.match(/\d+/)));
  if (!propFiles.length) { console.log(`  ⚠ ${slug}: keine props, skip`); return false; }

  console.log(`\n▶ ${slug} (${propFiles.length} Slides)`);
  for (const pf of propFiles) {
    const i = parseInt(pf.match(/\d+/));
    const num = String(i + 1).padStart(2, '0');
    const outPng = path.join(outDir, `slide-${num}.png`);
    const propsFile = path.join(propsDir, pf);
    execFileSync('npx', ['remotion', 'still', 'src/index.ts', 'Carousel', outPng, `--props=${propsFile}`],
      { cwd: REMOTION_DIR, stdio: ['ignore', 'ignore', 'inherit'] });
    process.stdout.write(`  🎨 ${num}`);
  }
  console.log('');
  // Slideshow + Medien neu bauen
  execFileSync('node', ['scripts/make-fb-slideshow.mjs', slug], { cwd: BASE, stdio: ['ignore', 'ignore', 'inherit'] });
  execFileSync('node', ['scripts/prep-social-media.mjs', slug], { cwd: BASE, stdio: ['ignore', 'ignore', 'inherit'] });
  console.log(`  ✅ ${slug}: Slides + Slideshow + Medien neu`);
  return true;
}

const args = process.argv.slice(2);
const slugs = args.length ? args : slugsWithProps();
console.log(`🔁 Re-Render ${slugs.length} Reels (ohne Text-Neugenerierung):\n${slugs.join(', ')}`);
let ok = 0;
for (const s of slugs) { try { if (rerenderSlug(s)) ok++; } catch (e) { console.error(`  ❌ ${s}: ${e.message}`); } }
console.log(`\n🏁 Fertig: ${ok}/${slugs.length} Reels neu gerendert.`);
