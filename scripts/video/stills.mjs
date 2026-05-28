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
  const imgRes = await fetch(imgUrl);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  writeFileSync(outPath, buf);
  return outPath;
}
