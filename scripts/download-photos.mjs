// Downloads one Unsplash photo per topic key, saves to public/img/blog/{topic}.jpg
// Then updates frontmatter of every md file with heroImage: /img/blog/{topic}.jpg
//
// Usage:
//   node scripts/download-photos.mjs              -> download missing topics + update frontmatter
//   node scripts/download-photos.mjs --frontmatter-only  -> only update frontmatter (no API calls)
//
// Rate limit: Demo tier = 50 req/hour. Script sleeps 75s between calls to stay safe.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { slugToTopic, topicToQuery } from './photo-mapping.mjs';

// Load .env manually (no dotenv dep)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.+)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}
const KEY = process.env.UNSPLASH_ACCESS_KEY;
if (!KEY) {
  console.error('UNSPLASH_ACCESS_KEY missing in .env');
  process.exit(1);
}

const IMG_DIR = path.join(ROOT, 'public', 'img', 'blog');
fs.mkdirSync(IMG_DIR, { recursive: true });

const SLEEP_MS = parseInt(process.env.SLEEP_MS || '75000', 10); // 75s default → 48 calls/hour
const FRONTMATTER_ONLY = process.argv.includes('--frontmatter-only');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchUnsplashPhoto(query) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&content_filter=high`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${KEY}` } });
  if (!res.ok) throw new Error(`Unsplash search ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error(`No results for: ${query}`);
  return data.results[0]; // first result = most relevant
}

async function downloadPhoto(photo, dest) {
  // Use 'regular' size (1080w) - good quality, ~150-300KB
  const imgUrl = photo.urls.regular;
  const res = await fetch(imgUrl);
  if (!res.ok) throw new Error(`Download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return buf.length;
}

async function ensureTopicPhoto(topic) {
  const dest = path.join(IMG_DIR, `${topic}.jpg`);
  if (fs.existsSync(dest)) {
    return { topic, status: 'exists', size: fs.statSync(dest).size };
  }
  const query = topicToQuery[topic];
  if (!query) throw new Error(`No query for topic: ${topic}`);
  const photo = await fetchUnsplashPhoto(query);
  const size = await downloadPhoto(photo, dest);
  return { topic, status: 'downloaded', size, photographer: photo.user.name, query };
}

function updateFrontmatter(filePath, heroImage) {
  const content = fs.readFileSync(filePath, 'utf8');
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) return { skipped: true, reason: 'no frontmatter' };

  const fm = fmMatch[1];
  if (fm.includes('heroImage:')) {
    // Replace existing
    const updated = fm.replace(/^heroImage:.*$/m, `heroImage: "${heroImage}"`);
    if (updated === fm) return { skipped: true, reason: 'already same' };
    const newContent = '---\n' + updated + '\n---\n' + content.slice(fmMatch[0].length);
    fs.writeFileSync(filePath, newContent);
    return { updated: true, action: 'replaced' };
  }
  // Insert after readingTime
  const updated = fm.replace(/(^readingTime:.*$)/m, `$1\nheroImage: "${heroImage}"`);
  if (updated === fm) {
    // No readingTime? Append at end
    const updated2 = fm + `\nheroImage: "${heroImage}"`;
    const newContent = '---\n' + updated2 + '\n---\n' + content.slice(fmMatch[0].length);
    fs.writeFileSync(filePath, newContent);
    return { updated: true, action: 'appended' };
  }
  const newContent = '---\n' + updated + '\n---\n' + content.slice(fmMatch[0].length);
  fs.writeFileSync(filePath, newContent);
  return { updated: true, action: 'inserted' };
}

async function main() {
  const topics = [...new Set(Object.values(slugToTopic))];
  const downloaded = [];
  const failed = [];

  if (!FRONTMATTER_ONLY) {
    console.log(`\nDownloading photos for ${topics.length} unique topics...`);
    let i = 0;
    for (const topic of topics) {
      i++;
      try {
        const result = await ensureTopicPhoto(topic);
        if (result.status === 'exists') {
          console.log(`  [${i}/${topics.length}] ✓ ${topic} (cached, ${(result.size/1024).toFixed(0)}KB)`);
          continue;
        }
        downloaded.push(result);
        console.log(`  [${i}/${topics.length}] ↓ ${topic} (${(result.size/1024).toFixed(0)}KB) by ${result.photographer}`);
        // Rate limit: only sleep if we actually downloaded
        if (i < topics.length) await sleep(SLEEP_MS);
      } catch (e) {
        failed.push({ topic, error: e.message });
        console.log(`  [${i}/${topics.length}] ✗ ${topic}: ${e.message}`);
      }
    }
    console.log(`\nDownloads: ${downloaded.length} new, ${topics.length - downloaded.length - failed.length} cached, ${failed.length} failed.`);
    if (failed.length) {
      console.log('\nFailed topics:'); failed.forEach(f => console.log(`  - ${f.topic}: ${f.error}`));
    }
  }

  // Update frontmatter for all md files
  console.log('\nUpdating frontmatter...');
  const dirs = ['src/content/blog', 'src/content/blogen', 'src/content/bloges'];
  let updated = 0, skipped = 0, missingMap = 0;
  for (const dir of dirs) {
    const fullDir = path.join(ROOT, dir);
    if (!fs.existsSync(fullDir)) continue;
    for (const file of fs.readdirSync(fullDir).filter(f => f.endsWith('.md'))) {
      const slug = file.replace('.md', '');
      const topic = slugToTopic[slug];
      if (!topic) {
        missingMap++;
        console.log(`  ? ${slug} (no mapping)`);
        continue;
      }
      const heroImage = `/img/blog/${topic}.jpg`;
      const imgFile = path.join(IMG_DIR, `${topic}.jpg`);
      if (!fs.existsSync(imgFile)) {
        skipped++;
        continue; // photo wasn't downloaded yet
      }
      const result = updateFrontmatter(path.join(fullDir, file), heroImage);
      if (result.updated) updated++;
      else skipped++;
    }
  }
  console.log(`Frontmatter: ${updated} updated, ${skipped} skipped, ${missingMap} no mapping.`);
}

main().catch(e => { console.error(e); process.exit(1); });
