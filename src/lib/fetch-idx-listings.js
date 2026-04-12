import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'src', 'data');

// IDX Broker API config
const BASE_URL = 'https://api.idxbroker.com';
const API_KEY = process.env.IDX_API_KEY || '51L9tLs3-y-U4mgc6p7970';
const ANCILLARY_KEY = process.env.IDX_ANCILLARY_KEY || '04498';

const HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'accesskey': API_KEY,
  'ancillarykey': ANCILLARY_KEY,
  'outputtype': 'json',
};

async function fetchIDX(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  console.log(`  Fetching ${url}`);
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} from ${endpoint}: ${body}`);
  }
  return res.json();
}

function formatPrice(price) {
  if (!price && price !== 0) return '';
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
}

function parseListing(key, raw) {
  return {
    listingID: raw.listingID || key,
    address: [raw.streetNumber, raw.streetName].filter(Boolean).join(' '),
    cityName: raw.cityName || '',
    state: raw.state || '',
    zipcode: raw.zipcode || '',
    listingPrice: raw.listingPrice || formatPrice(raw.price),
    price: raw.price ? parseFloat(raw.price) : null,
    bedrooms: raw.bedrooms || null,
    totalBaths: raw.totalBaths || null,
    sqFt: raw.sqFt || null,
    image: raw.image?.[0]?.url || null,
    thumbnail: raw.image?.[0]?.sizes?.thumb || raw.image?.[0]?.url || null,
    fullDetailsURL: raw.fullDetailsURL || null,
    propSubType: raw.propSubType || '',
    propStatus: raw.propStatus || '',
    idxStatus: raw.idxStatus || '',
    subdivision: raw.subdivision || '',
    countyName: raw.countyName || '',
    acres: raw.acres || null,
    yearBuilt: raw.yearBuilt || null,
    remarksConcat: raw.remarksConcat || '',
    latitude: raw.latitude || null,
    longitude: raw.longitude || null,
  };
}

function extractSystemLinks(raw) {
  const links = {};
  if (Array.isArray(raw)) {
    for (const link of raw) {
      if (link.name && link.url) {
        // Normalise name to camelCase key
        const key = link.name
          .replace(/[^a-zA-Z0-9 ]/g, '')
          .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
          .replace(/^\w/, c => c.toLowerCase());
        links[key] = link.url;
      }
    }
  } else if (typeof raw === 'object') {
    // Could be an object keyed by ID
    for (const [, link] of Object.entries(raw)) {
      if (link.name && link.url) {
        const key = link.name
          .replace(/[^a-zA-Z0-9 ]/g, '')
          .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
          .replace(/^\w/, c => c.toLowerCase());
        links[key] = link.url;
      }
    }
  }
  return links;
}

async function main() {
  console.log('IDX Broker — fetching featured listings and system links...\n');

  // Ensure output directory exists
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Created directory: ${DATA_DIR}`);
  }

  // --- Featured Listings ---
  try {
    console.log('[1/2] Featured listings');
    const featuredRaw = await fetchIDX('/clients/featured');

    let listings = [];

    if (featuredRaw && featuredRaw.data && typeof featuredRaw.data === 'object') {
      // Expected format: { total: N, data: { "key": { ...listing } } }
      for (const [key, value] of Object.entries(featuredRaw.data)) {
        listings.push(parseListing(key, value));
      }
      console.log(`  Found ${listings.length} featured listings (reported total: ${featuredRaw.total || 'N/A'})`);
    } else if (Array.isArray(featuredRaw)) {
      // Some IDX accounts return a flat array
      for (const item of featuredRaw) {
        listings.push(parseListing(item.listingID || '', item));
      }
      console.log(`  Found ${listings.length} featured listings (array format)`);
    } else {
      console.warn('  Unexpected response shape — saving raw response for debugging');
      const debugPath = path.join(DATA_DIR, 'idx-featured-raw.json');
      fs.writeFileSync(debugPath, JSON.stringify(featuredRaw, null, 2));
      console.warn(`  Raw response saved to ${debugPath}`);
    }

    // Sort by price descending
    listings.sort((a, b) => (b.price || 0) - (a.price || 0));

    const outputPath = path.join(DATA_DIR, 'idx-featured.json');
    fs.writeFileSync(outputPath, JSON.stringify(listings, null, 2));
    console.log(`  Wrote ${listings.length} listings to ${outputPath}\n`);
  } catch (err) {
    console.error(`  Error fetching featured listings: ${err.message}`);
    // Write empty array so the site still builds
    const outputPath = path.join(DATA_DIR, 'idx-featured.json');
    fs.writeFileSync(outputPath, JSON.stringify([], null, 2));
    console.log(`  Wrote empty array to ${outputPath} (fallback)\n`);
  }

  // --- System Links ---
  try {
    console.log('[2/2] System links');
    const linksRaw = await fetchIDX('/clients/systemlinks');
    const links = extractSystemLinks(linksRaw);

    const linksPath = path.join(DATA_DIR, 'idx-links.json');
    fs.writeFileSync(linksPath, JSON.stringify(links, null, 2));
    console.log(`  Wrote ${Object.keys(links).length} links to ${linksPath}\n`);
  } catch (err) {
    console.error(`  Error fetching system links: ${err.message}`);
    const linksPath = path.join(DATA_DIR, 'idx-links.json');
    fs.writeFileSync(linksPath, JSON.stringify({}, null, 2));
    console.log(`  Wrote empty object to ${linksPath} (fallback)\n`);
  }

  console.log('Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
