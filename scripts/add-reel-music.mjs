#!/usr/bin/env node
// scripts/add-reel-music.mjs
// Legt einen lizenzfreien Musik-Track unter die stumme Slideshow und schreibt
// slideshow-music.mp4 (NUR fuer IG/FB). Die stumme slideshow-facebook.mp4 bleibt
// fuer TikTok (dort legt Christine manuell den Trending-Sound drauf -> kein Doppel-Ton).
// Schnell: -c:v copy (kein Video-Neuencoding), nur Audio wird gemuxt (volume + Fades).
// Track: assets/music/zercy-reel-music.mp3 (Carefree, Kevin MacLeod, CC BY 4.0 -> Credit in Caption).
// Usage: node scripts/add-reel-music.mjs            -> alle slugs mit slideshow-facebook.mp4
//        node scripts/add-reel-music.mjs lisbon ...  -> nur diese
import { readdirSync, existsSync } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';

const BASE = path.resolve('/Users/christinebork/Claude Code Projects/zercy-landing');
const MUSIC = path.join(BASE, 'assets', 'music', 'zercy-reel-music.mp3');
const SILENT = 'slideshow-facebook.mp4';
const MUSIC_OUT = 'slideshow-music.mp4';

function probeDur(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file], { encoding: 'utf8' });
  return parseFloat(out.trim());
}

// Mux Musik unter ein stummes Video -> outMp4 (in place sicher via tmp). Exportiert fuer Pipeline.
export function muxMusic(videoPath, outMp4) {
  if (!existsSync(MUSIC)) { console.log('  ⚠ kein Musik-Track, skip'); return false; }
  const dur = probeDur(videoPath);
  const fadeOut = Math.max(0, dur - 2).toFixed(2);
  const af = `volume=0.8,afade=t=in:st=0:d=1.2,afade=t=out:st=${fadeOut}:d=2`;
  execFileSync('ffmpeg', ['-y', '-i', videoPath, '-stream_loop', '-1', '-i', MUSIC,
    '-map', '0:v:0', '-map', '1:a:0', '-shortest',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-af', af,
    '-movflags', '+faststart', outMp4], { stdio: ['ignore', 'ignore', 'inherit'] });
  return true;
}

function processDir(dir) {
  const silent = path.join(dir, SILENT);
  if (!existsSync(silent)) return false;
  const out = path.join(dir, MUSIC_OUT);
  return muxMusic(silent, out);
}

if (process.argv[1] && process.argv[1].endsWith('add-reel-music.mjs')) {
  const args = process.argv.slice(2);
  const roots = [path.join(BASE, 'social-output'), path.join(BASE, 'public', 'social')];
  let slugs = args;
  if (!slugs.length) {
    const set = new Set();
    for (const r of roots) if (existsSync(r)) for (const d of readdirSync(r, { withFileTypes: true })) if (d.isDirectory() && existsSync(path.join(r, d.name, SILENT))) set.add(d.name);
    slugs = [...set];
  }
  console.log(`🎵 Musik einbetten (IG/FB) in ${slugs.length} Reels: ${slugs.join(', ')}`);
  let ok = 0;
  for (const s of slugs) {
    let did = false;
    for (const r of roots) { try { if (processDir(path.join(r, s))) did = true; } catch (e) { console.error(`  ❌ ${s} (${r}): ${e.message}`); } }
    if (did) { ok++; console.log(`  ✅ ${s}`); }
  }
  console.log(`\n🏁 Fertig: ${ok}/${slugs.length} Reels haben jetzt slideshow-music.mp4`);
}
