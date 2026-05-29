// Generates src/data/hreflang-map.json from photo-mapping.mjs
// Each slug maps to { de, en, es } URLs for hreflang tags.
// Run before build: node scripts/generate-hreflang-map.mjs

import { readdir, writeFile, mkdir } from 'fs/promises';
import { slugToTopic } from './photo-mapping.mjs';

const BASE = 'https://www.zercy.app';

async function getSlugs(dir) {
  const files = await readdir(dir).catch(() => []);
  return files.filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''));
}

const [deSlugs, enSlugs, esSlugs] = await Promise.all([
  getSlugs('src/content/blog'),
  getSlugs('src/content/blogen'),
  getSlugs('src/content/bloges'),
]);

// Group slugs by topic key
const topicMap = {};

for (const slug of deSlugs) {
  const topic = slugToTopic[slug];
  if (topic) {
    if (!topicMap[topic]) topicMap[topic] = {};
    topicMap[topic].de = slug;
  }
}
for (const slug of enSlugs) {
  const topic = slugToTopic[slug];
  if (topic) {
    if (!topicMap[topic]) topicMap[topic] = {};
    topicMap[topic].en = slug;
  }
}
for (const slug of esSlugs) {
  const topic = slugToTopic[slug];
  if (topic) {
    if (!topicMap[topic]) topicMap[topic] = {};
    topicMap[topic].es = slug;
  }
}

// Build final map: slug -> { de, en, es } full URLs
const hreflangMap = {};

for (const [, langs] of Object.entries(topicMap)) {
  const langCount = Object.keys(langs).length;
  if (langCount < 2) continue; // skip if only 1 language version exists

  const entry = {
    de: langs.de ? `${BASE}/blog/${langs.de}/` : null,
    en: langs.en ? `${BASE}/en/blog/${langs.en}/` : null,
    es: langs.es ? `${BASE}/es/blog/${langs.es}/` : null,
  };

  if (langs.de) hreflangMap[langs.de] = entry;
  if (langs.en) hreflangMap[langs.en] = entry;
  if (langs.es) hreflangMap[langs.es] = entry;
}

await mkdir('src/data', { recursive: true });
await writeFile('src/data/hreflang-map.json', JSON.stringify(hreflangMap, null, 2));

const total = [...deSlugs, ...enSlugs, ...esSlugs].length;
const mapped = Object.keys(hreflangMap).length;
const unmapped = total - mapped;

console.log(`✓ hreflang-map.json — ${mapped}/${total} articles mapped (${unmapped} without cross-language match)`);
if (unmapped > 0) {
  const all = [...deSlugs, ...enSlugs, ...esSlugs];
  const missing = all.filter(s => !hreflangMap[s]);
  console.log('  Missing photo-mapping entry:', missing.slice(0, 5).join(', ') + (missing.length > 5 ? ` +${missing.length - 5} more` : ''));
}
