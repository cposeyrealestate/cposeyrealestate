import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

// Verify rendered output rather than assuming source templates emit valid metadata.
const root = existsSync('dist/client/sitemap-0.xml') ? 'dist/client' : 'dist';
const site = 'https://cposeyrealestate.com';
const errors = [];
const htmlFiles = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (path.endsWith('.html')) htmlFiles.push(path);
  }
}
walk(root);
const normalize = path => path.replace(/\/$/, '') || '/';
const redirectRules = readFileSync('public/_redirects', 'utf8').split('\n')
  .map(line => line.trim().split(/\s+/))
  .filter(([from]) => from && !from.startsWith('#'));
function firstRule(path) {
  return redirectRules.find(([from]) => from.includes('*')
    ? path.startsWith(from.split('*')[0])
    : normalize(path) === normalize(from));
}
const redirects = new Set(readFileSync('public/_redirects', 'utf8').split('\n')
  .map(line => line.trim().split(/\s+/))
  .filter(([from, , status]) => from && !from.startsWith('#') && !from.includes('*') && status === '301')
  .map(([from]) => normalize(from)));
const sitemap = readFileSync(join(root, 'sitemap-0.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
let videos = 0;
let schemas = 0;
const titles = new Map();
function inspectImages(value, url) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (['image', 'thumbnailUrl'].includes(key) && typeof child === 'string' && !/^https?:\/\//.test(child)) {
      errors.push(`${url}: relative schema ${key}: ${child}`);
    }
    inspectImages(child, url);
  }
}
for (const url of urls) {
  const path = new URL(url).pathname;
  if (redirects.has(normalize(path)) || firstRule(path)?.[2] === '301') errors.push(`${url}: redirect source included in sitemap`);
  const file = join(root, path.endsWith('/') ? `${path}index.html` : path);
  if (!existsSync(file)) { errors.push(`${url}: sitemap target does not exist`); continue; }
  const html = readFileSync(file, 'utf8');
  if (/name="robots"[^>]*content="[^"]*noindex/.test(html)) errors.push(`${url}: noindex page in sitemap`);
  const canonical = html.match(/rel="canonical"[^>]*href="([^"]+)"/)?.[1];
  if (canonical !== url) errors.push(`${url}: canonical mismatch: ${canonical}`);
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  if (!title) errors.push(`${url}: missing title`);
  if (titles.has(title)) errors.push(`${url}: duplicate title also at ${titles.get(title)}`);
  titles.set(title, url);
  if (!/name="description"[^>]*content="[^"]+"/.test(html)) errors.push(`${url}: missing description`);
}
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const path = relative(root, file);
  const ids = new Set();
  for (const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)) {
    let value;
    try { value = JSON.parse(match[1]); } catch { errors.push(`${path}: invalid JSON-LD`); continue; }
    schemas++;
    inspectImages(value, path);
    if (value['@type'] === 'VideoObject') {
      videos++;
      if (!value.uploadDate || !value.name || !value.thumbnailUrl) errors.push(`${path}: incomplete video markup`);
      if (value.contentUrl?.includes('youtube.com/watch')) errors.push(`${path}: contentUrl points to a watch page, not media bytes`);
      const id = value.embedUrl?.match(/\/embed\/([^?]+)/)?.[1];
      if (ids.has(id)) errors.push(`${path}: duplicate VideoObject for ${id}`);
      ids.add(id);
    }
  }
}
console.log(`Checked ${htmlFiles.length} HTML files, ${urls.length} sitemap URLs, ${schemas} JSON-LD blocks, ${videos} videos.`);
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log('SEO output checks passed. This does not guarantee search indexing or rankings.');
