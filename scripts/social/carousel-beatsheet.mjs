// scripts/social/carousel-beatsheet.mjs
import Anthropic from '@anthropic-ai/sdk';

export function parseCarouselSheet(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Beat-Sheet enthielt kein JSON');
  let o;
  try { o = JSON.parse(m[0]); } catch (e) { throw new Error('Carousel-JSON nicht parsebar: ' + e.message); }
  if (!o.topic) throw new Error('Beat-Sheet ohne topic');
  if (!o.cover || !o.cover.title || !o.cover.hook || !o.cover.query) throw new Error('cover unvollstaendig (title/hook/query)');
  if (!Array.isArray(o.slides) || o.slides.length < 4 || o.slides.length > 6) {
    throw new Error(`slides muss 4-6 Eintraege haben, hat ${o.slides ? o.slides.length : 0}`);
  }
  for (const [i, s] of o.slides.entries()) {
    if (!s.heading || !s.line || !s.query) throw new Error(`slide ${i} ohne heading/line/query`);
    if (!('bestFor' in s)) s.bestFor = '';
  }
  if (!o.cta || !o.cta.headline || !o.cta.sub || !o.cta.query) throw new Error('cta unvollstaendig (headline/sub/query)');
  if (!o.caption || !o.caption.trim()) throw new Error('caption fehlt');
  o.hashtags = Array.isArray(o.hashtags)
    ? [...new Set(o.hashtags.map(cleanHashtag).filter(Boolean))]
    : [];
  return o;
}

// Macht aus beliebigem Roh-Tag einen sauberen Single-Token-Hashtag:
// kein fuehrendes #, keine Leerzeichen/Sonderzeichen, klein. "#travel paris!" -> "travelparis"
export function cleanHashtag(raw) {
  return String(raw).replace(/[^a-z0-9]/gi, '').toLowerCase();
}

// Baut die finale Caption: Body + Leerzeile + saubere Hashtag-Zeile.
export function buildCaption(sheet) {
  const body = sheet.caption.trim();
  if (!sheet.hashtags || !sheet.hashtags.length) return body;
  return `${body}\n\n${sheet.hashtags.map((h) => '#' + h).join(' ')}`;
}

// Wandelt eine fertige IG-Caption in eine FB-Variante: ersetzt den IG-only-Hinweis
// "Full guide in our bio" durch den echten klickbaren Artikel-Link im Text.
// Findet die Floskel nicht -> haengt den Link vor der Hashtag-Zeile an.
export function toFacebookCaption(igCaption, articleUrl) {
  const phrase = /full guide in (?:our|the) bio\.?/i;
  if (phrase.test(igCaption)) {
    return igCaption.replace(phrase, `Full guide: ${articleUrl}`);
  }
  const lines = igCaption.split('\n');
  const tagIdx = lines.findIndex((l) => l.trim().startsWith('#'));
  const insert = `Full guide: ${articleUrl}`;
  if (tagIdx === -1) return `${igCaption.trim()}\n\n${insert}`;
  lines.splice(tagIdx, 0, insert, '');
  return lines.join('\n');
}

// Feste Marken-CTA-Unterzeile: plattform-neutral (stimmt auf IG + FB), nicht LLM-generiert.
export const CTA_SUB = 'Full guide on zercy.app';

const CAROUSEL_PROMPT = (slug, cityName, enBody) => `You write an English Instagram/Facebook carousel about "Where to stay in ${cityName}", from the blog article below.

Article excerpt:
${enBody.slice(0, 1200)}

Tone: direct, "you", short sentences, no em-dashes, no fluff. Travel-savvy, confident.

Return ONLY JSON in exactly this shape:
{
  "topic": "${slug}",
  "cover": { "title": "scroll-stopping hook headline (max 7 words)", "hook": "one short promise line", "query": "english photo search term" },
  "slides": [
    { "heading": "Neighborhood name", "line": "one vivid mood line", "bestFor": "2-4 keywords", "query": "english photo search term" }
  ],
  "cta": { "headline": "Save this for your trip", "sub": "Full guide on zercy.app", "query": "english photo search term" },
  "caption": "IG/FB caption BODY only, no hashtags: a scroll-stopping hook line, then 2-3 short value lines, then a soft CTA 'Full guide in our bio'. Short sentences. No em-dashes.",
  "hashtags": ["wheretostay${cityName.toLowerCase().replace(/[^a-z0-9]/g, '')}", "..."]
}
Rules:
- "slides" has 4 to 6 entries (one neighborhood each, no hotel names, no prices).
- Every "query" is a concrete English photo search term for a vertical image.
- "caption" contains NO hashtags and NO '#' characters.
- "hashtags": 6 to 8 entries. Each is ONE lowercase token, no '#', no spaces, no punctuation (e.g. "parisneighborhoods", "firsttimeparis"). Mix destination-specific and travel-niche tags.`;

const PRODUCT_PROMPT = (slug, productName, category, enBody) => `You write an English Instagram/Facebook carousel for a travel-product roundup titled "${productName}" (category: ${category}), from the blog article below.

Article excerpt:
${enBody.slice(0, 1400)}

Tone: direct, "you", short punchy sentences, no em-dashes, no fluff. Like a savvy traveler sharing a tight shortlist.

Return ONLY JSON in exactly this shape:
{
  "topic": "${slug}",
  "cover": { "title": "scroll-stopping hook headline (max 7 words)", "hook": "one short promise line", "query": "english photo search term" },
  "slides": [
    { "heading": "short buying angle (max 3 words, e.g. Best overall, Best budget, Best lightweight, Best for camping)", "line": "the actual pick by its real name from the article + one reason, one vivid line", "bestFor": "2-4 keywords (who it suits)", "query": "english photo search term for a vertical lifestyle image of this product type in use" }
  ],
  "cta": { "headline": "Save this for your trip", "sub": "Full guide on zercy.app", "query": "english photo search term" },
  "caption": "IG/FB caption BODY only, no hashtags: a scroll-stopping hook line, then 2-3 short value lines, then a soft CTA 'Full guide in our bio'. Short sentences. No em-dashes.",
  "hashtags": ["travelgear", "..."]
}
Rules:
- "slides" has 4 to 6 entries. Each is ONE curated pick; put the real product name from the article in "line".
- "heading" is a short buying angle (Best overall / Best budget / Best lightweight / Best for X), never a price.
- Every "query" is a concrete English photo search term for a vertical lifestyle image matching that product type (e.g. "person using power bank outdoors", "merino wool shirt travel").
- "caption" contains NO hashtags and NO '#' characters.
- "hashtags": 6 to 8 entries. Each is ONE lowercase token, no '#', no spaces, no punctuation (e.g. "travelgear", "packingtips", "traveltech"). Mix product and travel-niche tags.`;

export async function generateCarouselSheet({ slug, name, cityName, enBody, apiKey, mode = 'city', category = '' }) {
  const displayName = name || cityName;
  const anthropic = new Anthropic({ apiKey });
  const prompt = mode === 'product'
    ? PRODUCT_PROMPT(slug, displayName, category, enBody)
    : CAROUSEL_PROMPT(slug, displayName, enBody);
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });
  const block = msg.content.find((b) => b.type === 'text');
  if (!block) throw new Error('Claude-Antwort ohne Text-Block');
  const sheet = parseCarouselSheet(block.text);
  sheet.cta.sub = CTA_SUB; // feste Marken-CTA, egal was das Modell liefert
  sheet.caption = buildCaption(sheet);
  return sheet;
}
