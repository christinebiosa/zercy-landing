// Upgrades articles from shared topic-based photos to unique per-slug photos.
// Targets all articles with pubDate: 2026-05-09 that don't yet have a {slug}.jpg file.
//
// Strategy: group slugs by topic → 1 Unsplash API call per topic group → distribute
// different results to each slug. Stays well under 50 req/hour demo limit.
//
// Usage:
//   node scripts/upgrade-to-per-slug-photos.mjs
//   SLEEP_MS=2000 node scripts/upgrade-to-per-slug-photos.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { slugToTopic, topicToQuery } from './photo-mapping.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Load .env
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}
const KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!KEY) { console.error('UNSPLASH_ACCESS_KEY missing in .env'); process.exit(1); }

const IMG_DIR = path.join(ROOT, 'public', 'img', 'blog');
const SLEEP_MS = parseInt(process.env.SLEEP_MS || '2000', 10);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TARGET_DATE = '2026-05-09';
const CONTENT_DIRS = ['src/content/blog', 'src/content/blogen', 'src/content/bloges'];

function getTargetSlugs() {
  const results = [];
  for (const dir of CONTENT_DIRS) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    for (const file of fs.readdirSync(fullDir).filter(f => f.endsWith('.md'))) {
      const slug = file.replace('.md', '');
      const filePath = path.join(fullDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      if (!content.includes(`pubDate: ${TARGET_DATE}`)) continue;
      if (!slugToTopic[slug]) continue;
      if (fs.existsSync(path.join(IMG_DIR, `${slug}.jpg`))) continue; // already done
      results.push({ slug, filePath });
    }
  }
  return results;
}

async function searchUnsplash(query, count) {
  const perPage = Math.min(Math.max(count + 5, 10), 30);
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=landscape&content_filter=high`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${KEY}` } });
  if (!res.ok) throw new Error(`Unsplash ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (!data.results?.length) throw new Error(`No results for: ${query}`);
  return data.results;
}

async function downloadPhoto(photo, dest) {
  const res = await fetch(photo.urls.regular);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

function updateFrontmatter(filePath, slug) {
  const heroImage = `/img/blog/${slug}.jpg`;
  const content = fs.readFileSync(filePath, 'utf8');
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) return false;
  const fm = fmMatch[1];
  const updated = fm.replace(/^heroImage:.*$/m, `heroImage: "${heroImage}"`);
  if (updated === fm) return false;
  const newContent = '---\n' + updated + '\n---\n' + content.slice(fmMatch[0].length);
  fs.writeFileSync(filePath, newContent);
  return true;
}

async function main() {
  const targets = getTargetSlugs();
  if (targets.length === 0) {
    console.log('No articles need upgrading.');
    return;
  }
  console.log(`Found ${targets.length} articles to upgrade (pubDate: ${TARGET_DATE})\n`);

  // Group by topic
  const topicGroups = {};
  for (const t of targets) {
    const topic = slugToTopic[t.slug];
    if (!topicGroups[topic]) topicGroups[topic] = [];
    topicGroups[topic].push(t);
  }

  const topicList = Object.entries(topicGroups);
  console.log(`${topicList.length} topic groups → ${topicList.length} API calls (${SLEEP_MS/1000}s apart)\n`);

  let downloaded = 0, failed = 0, frontmattersUpdated = 0;

  for (let i = 0; i < topicList.length; i++) {
    const [topic, items] = topicList[i];
    const query = topicToQuery[topic];
    const prefix = `[${i + 1}/${topicList.length}]`;

    if (!query) {
      console.log(`${prefix} ✗ ${topic}: no query defined in topicToQuery`);
      failed += items.length;
      continue;
    }

    try {
      const results = await searchUnsplash(query, items.length);
      console.log(`${prefix} "${topic}" (${items.length} slugs, ${results.length} results fetched)`);

      for (let j = 0; j < items.length; j++) {
        const { slug, filePath } = items[j];
        const photo = results[j % results.length];
        const dest = path.join(IMG_DIR, `${slug}.jpg`);
        const size = await downloadPhoto(photo, dest);
        const updated = updateFrontmatter(filePath, slug);
        if (updated) frontmattersUpdated++;
        downloaded++;
        console.log(`  ↓ ${slug}.jpg (${(size / 1024).toFixed(0)}KB) by ${photo.user.name}${updated ? '' : ' [frontmatter unchanged]'}`);
      }
    } catch (e) {
      console.log(`${prefix} ✗ ${topic}: ${e.message}`);
      failed += items.length;
    }

    if (i < topicList.length - 1) await sleep(SLEEP_MS);
  }

  console.log(`\nDone: ${downloaded} photos, ${frontmattersUpdated} frontmatters updated, ${failed} failed`);
}

main().catch(e => { console.error(e); process.exit(1); });
