// One-shot downloader for IDX listing photos.
// Reads idx_page.html, extracts data-src gallery URLs in document order,
// and downloads them as public/images/listings/{mlsId}-{n}.jpg.
// Usage: node download-listing-photos.mjs <mlsId>

import fs from 'node:fs';
import path from 'node:path';

const mlsId = process.argv[2];
if (!mlsId) {
  console.error('Usage: node download-listing-photos.mjs <mlsId>');
  process.exit(1);
}

const html = fs.readFileSync('idx_page.html', 'utf8');
const rx = /data-src="\s*(https:\/\/sabor-assets\.cdn-connectmls\.com\/pics\/[^\s"']+\.(?:JPEG|jpg|jpeg|JPG))/gi;
const urls = [];
let m;
while ((m = rx.exec(html)) !== null) urls.push(m[1]);

console.log(`Found ${urls.length} photos to download`);

const outDir = path.join('public', 'images', 'listings');
fs.mkdirSync(outDir, { recursive: true });

let ok = 0;
let failed = 0;
for (let i = 0; i < urls.length; i++) {
  const url = urls[i];
  const outPath = path.join(outDir, `${mlsId}-${i + 1}.jpg`);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://cposeyrealestate.idxbroker.com/',
      },
    });
    if (!res.ok) {
      console.error(`  [${i + 1}] FAIL ${res.status}: ${url}`);
      failed++;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outPath, buf);
    console.log(`  [${i + 1}] ${(buf.length / 1024).toFixed(0)} KB  →  ${outPath}`);
    ok++;
  } catch (err) {
    console.error(`  [${i + 1}] ERROR: ${err.message}`);
    failed++;
  }
}

console.log(`\nDone. ${ok} downloaded, ${failed} failed.`);
