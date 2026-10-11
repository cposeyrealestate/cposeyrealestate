import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// Map blog slug → ISO lastmod, sourced from the same JSON the blog routes use.
// Lets Google see a freshness signal per post when it fetches the sitemap.
const blogPostsPath = fileURLToPath(new URL('./src/data/blog-posts.json', import.meta.url));
const blogLastmod = new Map(
  JSON.parse(readFileSync(blogPostsPath, 'utf8'))
    .map((p) => [p.slug, (p.dateModified || p.dateRaw) ? new Date(p.dateModified || p.dateRaw).toISOString() : null])
    .filter(([, v]) => v),
);

// Exclude permanent redirect sources: discovery should point at final pages.
const redirectSources = new Set(
  readFileSync(new URL('./public/_redirects', import.meta.url), 'utf8')
    .split('\n')
    .map(line => line.trim().split(/\s+/))
    .filter(([from, , status]) => from && !from.startsWith('#') && !from.includes('*') && status === '301')
    .map(([from]) => from.replace(/\/$/, '') || '/'),
);

export default defineConfig({
  // Canonical production origin — used by @astrojs/sitemap and by
  // Astro.site everywhere for absolute URLs (canonical, og:url, etc.).
  site: 'https://cposeyrealestate.com',
  output: 'static',
  adapter: cloudflare(),
  integrations: [
    sitemap({
      // Don't index the IDX wrapper fragments or the API endpoints.
      // /search/ 302s out to IDX Broker and /admin/ sits behind Cloudflare
      // Access — neither resolves to an indexable page.
      filter: (page) =>
        !page.includes('/idx-header') &&
        !page.includes('/idx-footer') &&
        !page.includes('/api/') &&
        !page.endsWith('/search/') &&
        !page.endsWith('/admin/') &&
        !redirectSources.has(new URL(page).pathname.replace(/\/$/, '') || '/'),
      serialize(item) {
        const match = item.url.match(/\/blog\/([^/]+)\/?$/);
        if (match) {
          const lm = blogLastmod.get(match[1]);
          if (lm) item.lastmod = lm;
        }
        return item;
      },
    }),
  ],
});
