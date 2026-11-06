import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
const root = existsSync('dist/client/lets-talk/index.html') ? 'dist/client' : 'dist';
const html = readFileSync(`${root}/lets-talk/index.html`, 'utf8');
assert.match(html, /name="robots" content="noindex, follow"/, 'Campaign page must stay noindex.');
assert.match(html, /rel="canonical" href="https:\/\/cposeyrealestate.com\/lets-talk\/"/);
assert.equal([...html.matchAll(/<h1\b/g)].length, 1);
assert.match(html, /<h2\b/); assert.match(html, /<h3\b/);
assert.match(html, /data-path="cposeyrealestate\/satx-relocation"/);
assert.match(html, /href="https:\/\/tidycal.com\/cposeyrealestate\/satx-relocation"/);
assert.match(html, /data-load-booking/);
assert.doesNotMatch(html, /id="signup-popup"|data-signup-popup/);
for (const name of readdirSync(root).filter(name => /^sitemap.*\.xml$/.test(name))) {
  assert.doesNotMatch(readFileSync(`${root}/${name}`, 'utf8'), /<loc>[^<]*\/lets-talk\/?<\/loc>/, `Campaign page found in ${name}`);
}
const headers = readFileSync(`${root}/_headers`, 'utf8');
for (const path of ['/lets-talk', '/lets-talk/']) assert.ok(headers.includes(`${path}\n  X-Robots-Tag: noindex, follow`));
assert.doesNotMatch(readFileSync(`${root}/robots.txt`, 'utf8'), /Disallow:\s*\/lets-talk/);
console.log('YouTube landing checks passed: noindex HTML and headers, excluded from sitemaps, TidyCal link and booking control present.');
