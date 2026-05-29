#!/usr/bin/env node
// scripts/make-fb-slideshow.mjs
// Baut aus den gerenderten Carousel-Slides eine Facebook-taugliche Mini-Slideshow (MP4).
// Facebook hat kein Swipe-Carousel fuer organische Posts -> Video ist das beste native Format.
// Usage: node scripts/make-fb-slideshow.mjs paris
// Output: social-output/<slug>/slideshow-facebook.mp4 (1080x1350, 4:5, stumm, autoplay-tauglich)
import { readdirSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';

const BASE_DIR = path.resolve('/Users/christinebork/Claude Code Projects/zercy-landing');
const W = 1080, H = 1350, FPS = 30;
const HOLD = 2.8;        // Sekunden pro Slide
const HOLD_LAST = 3.8;   // CTA-Slide laenger stehen lassen (Link soll haengen bleiben)
const XFADE = 0.5;       // Crossfade-Dauer zwischen Slides

function build(slug) {
  const dir = path.join(BASE_DIR, 'social-output', slug);
  if (!existsSync(dir)) throw new Error(`Kein Output-Ordner: social-output/${slug}`);
  const slides = readdirSync(dir).filter((f) => /^slide-\d+\.png$/.test(f)).sort();
  if (slides.length < 2) throw new Error(`Zu wenige Slides in ${slug} (${slides.length})`);

  const durs = slides.map((_, i) => (i === slides.length - 1 ? HOLD_LAST : HOLD));

  // Inputs: jedes Bild als Standbild-Clip seiner Laenge
  const inputs = [];
  slides.forEach((f, i) => {
    inputs.push('-loop', '1', '-t', String(durs[i]), '-i', path.join(dir, f));
  });

  // Pre-Filter pro Input: exakte Groesse, sar, fps, pixfmt -> xfade-kompatibel
  const pre = slides
    .map((_, i) =>
      `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
      `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${FPS},format=yuv420p[v${i}]`
    )
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
  const args = [
    '-y', ...inputs,
    '-filter_complex', filter,
    '-map', '[vout]',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-movflags', '+faststart',
    outPath,
  ];
  console.log(`🎬 Slideshow fuer ${slug}: ${slides.length} Slides ...`);
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'inherit'] });
  console.log(`✅ Fertig: social-output/${slug}/slideshow-facebook.mp4`);
}

const slug = process.argv[2];
if (!slug) { console.error('Usage: node scripts/make-fb-slideshow.mjs <city-slug>'); process.exit(1); }
build(slug);
