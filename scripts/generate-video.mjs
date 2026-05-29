#!/usr/bin/env node
// scripts/generate-video.mjs
/**
 * Zercy Documentary Reels Pipeline
 * Erzeugt 35-40s Mikro-Dokus (DE/EN/ES) aus einem Blog-Artikel.
 * Usage: node scripts/generate-video.mjs paris
 * Output: video-output/paris-de.mp4, paris-en.mp4, paris-es.mp4
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
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

  const cityName = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  // 1. Beat-Sheet (Claude)
  console.log('  📝 Beat-Sheet...');
  const beatSheet = await generateBeatSheet({
    cityName, deBody: body(deMd), enBody: body(enMd), esBody: body(esMd), apiKey: KEYS.anthropic_api_key,
  });

  // 2. Stills (Bild-Master, sprachunabhaengig) -> public/renders/<slug>/imgN.jpg
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
    try {
      synthVoice({ text: buildNarration(beatSheet, lang), lang, audioPath, srtPath });
    } catch (e) {
      throw new Error(`Voiceover (edge-tts) fehlgeschlagen fuer ${lang}: ${e.message}. Ist edge-tts installiert? (pip install edge-tts)`);
    }

    const audioDurationSec = ffprobeDuration(audioPath);
    const cues = groupCues(parseSrt(readFileSync(srtPath, 'utf8')));

    const props = buildProps({ beatSheet, lang, imageSrcs, audioDurationSec, cues, musicSrc, fps: 30 });
    props.audioSrc = `renders/${slug}/${lang}/voice.mp3`;

    const propsFile = path.join(TEMP_DIR, `${slug}-${lang}.props.json`);
    writeFileSync(propsFile, JSON.stringify(props));

    const rawFile = path.join(TEMP_DIR, `${slug}-${lang}.raw.mp4`);
    console.log(`  🎞  Render ${lang.toUpperCase()}...`);
    execFileSync('npx', ['remotion', 'render', 'src/index.ts', 'DocReel', rawFile, `--props=${propsFile}`],
      { cwd: REMOTION_DIR, stdio: 'inherit' });

    // Remotion gibt Full-Range yuvj420p aus, das QuickTime/Apple-Player nicht abspielen.
    // Auf QuickTime-sicheres Limited-Range yuv420p (bt709) normalisieren.
    const outFile = path.join(OUT_DIR, `${slug}-${lang}.mp4`);
    console.log(`  🎨 Normalisiere ${lang.toUpperCase()} (QuickTime-safe)...`);
    execFileSync('ffmpeg', ['-y', '-i', rawFile,
      '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p',
      '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
      '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
      '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '192k', outFile],
      { stdio: 'inherit' });
    console.log(`    ✓ ${outFile}`);
  }

  console.log(`\n✅ Fertig: video-output/${slug}-{de,en,es}.mp4`);
}

const slug = process.argv[2];
if (!slug) { console.error('Usage: node scripts/generate-video.mjs <city-slug>'); process.exit(1); }
generateCity(slug).catch(err => { console.error('❌', err.message); process.exit(1); });
