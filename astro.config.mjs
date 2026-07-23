// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeExternalLinks from 'rehype-external-links';
import { readFileSync, readdirSync } from 'node:fs';

// slug -> letztes Aenderungsdatum (updatedDate sonst pubDate), fuer korrektes Sitemap-lastmod
function buildDateMap() {
  const map = {};
  for (const dir of ['src/content/blog', 'src/content/blogen', 'src/content/bloges']) {
    let files = [];
    try { files = readdirSync(dir).filter((f) => f.endsWith('.md')); } catch {}
    for (const f of files) {
      try {
        const txt = readFileSync(`${dir}/${f}`, 'utf8');
        const pub = txt.match(/pubDate:\s*"?(\d{4}-\d{2}-\d{2})/);
        const upd = txt.match(/updatedDate:\s*"?(\d{4}-\d{2}-\d{2})/);
        if (pub) map[f.replace(/\.md$/, '')] = upd ? upd[1] : pub[1];
      } catch {}
    }
  }
  return map;
}
const DATE_MAP = buildDateMap();

// Affiliate-Domains bekommen rel="sponsored nofollow" (Google-Vorgabe), Rest nur noopener/noreferrer.
const AFFILIATE_HOSTS = [
  'airalo.com', 'yesim.app', 'saily.com', 'gigsky.com', 'nordvpn.com', 'radicalstorage.com',
  'welcomepickups.com', 'kiwitaxi.com', 'ektatraveling.com', 'airhelp.com', 'compensair.com',
  'gocity.com', 'tiqets.com', 'klook.com', 'getyourguide.com', 'viator.com',
  'booking.com', 'expedia.com', 'discovercars.com', 'aviasales.com',
  'economybookings.com', 'autoeurope.com', 'localrent.com', 'qeeq.com', 'getrentacar.com',
  'gettransfer.com', 'intui.travel', 'bikesbooking.com', 'searadar.com',
  'kiwi.com', 'wegotrip.com', 'kkday.com', 'trip.com', 'tp.media', 'tp-em.com',
];
function relForLink(element) {
  const href = String(element?.properties?.href || '');
  const isAffiliate = AFFILIATE_HOSTS.some((h) => href.includes(h));
  return isAffiliate
    ? ['noopener', 'noreferrer', 'sponsored', 'nofollow']
    : ['noopener', 'noreferrer'];
}

// https://astro.build/config
export default defineConfig({
  site: 'https://www.zercy.app',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/logbook'),
      serialize(item) {
        const slug = item.url.replace(/\/$/, '').split('/').pop();
        const d = DATE_MAP[slug];
        item.lastmod = d ? new Date(d + 'T00:00:00Z').toISOString() : new Date().toISOString();
        return item;
      },
    }),
  ],
  markdown: {
    rehypePlugins: [
      [rehypeExternalLinks, { target: '_blank', rel: relForLink }]
    ]
  }
});
