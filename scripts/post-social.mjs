#!/usr/bin/env node
// scripts/post-social.mjs
// Postet ein Stadt-Carousel automatisch auf Instagram (Carousel) + Facebook (Slideshow-Video)
// via Meta Graph API. Medien muessen vorher per prep-social-media.mjs + Deploy oeffentlich sein.
// Usage: node scripts/post-social.mjs tokyo
//   --ig-only / --fb-only   nur eine Plattform
//   --dry-run               nur Medien-URLs pruefen, NICHT posten
import { readFileSync, readdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

const BASE = path.resolve('/Users/christinebork/Claude Code Projects/zercy-landing');
const GV = 'v21.0';
const PUBLIC_BASE = 'https://www.zercy.app/social';
const cfg = JSON.parse(readFileSync(`${homedir()}/.zercy-analytics/meta-api.json`, 'utf8'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function graph(endpoint, { params = {}, method = 'GET', token }) {
  const url = new URL(`https://graph.facebook.com/${GV}/${endpoint}`);
  let res;
  if (method === 'GET') {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('access_token', token);
    res = await fetch(url);
  } else {
    const body = new URLSearchParams({ ...params, access_token: token });
    res = await fetch(url, { method: 'POST', body });
  }
  const j = await res.json();
  if (j.error) throw new Error(`${endpoint}: ${j.error.message} (code ${j.error.code})`);
  return j;
}

async function assertPublic(u) {
  const r = await fetch(u, { method: 'HEAD' });
  if (!r.ok) throw new Error(`Medium nicht oeffentlich erreichbar (deploy noetig?): ${u} -> ${r.status}`);
}

async function waitFinished(containerId, token, label, tries = 30) {
  for (let i = 0; i < tries; i++) {
    const s = await graph(containerId, { params: { fields: 'status_code' }, token });
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR') throw new Error(`${label}: Container-Verarbeitung fehlgeschlagen`);
    await sleep(3000);
  }
  throw new Error(`${label}: Container nicht rechtzeitig FINISHED`);
}

// media_publish wirft manchmal 9007 ("Media ID is not available"), obwohl der Container
// FINISHED meldet — kurze Verzoegerung + Retry loest das zuverlaessig.
async function publishWithRetry(igId, creationId, token) {
  for (let i = 0; i < 6; i++) {
    try {
      return await graph(`${igId}/media_publish`, { method: 'POST', params: { creation_id: creationId }, token });
    } catch (e) {
      if (/9007|not available/i.test(e.message) && i < 5) { await sleep(6000); continue; }
      throw e;
    }
  }
}

async function postInstagram(slug, pageTok) {
  // IG als REEL (9:16-Video) statt Carousel -> mehr Reichweite. Gleiche Video-Datei wie FB/TikTok.
  const igId = cfg.ig_user_id;
  const videoUrl = `${PUBLIC_BASE}/${slug}/slideshow-facebook.mp4`;
  const caption = readFileSync(path.join(BASE, 'social-output', slug, 'caption.txt'), 'utf8').trim();

  console.log('  📸 IG: Reel-Video pruefen...');
  await assertPublic(videoUrl);
  console.log('  📸 IG: Reel-Container erstellen (Video-Verarbeitung dauert etwas)...');
  const c = await graph(`${igId}/media`, {
    method: 'POST',
    params: { media_type: 'REELS', video_url: videoUrl, caption, share_to_feed: 'true' },
    token: pageTok,
  });
  await waitFinished(c.id, pageTok, 'IG-Reel', 45); // Video braucht laenger
  await sleep(3000);
  const pub = await publishWithRetry(igId, c.id, pageTok);
  console.log(`  ✅ IG-Reel veroeffentlicht: media id ${pub.id}`);
  return pub.id;
}

async function postFacebook(slug, pageTok) {
  const pageId = cfg.fb_page_id;
  const videoUrl = `${PUBLIC_BASE}/${slug}/slideshow-facebook.mp4`;
  const caption = readFileSync(path.join(BASE, 'social-output', slug, 'caption-facebook.txt'), 'utf8').trim();

  console.log('  🎬 FB: Video pruefen...');
  await assertPublic(videoUrl);
  console.log('  🎬 FB: Video posten (file_url)...');
  const v = await graph(`${pageId}/videos`, { method: 'POST', params: { file_url: videoUrl, description: caption }, token: pageTok });
  console.log(`  ✅ FB gepostet: video id ${v.id} (Verarbeitung dauert ~1 Min, dann sichtbar)`);
  return v.id;
}

async function main() {
  const slug = process.argv[2];
  if (!slug) { console.error('Usage: node scripts/post-social.mjs <slug> [--ig-only|--fb-only|--dry-run]'); process.exit(1); }
  const args = process.argv.slice(3);
  const igOnly = args.includes('--ig-only');
  const fbOnly = args.includes('--fb-only');
  const dry = args.includes('--dry-run');

  if (!cfg.system_user_token || !cfg.ig_user_id || !cfg.fb_page_id) throw new Error('meta-api.json unvollstaendig');

  console.log(`\n🚀 Auto-Post: ${slug}`);
  const pageTok = (await graph(cfg.fb_page_id, { params: { fields: 'access_token' }, token: cfg.system_user_token })).access_token;

  if (dry) {
    const dir = path.join(BASE, 'public', 'social', slug);
    if (!existsSync(dir)) throw new Error(`public/social/${slug} fehlt — erst prep + deploy`);
    const slides = readdirSync(dir).filter((f) => /^slide-\d+\.jpg$/.test(f)).sort();
    for (const f of slides) await assertPublic(`${PUBLIC_BASE}/${slug}/${f}`);
    await assertPublic(`${PUBLIC_BASE}/${slug}/slideshow-facebook.mp4`);
    console.log(`✅ DRY-RUN ok: ${slides.length} Slides + Video oeffentlich erreichbar. Bereit zum Posten.`);
    return;
  }

  if (!fbOnly) await postInstagram(slug, pageTok);
  if (!igOnly) await postFacebook(slug, pageTok);
  console.log(`\n✅ Fertig: ${slug} ist live.`);
}

main().catch((e) => { console.error('❌', e.message); process.exit(1); });
