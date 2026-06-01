// scripts/video/stills.mjs
import { writeFileSync, existsSync } from 'fs';

export function selectStill(response) {
  const photos = (response?.photos || []).filter(p => p.height > p.width && p.width >= 600);
  if (photos.length === 0) return null;
  photos.sort((a, b) => (b.width * b.height) - (a.width * a.height));
  const best = photos[0];
  return best.src.portrait || best.src.large2x || best.src.original || null;
}

export async function fetchStill({ query, apiKey, outPath }) {
  if (existsSync(outPath)) return outPath;
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=portrait&per_page=15`;
  const res = await fetch(url, { headers: { Authorization: apiKey } });
  if (!res.ok) throw new Error(`Pexels HTTP ${res.status} fuer "${query}"`);
  const data = await res.json();
  const imgUrl = selectStill(data);
  if (!imgUrl) throw new Error(`Kein Hochformat-Still fuer "${query}"`);
  // User-Agent noetig, sonst blockt der Pexels-CDN (Cloudflare) und liefert eine HTML-Seite.
  const imgRes = await fetch(imgUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0 Safari/537.36' } });
  const buf = Buffer.from(await imgRes.arrayBuffer());
  // JPEG-Magic-Bytes pruefen (FF D8 FF) -> nie HTML/Fehlerseiten als .jpg schreiben.
  if (buf.length < 1000 || buf[0] !== 0xff || buf[1] !== 0xd8) {
    throw new Error(`Kein gueltiges JPEG fuer "${query}" (CDN-Block/Fehlerseite, ${buf.length} bytes)`);
  }
  writeFileSync(outPath, buf);
  return outPath;
}
