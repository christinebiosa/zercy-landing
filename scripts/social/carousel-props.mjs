// scripts/social/carousel-props.mjs
export function buildSlideProps({ sheet, imageSrcs }) {
  const W = 1080, H = 1350;
  const total = 2 + sheet.slides.length;
  const out = [];
  out.push({ kind: 'cover', width: W, height: H, imageSrc: imageSrcs[0], index: 1, total, title: sheet.cover.title, hook: sheet.cover.hook });
  sheet.slides.forEach((s, i) => {
    out.push({ kind: 'content', width: W, height: H, imageSrc: imageSrcs[i + 1], index: i + 2, total, heading: s.heading, line: s.line, bestFor: s.bestFor || '' });
  });
  out.push({ kind: 'cta', width: W, height: H, imageSrc: imageSrcs[total - 1], index: total, total, headline: sheet.cta.headline, sub: sheet.cta.sub });
  return out;
}
