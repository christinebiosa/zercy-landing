#!/usr/bin/env node
// scripts/make-fb-slideshow.mjs
// Baut aus den gerenderten Carousel-Slides eine Slideshow (MP4) fuer FB-Reel + TikTok.
// 9:16 Hochformat (1080x1920) mit unscharfem Hintergrund, lesbares Tempo.
// Usage: node scripts/make-fb-slideshow.mjs paris
// Output: social-output/<slug>/slideshow-facebook.mp4
import { readdirSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';

const BASE_DIR = path.resolve('/Users/christinebork/Claude Code Projects/zercy-landing');
const W = 1080, H = 1920, FPS = 30;   // 9:16 vertikal (TikTok-Vollbild)
const HOLD_COVER = 4.0;   // Cover/Hook
const HOLD = 7.0;         // Inhalts-Slides: viel Zeit zum LESEN (Produkt-Text ist lang)
const HOLD_LAST = 5.0;    // CTA-Slide
const XFADE = 0.5;        // Crossfade

function build(slug) {
  const dir = path.join(BASE_DIR, 'social-output', slug);
  if (!existsSync(dir)) throw new Error(`Kein Output-Ordner: social-output/${slug}`);
  const slides = readdirSync(dir).filter((f) => /^slide-\d+\.png$/.test(f)).sort();
  if (slides.length < 2) throw new Error(`Zu wenige Slides in ${slug} (${slides.length})`);

  const durs = slides.map((_, i) => (i === 0 ? HOLD_COVER : i === slides.length - 1 ? HOLD_LAST : HOLD));

  const inputs = [];
  slides.forEach((f, i) => {
    inputs.push('-loop', '1', '-t', String(durs[i]), '-i', path.join(dir, f));
  });

  // Pro Slide ein 9:16-Frame: unscharfer Vollbild-Hintergrund + zentriertes 4:5-Slide
  // + sanfter Ken-Burns-Zoom (Bewegung -> wirkt wie Video, nicht wie Standbild).
  const pre = slides
    .map((_, i) => {
      const frames = Math.round(durs[i] * FPS);
      return (
        `[${i}:v]split=2[a${i}][b${i}];` +
        `[a${i}]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=24:4[bg${i}];` +
        `[b${i}]scale=${W}:-2:force_original_aspect_ratio=decrease[fg${i}];` +
        `[bg${i}][fg${i}]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=${FPS}[comp${i}];` +
        `[comp${i}]zoompan=z='min(zoom+0.0009,1.14)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${W}x${H}:fps=${FPS},format=yuv420p[v${i}]`
      );
    })
    .join(';');

  // xfade-Kette: offset_k = sum(durs[0..k-1]) - k*XFADE
  let chain = '', last = 'v0', cum = 0;
  for (let k = 1; k < slides.length; k++) {
    cum += durs[k - 1];
    const offset = (cum - k * XFADE).toFixed(3);
    const out = k === slides.length - 1 ? 'vout' : `x${k}`;
    chain += `;[${last}][v${k}]xfade=transition=fade:duration=${XFADE}:offset=${offset}[${out}]`;
    last = out;
  }

  const filter = pre + chain;
  const outPath = path.join(dir, 'slideshow-facebook.mp4');
  const total = durs.reduce((a, b) => a + b, 0) - (slides.length - 1) * XFADE;
  const args = [
    '-y', ...inputs,
    '-filter_complex', filter,
    '-map', '[vout]',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-movflags', '+faststart',
    outPath,
  ];
  console.log(`🎬 Slideshow fuer ${slug}: ${slides.length} Slides, ~${total.toFixed(0)}s, 9:16 ...`);
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] });
  console.log(`✅ Fertig: social-output/${slug}/slideshow-facebook.mp4`);
}

const slug = process.argv[2];
if (!slug) { console.error('Usage: node scripts/make-fb-slideshow.mjs <city-slug>'); process.exit(1); }
build(slug);
