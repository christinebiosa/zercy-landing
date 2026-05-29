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
  return o;
}

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
  "cta": { "headline": "Save this for your trip", "sub": "Full guide -> link in bio", "query": "english photo search term" },
  "caption": "Full IG/FB caption in English: hook line, 2-3 value lines, soft CTA 'Full guide in our bio', a few niche travel hashtags. Short sentences, no em-dashes."
}
Rules: "slides" has 4 to 6 entries (one neighborhood each, no hotel names, no prices). Every "query" is a concrete English photo search term for a vertical image.`;

export async function generateCarouselSheet({ slug, cityName, enBody, apiKey }) {
  const anthropic = new Anthropic({ apiKey });
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: CAROUSEL_PROMPT(slug, cityName, enBody) }],
  });
  return parseCarouselSheet(msg.content[0].text);
}
