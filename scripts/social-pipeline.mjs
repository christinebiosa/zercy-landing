#!/usr/bin/env node
// scripts/social-pipeline.mjs
// EIN Befehl: aus einem Blog-Artikel -> IG-Carousel + FB-Reel live posten.
// node scripts/social-pipeline.mjs tokyo
//   --skip-deploy   wenn die Medien schon auf zercy.app liegen
//   --ig-only / --fb-only   nur eine Plattform posten
//   --no-post       alles bauen + deployen, aber NICHT posten (Test)
import { existsSync } from 'fs';
import { execFileSync } from 'child_process';
import path from 'path';

const BASE = path.resolve('/Users/christinebork/Claude Code Projects/zercy-landing');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function run(cmd, args, fatal = true) {
  console.log(`\n▶ ${cmd} ${args.join(' ')}`);
  try {
    execFileSync(cmd, args, { cwd: BASE, stdio: 'inherit' });
  } catch (e) {
    if (fatal) throw e;
    console.warn(`  ⚠ ${cmd} fehlgeschlagen (nicht fatal): ${e.message}`);
  }
}

async function waitPublic(url, tries = 30) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(url, { method: 'HEAD' }); if (r.ok) return true; } catch {}
    await sleep(4000);
  }
  throw new Error(`Medium nicht oeffentlich nach Deploy: ${url}`);
}

async function main() {
  const slug = process.argv[2];
  if (!slug) { console.error('Usage: node scripts/social-pipeline.mjs <slug> [--skip-deploy --ig-only --fb-only --no-post]'); process.exit(1); }
  const flags = process.argv.slice(3);
  const skipDeploy = flags.includes('--skip-deploy');
  const noPost = flags.includes('--no-post');
  const platformFlags = flags.filter((f) => f === '--ig-only' || f === '--fb-only');

  const out = path.join(BASE, 'social-output', slug);

  console.log(`\n🎯 Social-Pipeline: ${slug}`);

  // 1) Carousel (Slides + Captions) — nur wenn noch nicht da
  if (!existsSync(path.join(out, 'caption.txt'))) run('node', ['scripts/generate-carousel.mjs', slug]);
  else console.log(`✓ Carousel existiert bereits (${slug})`);

  // 2) FB-Slideshow — nur wenn noch nicht da
  if (!existsSync(path.join(out, 'slideshow-facebook.mp4'))) run('node', ['scripts/make-fb-slideshow.mjs', slug]);
  else console.log('✓ FB-Slideshow existiert bereits');

  // 3) Medien aufbereiten (PNG->JPEG, nach public/social/)
  run('node', ['scripts/prep-social-media.mjs', slug]);

  // 4) Deploy (Medien oeffentlich machen) + Git-Sync (nicht fatal)
  if (!skipDeploy) {
    run('git', ['add', `public/social/${slug}`], false);
    run('git', ['commit', '-m', `feat(social): ${slug}-Medien fuer Auto-Post`], false);
    run('git', ['push', 'origin', 'main'], false);
    run('npx', ['vercel', '--prod', '--force', '--archive=tgz']);
    console.log('\n⏳ Warte, bis die Medien auf zercy.app live sind...');
    await waitPublic(`https://www.zercy.app/social/${slug}/slide-01.jpg`);
    await waitPublic(`https://www.zercy.app/social/${slug}/slideshow-facebook.mp4`);
    console.log('✓ Medien oeffentlich erreichbar');
  }

  // 5) Posten
  if (noPost) { console.log('\n⏹ --no-post: gebaut + deployed, NICHT gepostet.'); return; }
  run('node', ['scripts/post-social.mjs', slug, ...platformFlags]);
  console.log(`\n🎉 Pipeline fertig: ${slug} ist live (IG + FB).`);
}

main().catch((e) => { console.error('❌ Pipeline:', e.message); process.exit(1); });
