// Einmal-Fetch: ein Unsplash-Foto fuer EINEN Topic holen + speichern.
// Usage: node scripts/fetch-one-photo.mjs "airport lounge" priority-pass
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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
if (!KEY) { console.error('UNSPLASH_ACCESS_KEY missing'); process.exit(1); }

const query = process.argv[2];
const topic = process.argv[3];
if (!query || !topic) { console.error('Usage: node fetch-one-photo.mjs "<query>" <topic>'); process.exit(1); }

const dest = path.join(ROOT, 'public', 'img', 'blog', `${topic}.jpg`);

const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&content_filter=high`;
const res = await fetch(url, { headers: { Authorization: `Client-ID ${KEY}` } });
if (!res.ok) { console.error(`Unsplash ${res.status}: ${await res.text()}`); process.exit(1); }
const data = await res.json();
if (!data.results || !data.results.length) { console.error(`No results for: ${query}`); process.exit(1); }
const photo = data.results[0];
const imgRes = await fetch(photo.urls.regular);
const buf = Buffer.from(await imgRes.arrayBuffer());
fs.writeFileSync(dest, buf);
console.log(`Saved ${dest} (${Math.round(buf.length/1024)} KB) by ${photo.user?.name} — ${photo.links?.html}`);
