/**
 * Convert oversized PNG/JPEG images under public/images to WebP.
 *
 * The June 2026 Ahrefs audit flagged 140+ multi-megabyte PNGs (AI-generated
 * blog heroes were up to 8 MB). Run this after adding new images, then update
 * references — the script prints every file it converted.
 *
 * Usage: node scripts/optimize-images.mjs [--dry-run]
 */
import sharp from 'sharp';
import { readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../public/images', import.meta.url));
const THRESHOLD = 300 * 1024; // leave already-small files alone
const MAX_WIDTH = 1920;       // nothing on the site renders wider than this
const QUALITY = 80;
const dryRun = process.argv.includes('--dry-run');

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else yield p;
  }
}

let before = 0;
let after = 0;
let count = 0;

for (const file of walk(ROOT)) {
  const ext = extname(file).toLowerCase();
  if (!['.png', '.jpg', '.jpeg'].includes(ext)) continue;
  const size = statSync(file).size;
  if (size < THRESHOLD) continue;

  const out = file.slice(0, -ext.length) + '.webp';
  if (!dryRun) {
    // buffer the input so Windows lets us unlink the original afterwards
    await sharp(readFileSync(file))
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: QUALITY })
      .toFile(out);
    unlinkSync(file);
  }
  const newSize = dryRun ? 0 : statSync(out).size;
  before += size;
  after += newSize;
  count++;
  console.log(
    `${(size / 1048576).toFixed(1)}MB -> ${(newSize / 1024).toFixed(0)}KB  ${file.slice(ROOT.length + 1)}`,
  );
}

console.log(
  `\n${count} files: ${(before / 1048576).toFixed(0)}MB -> ${(after / 1048576).toFixed(1)}MB${dryRun ? ' (dry run)' : ''}`,
);
