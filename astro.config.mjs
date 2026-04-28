// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import rehypeExternalLinks from 'rehype-external-links';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.zercy.app',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/logbook/login') && !page.includes('/logbook/verify'),
      serialize(item) {
        item.lastmod = new Date();
        return item;
      },
    }),
  ],
  markdown: {
    rehypePlugins: [
      [rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'] }]
    ]
  }
});
