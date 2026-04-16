import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // Canonical production origin — used by @astrojs/sitemap and by
  // Astro.site everywhere for absolute URLs (canonical, og:url, etc.).
  site: 'https://cposeyrealestate.com',
  output: 'hybrid',
  adapter: cloudflare(),
  integrations: [
    sitemap({
      // Don't index the IDX wrapper fragments or the API endpoints.
      filter: (page) =>
        !page.includes('/idx-header') &&
        !page.includes('/idx-footer') &&
        !page.includes('/api/'),
    }),
  ],
});
