// scripts/video/music.mjs
export function pickTrack(tracks, cityName) {
  if (!tracks || tracks.length === 0) throw new Error('keine Musik in der Bibliothek');
  let hash = 0;
  for (const ch of cityName) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return tracks[hash % tracks.length];
}
