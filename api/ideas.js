const Anthropic = require('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const { getZercySystemPrompt } = require('./_zercy-identity');

// Tolerant JSON extractor — handles markdown fences, trailing commas,
// control chars in strings, and TRUNCATED responses (closes open strings/braces).
function extractJson(raw) {
  raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = raw.indexOf('{');
  if (start === -1) throw new Error('No JSON found in response');
  let depth = 0, end = -1;
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === '{') depth++;
    else if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  let jsonStr = end !== -1 ? raw.substring(start, end + 1) : raw.substring(start);

  const repairControlChars = (s) => {
    let out = '', inStr = false, esc = false;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (esc) { out += ch; esc = false; continue; }
      if (ch === '\\' && inStr) { out += ch; esc = true; continue; }
      if (ch === '"') { inStr = !inStr; out += ch; continue; }
      if (inStr) {
        if (ch === '\n') { out += '\\n'; continue; }
        if (ch === '\r') { out += '\\r'; continue; }
        if (ch === '\t') { out += '\\t'; continue; }
      }
      out += ch;
    }
    return out;
  };

  // Close a truncated JSON: drop incomplete trailing string, then close open braces/brackets
  const closeTruncated = (s) => {
    let inStr = false, esc = false;
    let stack = []; // '{' or '['
    let lastSafe = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (esc) { esc = false; continue; }
      if (inStr) {
        if (ch === '\\') { esc = true; continue; }
        if (ch === '"') { inStr = false; lastSafe = i + 1; }
        continue;
      }
      if (ch === '"') { inStr = true; continue; }
      if (ch === '{' || ch === '[') { stack.push(ch); lastSafe = i + 1; }
      else if (ch === '}' || ch === ']') { stack.pop(); lastSafe = i + 1; }
      else if (ch === ',' || /\s/.test(ch)) { lastSafe = i + 1; }
    }
    let trimmed = s.substring(0, lastSafe).replace(/,\s*$/, '');
    // Close anything still open
    while (stack.length) {
      const open = stack.pop();
      trimmed += open === '{' ? '}' : ']';
    }
    return trimmed;
  };

  const repair = (s) => s.replace(/,\s*([}\]])/g, '$1');

  const attempts = [
    () => JSON.parse(jsonStr),
    () => JSON.parse(repair(jsonStr)),
    () => JSON.parse(repair(repairControlChars(jsonStr))),
    () => JSON.parse(repair(closeTruncated(repairControlChars(jsonStr)))),
  ];
  let lastErr;
  for (const fn of attempts) {
    try { return fn(); } catch (e) { lastErr = e; }
  }
  throw new Error('JSON parse failed: ' + lastErr.message);
}

async function withRetry(fn, attempts = 2) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      const status = e?.status || e?.response?.status;
      const transient = status === 529 || status === 503 || status === 500 || status === 429;
      if (!transient || i === attempts - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr;
}

function daysBetween(d1, d2) {
  if (!d1 || !d2) return 0;
  const a = new Date(d1 + 'T00:00:00');
  const b = new Date(d2 + 'T00:00:00');
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { destination, checkin, checkout, language, arrivalTime, departureTime } = req.body || {};
  if (!destination) return res.status(400).json({ error: 'Destination required' });

  const lang = language || 'en';
  const numDays = checkin && checkout ? Math.max(1, daysBetween(checkin, checkout)) : 3;
  const totalDays = Math.min(numDays + 1, 7); // cap at 7 days for token safety

  const langName = { de:'German', fr:'French', es:'Spanish', nl:'Dutch', it:'Italian', pt:'Portuguese' }[lang] || 'English';

  try {
    const message = await withRetry(() => client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 6000,
      system: getZercySystemPrompt({ mode: 'chat', destination }),
      messages: [{
        role: 'user',
        content: `Generate day-by-day travel IDEAS (inspiration, not a strict itinerary) for ${destination}, ${totalDays} days.
${arrivalTime ? `Day 1 arrival: ${arrivalTime}` : ''}${departureTime ? `\nLast day departure: ${departureTime}` : ''}

RULES:
- Exactly ${totalDays} days
- Each day: morning + afternoon + evening (one idea each)
- Be SPECIFIC: real neighborhoods, real landmarks, real cafe/restaurant names
- Day 1 realistic for arrival; last day realistic for departure
- Insider angle: avoid tourist traps

LENGTH LIMITS (CRITICAL — do not exceed):
- intro: max 180 chars
- title per day: max 40 chars
- activity: max 80 chars
- tip: max 100 chars
- price: max 25 chars (or omit)
- extra_tips: max 3 items, each max 100 chars

LANGUAGE: ${langName}. Every field. No English if user is not English.
${lang === 'de' ? 'GERMAN STYLE: Use "du" (never "Sie"). Direct, warm, like a friend.' : ''}
NO EM-DASHES (— or –) ANYWHERE. Use commas, colons, or new sentences instead.

Respond ONLY with valid minified JSON, no markdown:
{"destination":"${destination}","intro":"...","days":[{"day":1,"title":"...","morning":{"activity":"...","tip":"...","price":"..."},"afternoon":{"activity":"...","tip":"...","price":"..."},"evening":{"activity":"...","tip":"...","price":"..."}}],"extra_tips":["..."]}`
      }]
    }));

    const raw = message.content[0].text.trim();
    const parsed = extractJson(raw);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
