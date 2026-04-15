import fs from 'fs';
import path from 'path';

// Swap some heroes and parallax to home images for variety
const heroSwaps = {
  // Subpage heroes — swap some to home images
  'src/pages/new-braunfels/neighborhoods.astro': '/images/generated/home-nb-ranch.png',
  'src/pages/new-braunfels/homes-for-sale.astro': '/images/generated/home-nb-twostory.png',
  'src/pages/new-braunfels/new-construction.astro': '/images/generated/home-nb-modern.png',
  'src/pages/canyon-lake/homes-for-sale.astro': '/images/generated/home-nb-ranch.png',
  'src/pages/canyon-lake/neighborhoods.astro': '/images/generated/home-nb-modern.png',
  'src/pages/seguin/homes-for-sale.astro': '/images/generated/home-nb-twostory.png',
  'src/pages/seguin/neighborhoods.astro': '/images/generated/home-nb-ranch.png',
  'src/pages/cibolo-schertz/homes-for-sale.astro': '/images/generated/home-nb-twostory.png',
  'src/pages/cibolo-schertz/neighborhoods.astro': '/images/generated/home-nb-modern.png',
  'src/pages/bulverde/homes-for-sale.astro': '/images/generated/home-nb-ranch.png',
  'src/pages/bulverde/neighborhoods.astro': '/images/generated/home-nb-modern.png',
  'src/pages/buyers-guide/home-buying-process.astro': '/images/generated/home-nb-twostory.png',
  'src/pages/buyers-guide/mortgage-checklist.astro': '/images/generated/home-nb-ranch.png',
};

// Parallax swaps — swap some to home images
const parallaxSwaps = {
  'src/pages/closing-costs.astro': '/images/generated/home-nb-ranch.png',
  'src/pages/mortgage-calculator.astro': '/images/generated/home-nb-modern.png',
  'src/pages/faq.astro': '/images/generated/home-nb-twostory.png',
  'src/pages/testimonials.astro': '/images/generated/home-interior-hc.png',
  'src/pages/home-value.astro': '/images/generated/home-nb-ranch.png',
};

let updated = 0;

// Hero swaps — replace existing hero image URL
for (const [file, newImg] of Object.entries(heroSwaps)) {
  if (!fs.existsSync(file)) { console.log(`Skip (not found): ${file}`); continue; }
  let content = fs.readFileSync(file, 'utf8');
  const orig = content;

  // Replace the background url in CSS
  content = content.replace(
    /background:\s*url\('[^']+'\)\s*center\/cover\s*no-repeat;/,
    `background: url('${newImg}') center/cover no-repeat;`
  );

  if (content !== orig) {
    fs.writeFileSync(file, content);
    console.log(`✓ Hero: ${file}`);
    updated++;
  }
}

// Parallax swaps
for (const [file, newImg] of Object.entries(parallaxSwaps)) {
  if (!fs.existsSync(file)) { console.log(`Skip (not found): ${file}`); continue; }
  let content = fs.readFileSync(file, 'utf8');
  const orig = content;

  // Replace parallax banner image
  content = content.replace(
    /<ParallaxBanner image="[^"]+"/,
    `<ParallaxBanner image="${newImg}"`
  );

  if (content !== orig) {
    fs.writeFileSync(file, content);
    console.log(`✓ Parallax: ${file}`);
    updated++;
  }
}

console.log(`\nDone! Updated ${updated} files with home images.`);
