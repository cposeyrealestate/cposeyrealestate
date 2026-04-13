import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'src', 'data');

const BASE_URL = 'https://api.idxbroker.com';
const API_KEY = process.env.IDX_API_KEY || '51L9tLs3-y-U4mgc6p7970';
const MLS_ID = 'a023';

const HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'accesskey': API_KEY,
  'outputtype': 'json',
};

// Price range buckets — each should return <250 listings
// Fine-grained $25K steps for the dense $100K-$400K range,
// then wider steps for higher prices where there are fewer listings
const PRICE_RANGES = [
  [0, 1500],
  [1501, 2000],
  [2001, 2500],
  [2501, 3000],
  [3001, 3500],
  [3501, 4000],
  [4001, 5000],
  [5001, 7500],
  [7501, 10000],
  [10001, 15000],
  [15001, 50000],
  [50001, 100000],
  [100001, 125000],
  [125001, 150000],
  [150001, 175000],
  [175001, 200000],
  [200001, 215000],
  [215001, 230000],
  [230001, 245000],
  [245001, 260000],
  [260001, 275000],
  [275001, 290000],
  [290001, 310000],
  [310001, 330000],
  [330001, 350000],
  [350001, 375000],
  [375001, 400000],
  [400001, 425000],
  [425001, 450000],
  [450001, 475000],
  [475001, 500000],
  [500001, 550000],
  [550001, 600000],
  [600001, 675000],
  [675001, 750000],
  [750001, 875000],
  [875001, 1000000],
  [1000001, 1250000],
  [1250001, 1500000],
  [1500001, 2000000],
  [2000001, 3000000],
  [3000001, 5000000],
  [5000001, 99999999],
];

// Property types to fetch
const PROP_TYPES = [1, 2, 3, 4, 5, 8]; // Residential, Condo, Multi, Land, Rental, Farm

async function apiFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, { headers: HEADERS, ...options });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} from ${endpoint}: ${body.slice(0, 200)}`);
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function createSavedLink(name, lowPrice, highPrice, propType) {
  const body = new URLSearchParams({
    linkName: name,
    linkTitle: name,
    pageTitle: name,
    'queryString[idxID]': MLS_ID,
    'queryString[pt]': String(propType),
    'queryString[lp]': String(lowPrice),
    'queryString[hp]': String(highPrice),
  });

  const res = await fetch(`${BASE_URL}/clients/savedlinks`, {
    method: 'PUT',
    headers: HEADERS,
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create saved link: ${res.status} ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.newID;
}

async function deleteSavedLink(id) {
  try {
    await fetch(`${BASE_URL}/clients/savedlinks/${id}`, {
      method: 'DELETE',
      headers: HEADERS,
    });
  } catch { /* best effort cleanup */ }
}

async function fetchSavedLinkResults(id) {
  return apiFetch(`/clients/savedlinks/${id}/results?disclaimers=true`);
}

async function fetchSavedLinkCount(id) {
  const data = await apiFetch(`/clients/savedlinks/${id}/count`);
  return typeof data === 'object' ? data.count || data.total || 0 : parseInt(data) || 0;
}

function parsePhotos(imageObj) {
  if (!imageObj || typeof imageObj !== 'object') return [];
  const photos = [];
  for (const key of Object.keys(imageObj)) {
    if (/^\d+$/.test(key) && imageObj[key]?.url) {
      photos.push(imageObj[key].url);
    }
  }
  return photos;
}

function parseListing(raw) {
  const photos = parsePhotos(raw.image);
  return {
    id: raw.listingID || '',
    mlsId: raw.idxID || MLS_ID,
    address: raw.address || [raw.streetNumber, raw.streetName].filter(Boolean).join(' '),
    city: raw.cityName || '',
    state: raw.state || 'Texas',
    zip: raw.zipcode || '',
    price: typeof raw.price === 'number' ? raw.price : parseFloat(raw.price) || 0,
    beds: parseInt(raw.bedrooms) || 0,
    baths: (parseInt(raw.fullBaths) || 0) + (parseInt(raw.halfBaths) || 0) * 0.5 + (parseInt(raw.partialBaths) || 0) * 0.5,
    sqft: parseInt(String(raw.sqFt).replace(/,/g, '')) || 0,
    acres: parseFloat(raw.acres) || 0,
    yearBuilt: parseInt(raw.yearBuilt) || 0,
    lat: parseFloat(raw.latitude) || 0,
    lng: parseFloat(raw.longitude) || 0,
    photo: photos[0] || null,
    photos: photos,
    photoCount: raw.image?.totalCount || raw.mlsPhotoCount || photos.length,
    propType: raw.idxPropType || raw.propSubType || '',
    propTypeId: raw.parentPtID || raw.mlsPtID || 0,
    status: raw.propStatus || raw.idxStatus || 'Active',
    detailUrl: raw.fullDetailsURL || '',
    subdivision: raw.subdivision || '',
    county: raw.countyName || '',
    description: raw.remarksConcat || '',
    dateAdded: raw.dateAdded || '',
    garage: parseInt(raw.garage) || 0,
    stories: parseInt(raw.stories) || 0,
    fullBaths: parseInt(raw.fullBaths) || 0,
    halfBaths: parseInt(raw.halfBaths) || 0,
    listingAgent: raw.listingAgentName || raw.agentName || '',
    listingOffice: raw.listingOfficeName || raw.officeName || '',
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function cleanupOldLinks() {
  console.log('Cleaning up old temporary saved links...');
  try {
    const existing = await apiFetch('/clients/savedlinks');
    if (typeof existing === 'object' && existing !== null) {
      const entries = Array.isArray(existing) ? existing.map((v, i) => [i, v]) : Object.entries(existing);
      for (const [id, link] of entries) {
        if (link && typeof link === 'object' && link.linkName && (link.linkName.startsWith('_fetch_') || link.linkName.startsWith('_f'))) {
          console.log(`  Deleting old link: ${link.linkName} (ID: ${id})`);
          await deleteSavedLink(id);
          await sleep(200);
        }
      }
    }
    console.log('Cleanup complete.\n');
  } catch (err) {
    console.warn(`  Warning: Could not clean up old links: ${err.message}\n`);
  }
}

async function main() {
  console.log('=== IDX Broker — Fetching ALL active listings ===\n');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  // Clean up any leftover temp links from previous runs
  await cleanupOldLinks();

  const allListings = new Map(); // dedup by listing ID
  const createdLinks = [];
  let totalApiCalls = 0;

  try {
    // For each property type, create saved links by price range
    for (const pt of PROP_TYPES) {
      console.log(`\n--- Property type ${pt} ---`);

      for (const [low, high] of PRICE_RANGES) {
        const ts = Date.now().toString(36);
        const name = `_f${ts}_pt${pt}_${low}_${high}`;

        try {
          // Create saved link
          const linkId = await createSavedLink(name, low, high, pt);
          createdLinks.push(linkId);
          totalApiCalls++;

          // Rate limit: 500/hour. Skip count call — go straight to results.
          await sleep(800);

          // Fetch results directly (saves 1 API call per bucket)
          const results = await fetchSavedLinkResults(linkId);
          totalApiCalls++;
          await sleep(800);

          let fetched = 0;
          if (Array.isArray(results)) {
            for (const item of results) {
              if (item.listingID) {
                allListings.set(item.listingID, parseListing(item));
                fetched++;
              }
            }
          } else if (typeof results === 'object' && results !== null) {
            for (const [key, item] of Object.entries(results)) {
              if (item && typeof item === 'object' && (item.listingID || item.price)) {
                allListings.set(item.listingID || key, parseListing(item));
                fetched++;
              }
            }
          }

          console.log(`  pt=${pt} $${low}-$${high}: ${fetched} listings fetched (total unique: ${allListings.size})`);

        } catch (err) {
          console.error(`  Error for pt=${pt} $${low}-$${high}: ${err.message}`);
          await sleep(1000);
        }
      }
    }

    // Convert to array and sort by date added (newest first)
    const listings = Array.from(allListings.values())
      .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));

    // Write full listings data
    const outputPath = path.join(DATA_DIR, 'idx-all-listings.json');
    fs.writeFileSync(outputPath, JSON.stringify(listings, null, 2));
    console.log(`\n✓ Wrote ${listings.length} unique listings to ${outputPath}`);

    // Write a lightweight version for the map (no descriptions, smaller)
    const mapData = listings
      .filter(l => l.lat !== 0 && l.lng !== 0)
      .map(l => ({
        id: l.id, lat: l.lat, lng: l.lng, price: l.price,
        beds: l.beds, baths: l.baths, sqft: l.sqft,
        address: l.address, city: l.city, zip: l.zip,
        photo: l.photo, propType: l.propType, propTypeId: l.propTypeId,
        status: l.status, detailUrl: l.detailUrl, acres: l.acres,
        subdivision: l.subdivision, county: l.county, dateAdded: l.dateAdded,
        photoCount: l.photoCount,
      }));

    const mapPath = path.join(DATA_DIR, 'idx-map-listings.json');
    const mapJson = JSON.stringify(mapData);
    fs.writeFileSync(mapPath, mapJson);
    console.log(`✓ Wrote ${mapData.length} geo-located listings to ${mapPath} (${(fs.statSync(mapPath).size / 1024).toFixed(0)}KB)`);

    // Also write to public/data/ for the live API endpoint
    const publicDataDir = path.join(PROJECT_ROOT, 'public', 'data');
    if (!fs.existsSync(publicDataDir)) fs.mkdirSync(publicDataDir, { recursive: true });
    fs.writeFileSync(path.join(publicDataDir, 'idx-map-listings.json'), mapJson);
    console.log(`✓ Also wrote to public/data/idx-map-listings.json`);

    // Stats
    const stats = {
      total: listings.length,
      withCoords: mapData.length,
      byType: {},
      byCity: {},
      priceRange: { min: Infinity, max: 0 },
      fetchedAt: new Date().toISOString(),
      apiCalls: totalApiCalls,
    };
    for (const l of listings) {
      stats.byType[l.propType] = (stats.byType[l.propType] || 0) + 1;
      stats.byCity[l.city] = (stats.byCity[l.city] || 0) + 1;
      if (l.price < stats.priceRange.min && l.price > 0) stats.priceRange.min = l.price;
      if (l.price > stats.priceRange.max) stats.priceRange.max = l.price;
    }
    // Top 10 cities
    stats.topCities = Object.entries(stats.byCity)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([city, count]) => ({ city, count }));

    const statsPath = path.join(DATA_DIR, 'idx-stats.json');
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    console.log(`✓ Wrote stats to ${statsPath}`);
    console.log(`\nStats: ${stats.total} total, ${stats.withCoords} with coords`);
    console.log(`Price range: $${stats.priceRange.min.toLocaleString()} - $${stats.priceRange.max.toLocaleString()}`);
    console.log(`Top cities:`, stats.topCities.map(c => `${c.city}(${c.count})`).join(', '));

  } finally {
    // Cleanup: delete all created saved links
    console.log(`\nCleaning up ${createdLinks.length} temporary saved links...`);
    for (const id of createdLinks) {
      await deleteSavedLink(id);
      await sleep(200);
    }
    console.log('Cleanup done.');
  }

  console.log(`\nTotal API calls: ${totalApiCalls}`);
  console.log('Done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
