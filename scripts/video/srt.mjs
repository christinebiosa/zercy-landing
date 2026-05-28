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

export function groupCues(cues, { maxWords = 6, maxMs = 2800 } = {}) {
  const out = [];
  let cur = null;
  let words = 0;
  for (const c of cues) {
    if (!cur) {
      cur = { startMs: c.startMs, endMs: c.endMs, text: c.text };
      words = 1;
    } else {
      cur.text += ' ' + c.text;
      cur.endMs = c.endMs;
      words++;
    }
    const endsSentence = /[.!?…]$/.test(c.text);
    const tooLong = words >= maxWords || (cur.endMs - cur.startMs) >= maxMs;
    if (endsSentence || tooLong) {
      out.push(cur);
      cur = null;
      words = 0;
    }
  }
  if (cur) out.push(cur);
  return out;
}
