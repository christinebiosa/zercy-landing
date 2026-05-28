// scripts/video/srt.mjs

function tsToMs(ts) {
  // Format HH:MM:SS,mmm
  const m = ts.trim().match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!m) return null;
  const [, h, min, s, ms] = m;
  return ((+h * 60 + +min) * 60 + +s) * 1000 + +ms;
}

export function parseSrt(text) {
  if (!text || !text.trim()) return [];
  const blocks = text.replace(/\r/g, '').trim().split(/\n\n+/);
  const cues = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const timeLine = lines.find(l => l.includes('-->'));
    if (!timeLine) continue;
    const [a, b] = timeLine.split('-->');
    const startMs = tsToMs(a);
    const endMs = tsToMs(b);
    if (startMs == null || endMs == null) continue;
    const textLines = lines.slice(lines.indexOf(timeLine) + 1).join(' ').trim();
    if (textLines) cues.push({ startMs, endMs, text: textLines });
  }
  return cues;
}
