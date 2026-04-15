import fs from 'fs';
import path from 'path';

// Map directories/pages to hero images
const imageMap = {
  'new-braunfels': '/images/generated/comal-river.png',
  'canyon-lake': '/images/generated/hill-country-aerial.png',
  'seguin': '/images/generated/hill-country-home-1.png',
  'cibolo-schertz': '/images/generated/nb-neighborhood.png',
  'bulverde': '/images/generated/hill-country-home-2.png',
  'buyers-guide': '/images/generated/hill-country-home-1.png',
  'blog': '/images/generated/porch-view.png',
  'home-search': '/images/generated/hill-country-sunset.png',
};

// Parallax images for each area (used above ContactForm)
const parallaxMap = {
  'new-braunfels': '/images/generated/guadalupe-river.png',
  'canyon-lake': '/images/generated/hill-country-sunset.png',
  'seguin': '/images/generated/porch-view.png',
  'cibolo-schertz': '/images/generated/hill-country-aerial.png',
  'bulverde': '/images/generated/comal-river.png',
  'buyers-guide': '/images/generated/guadalupe-river.png',
  'blog': '/images/generated/hill-country-home-2.png',
  'home-search': '/images/generated/hill-country-home-1.png',
};

const pagesDir = './src/pages';
let updated = 0;

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(pagesDir, filePath).replace(/\\/g, '/');

  // Skip properties/search page
  if (relPath === 'properties.astro' || relPath.startsWith('search')) return;

  // Determine which area this page belongs to
  const dir = relPath.split('/')[0].replace('.astro', '');
  const heroImage = imageMap[dir];
  if (!heroImage) return; // Only process mapped directories

  const origContent = content;

  // Pattern 1: background: #000; in hero CSS
  // Replace "background: #000;" with background-image
  content = content.replace(
    /(\.[a-z-]+hero\s*\{[^}]*?)background:\s*#000;/g,
    (match, prefix) => {
      return prefix + `background: url('${heroImage}') center/cover no-repeat;`;
    }
  );

  // Pattern 2: Replace opaque overlay with semi-transparent
  content = content.replace(
    /(\.[a-z-]+hero__overlay\s*\{[^}]*?)background:\s*linear-gradient\(135deg,\s*#000\s*0%,\s*#1a0000\s*100%\);[\s]*opacity:\s*0\.9;/g,
    (match, prefix) => {
      return prefix + `background: rgba(0,0,0,0.55);`;
    }
  );

  // Also handle overlay without opacity
  content = content.replace(
    /(\.[a-z-]+hero__overlay\s*\{[^}]*?)background:\s*linear-gradient\(135deg,\s*#000\s*0%,\s*#1a0000\s*100%\);/g,
    (match, prefix) => {
      return prefix + `background: rgba(0,0,0,0.55);`;
    }
  );

  // Add ParallaxBanner import if not present and there's a ContactForm
  const parallaxImage = parallaxMap[dir];
  if (parallaxImage && content.includes('ContactForm') && !content.includes('ParallaxBanner')) {
    content = content.replace(
      /import Footer from [^;]+;/,
      match => match + "\nimport ParallaxBanner from '" + (relPath.includes('/') ? '../../' : '../') + "components/ParallaxBanner.astro';"
    );

    // Add parallax banner before ContactForm
    content = content.replace(
      /(\s*<ContactForm)/,
      `\n  <ParallaxBanner image="${parallaxImage}" />\n$1`
    );
  }

  if (content !== origContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✓ ${relPath}`);
    updated++;
  }
}

function walkDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.name.endsWith('.astro')) {
      processFile(fullPath);
    }
  }
}

walkDir(pagesDir);
console.log(`\nDone! Updated ${updated} files.`);
