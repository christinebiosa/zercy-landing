// scripts/social/carousel-beatsheet.mjs
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
