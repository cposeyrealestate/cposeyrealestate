/**
 * IDX listing scraper — bootstraps a self-hosted /portfolio/{slug} page.
 *
 * Usage:
 *   node scrape-listing.mjs <idx-url>
 *
 *   e.g. node scrape-listing.mjs \
 *     https://cposeyrealestate.idxbroker.com/idx/details/listing/a023/1945785/7607-Sky-Loop-San-Antonio-TX
 *
 * What it does:
 *   1. Downloads the IDX detail HTML.
 *   2. Pulls every gallery photo from the SABOR CDN to
 *      public/images/listings/<mlsId>-N.jpg (in display order).
 *   3. Parses out price, beds, baths, sqft, acres, year built, property
 *      type, subdivision, county, HOA, and the full MLS public remarks.
 *   4. Geocodes the street address via the US Census geocoder
 *      (free, no API key) → lat/lng for the property map.
 *   5. Writes <mlsId>-extracted.json — paste relevant pieces into
 *      src/data/portfolio.json (and add `youtubeId` if you have a video).
 *
 *   The script never edits portfolio.json directly so the agent can
 *   review wording, group features, and pick a hero image first.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const url = process.argv[2];
if (!url || !/^https?:\/\//.test(url)) {
  console.error('Usage: node scrape-listing.mjs <idx-detail-url>');
  process.exit(1);
}

// --- 1. Fetch the IDX page (curl is more reliable than fetch on cloudflare-protected hosts) ---
console.log(`→ Fetching ${url}`);
execSync(
  `curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" "${url}" -o idx_page.html`,
  { stdio: 'inherit' },
);
const html = fs.readFileSync('idx_page.html', 'utf8');
console.log(`  ${(html.length / 1024).toFixed(0)} KB downloaded`);

// --- 2. Determine MLS ID + slug from URL ---
const urlParts = url.split('/').filter(Boolean);
const mlsId = urlParts[urlParts.length - 2];
if (!/^\d+$/.test(mlsId)) {
  console.error(`Could not parse MLS ID from URL (expected …/<mlsId>/<slug>): ${mlsId}`);
  process.exit(1);
}

// --- 3. Helpers for parsing the IDX-field-* divs ---
function readField(name) {
  // Matches both class="IDX-field-X" and id="IDX-field-X" patterns.
  const rx = new RegExp(
    `(?:class="IDX-field-${name}\\b[^"]*"|id="IDX-field-${name}")[^>]*>\\s*<span class="IDX-label">[^<]*</span>\\s*<span class="IDX-text">([\\s\\S]*?)</span>`,
    'i',
  );
  const m = html.match(rx);
  if (!m) return undefined;
  return m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || undefined;
}

function decodeHtml(s) {
  if (!s) return s;
  return s
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

// --- 4. Extract photos (data-src in gallery, in document order) ---
const photoRx = /data-src="\s*(https:\/\/sabor-assets\.cdn-connectmls\.com\/pics\/[^\s"']+\.(?:JPEG|jpg|jpeg|JPG))/gi;
const photoUrls = [];
let pm;
while ((pm = photoRx.exec(html)) !== null) photoUrls.push(pm[1]);
console.log(`→ Found ${photoUrls.length} photos`);

const outDir = path.join('public', 'images', 'listings');
fs.mkdirSync(outDir, { recursive: true });

let photoOk = 0;
for (let i = 0; i < photoUrls.length; i++) {
  const photoUrl = photoUrls[i];
  const outPath = path.join(outDir, `${mlsId}-${i + 1}.jpg`);
  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
    photoOk++;
    continue;
  }
  try {
    const res = await fetch(photoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://cposeyrealestate.idxbroker.com/',
      },
    });
    if (!res.ok) {
      console.error(`  [${i + 1}] HTTP ${res.status}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outPath, buf);
    photoOk++;
    if ((i + 1) % 10 === 0 || i === photoUrls.length - 1) {
      console.log(`  ${i + 1}/${photoUrls.length} downloaded`);
    }
  } catch (err) {
    console.error(`  [${i + 1}] ${err.message}`);
  }
}
console.log(`  ${photoOk}/${photoUrls.length} on disk`);

// --- 5. Extract structured metadata ---
const price = readField('listingPrice');                  // "$1,175,000"
const status = readField('propStatus');                   // "Active"
const beds = readField('bedrooms');                       // "4"
const totalBaths = readField('totalBaths');               // "3"
const fullBaths = readField('fullBaths');                 // "3"
const halfBaths = readField('halfBaths');                 // "1"
const sqft = readField('sqFt');                           // "4,164"
const acres = readField('acres');                         // "1.39"
const yearBuilt = readField('yearBuilt');                 // "2007"
const propType = readField('propType');                   // "Single Family Residential"
const propSubType = readField('propSubType');             // "Single Family Detached"
const subdivision = readField('subdivision');             // "Canham Ranch"
const subdivisionLegal = readField('subdivisionLegalName');
const county = readField('countyName');                   // "Comal"
const hoaFee = readField('hoaFee');                       // "450"
const hoaFreq = readField('hoaFrequency');                // "Annually"
const hoaName = readField('hoaName');

// Extra fields used to build the Interior / Exterior / Area & Lot groups
const flooring = readField('floor');
const fireplace = readField('fireplace2');
const numFireplaces = readField('numberOfFireplaces');
const interior = readField('interior');
const inclusions = readField('inclusions');
const masterBath = readField('masterBath');
const masterBedroom = readField('masterBedroom');
const exterior = readField('exterior');
const exteriorFeatures = readField('exteriorFeatures');
const numStories = readField('numOfStories');
const parking = readField('parking');
const poolYN = readField('poolYN');
const poolSpa = readField('pooLSpa');
const roof = readField('roof') || readField('roofing');
const heating = readField('heating');
const heatingFuel = readField('heatingFuel');
const airConditioning = readField('airConditioning');
const foundation = readField('foundation');
const accessibility = readField('accessibility');
const energyEfficiency = readField('energyEfficiency');
const lotDescription = readField('lotDescription');
const neighborhoodAmenities = readField('neighborhoodAmenities');
const elementarySchool = readField('elementarySchool');
const middleSchool = readField('middleSchool');
const highSchool = readField('highSchool');
const schoolDistrict = readField('schoolDistrict');
const totalTax = readField('totalTax');
const builderName = readField('builderName');
const style = readField('style');
const utilityWater = readField('utilitySupplierWater');

// Address pieces — IDX renders these in a different markup chunk, so use
// the hidden contact form's name="address|cityName|state|zipcode" inputs
// which are always present and reliable.
function readHiddenInput(name) {
  const rx = new RegExp(`name="${name}"\\s+value="([^"]*)"`, 'i');
  const m = html.match(rx);
  return m ? decodeHtml(m[1]).trim() : undefined;
}
const street = readHiddenInput('address');                // "7607 Sky Loop"
const cityName = readHiddenInput('cityName');             // "San Antonio"
const stateName = readHiddenInput('state');               // "Texas"
const zipcode = readHiddenInput('zipcode');               // "78266"

// MLS public remarks live in <meta name="description"> — IDX collapses
// paragraph breaks into runs of 4+ spaces. Decode entities and restore.
let description = '';
const metaDescRx = /<meta\s+name="description"\s+content="([^"]+)"/i;
const dm = html.match(metaDescRx);
if (dm) {
  description = decodeHtml(dm[1])
    .replace(/^([^A-Z]*?\*\s+[^*]+)+/, '') // drop leading bullet "highlights" line
    .replace(/\s{4,}/g, '\n\n')             // restore paragraph breaks
    .trim();
}

// --- 6. Geocode via US Census (no API key, authoritative for US addresses) ---
let lat = null, lng = null;
if (street && cityName && stateName) {
  const oneline = `${street}, ${cityName}, ${stateName} ${zipcode || ''}`.trim();
  const geoUrl = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(oneline)}&benchmark=Public_AR_Current&format=json`;
  console.log(`→ Geocoding "${oneline}"`);
  try {
    const r = await fetch(geoUrl);
    const data = await r.json();
    const match = data?.result?.addressMatches?.[0];
    if (match?.coordinates) {
      lat = +match.coordinates.y.toFixed(6);
      lng = +match.coordinates.x.toFixed(6);
      console.log(`  → ${lat}, ${lng}`);
    } else {
      console.warn('  Geocoder returned no match — fill lat/lng manually');
    }
  } catch (err) {
    console.warn(`  Geocoder failed: ${err.message}`);
  }
}

// --- 7. Convert HOA fee to monthly (calculator wants $/mo) ---
let hoaMonthly = null;
if (hoaFee) {
  const fee = parseFloat(String(hoaFee).replace(/[^0-9.]/g, ''));
  if (!Number.isNaN(fee)) {
    const f = (hoaFreq || '').toLowerCase();
    if (f.includes('annual') || f.includes('year')) hoaMonthly = +(fee / 12).toFixed(2);
    else if (f.includes('quarter')) hoaMonthly = +(fee / 3).toFixed(2);
    else if (f.includes('semi')) hoaMonthly = +(fee / 6).toFixed(2);
    else hoaMonthly = +fee.toFixed(2); // default = monthly
  }
}

// --- 8. Build the portfolio.json snippet ---
function citySlug(streetStr) {
  if (!streetStr) return '';
  return streetStr.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Helpers — collapse messy MLS-ese into something readable, drop empty rows
const trunc = (s, max = 200) => (s && s.length > max ? s.slice(0, max - 1) + '…' : s);
function fmtAcres(a) { return a ? `${a} Acres` : undefined; }
function fmtSqft(s) { return s ? `${s} Sq.Ft.` : undefined; }
function fmtPrice(p) { return p ? p : undefined; }
function fmtMoney(n) {
  const num = parseFloat(String(n).replace(/[^0-9.]/g, ''));
  return Number.isFinite(num) ? `$${num.toLocaleString('en-US')}` : undefined;
}
function fmtHoa() {
  if (!hoaFee) return undefined;
  const fee = fmtMoney(hoaFee);
  const freq = hoaFreq ? `/${hoaFreq.toLowerCase().replace(/ly$/, '')}` : '';
  const name = hoaName ? ` — ${hoaName}` : '';
  return `${fee}${freq}${name}`;
}
// Derive laundry location from the interior text ("Laundry Main Level", etc.)
function deriveLaundry(text) {
  if (!text) return undefined;
  const m = text.match(/Laundry\s+(Main\s+Level|Lower\s+Level|Upper\s+Level|Room|in\s+Garage)/gi);
  return m && m.length ? [...new Set(m)].join(', ') : undefined;
}
// Combine fields like Heat (units + fuel)
function joinNonEmpty(parts, sep = ', ') {
  return parts.filter(Boolean).map((s) => s.trim()).join(sep) || undefined;
}
function row(label, value) {
  return value !== undefined && value !== null && value !== '' ? [label, value] : null;
}

// Group rows in the order we want them rendered. Filter out null (= no data).
const featuresInterior = [
  row('Total Bedrooms', beds),
  row('Total Bathrooms', totalBaths),
  row('Full Bathrooms', fullBaths),
  row('Half Bathroom', halfBaths),
  row('Laundry Room', deriveLaundry(interior)),
  row('Flooring', flooring),
  row('Fireplace', joinNonEmpty([fireplace, numFireplaces && +numFireplaces > 0 ? `${numFireplaces} fireplace${numFireplaces === '1' ? '' : 's'}` : null])),
  row('Master Bedroom', masterBedroom),
  row('Master Bath', masterBath),
  row('Appliances', trunc(inclusions)),
  row('Other Interior Features', trunc(interior)),
].filter(Boolean);

const featuresExterior = [
  row('Stories', numStories),
  row('Garage', parking ? joinNonEmpty([parking, exteriorFeatures && /circular/i.test(exteriorFeatures) ? 'Circular Driveway' : null]) : undefined),
  row('Pool', poolYN && poolYN.toLowerCase() === 'yes' ? (poolSpa || 'Yes') : undefined),
  row('Roof', roof),
  row('Construction', exterior),
  row('Foundation', foundation),
  row('Heat Type', joinNonEmpty([heating, heatingFuel])),
  row('Air Conditioning', airConditioning),
  row('Energy Efficiency', trunc(energyEfficiency)),
  row('Exterior Features', trunc(exteriorFeatures)),
  row('Lot Description', trunc(lotDescription)),
  row('Disability Features', trunc(accessibility)),
  row('Neighborhood Amenities', neighborhoodAmenities),
].filter(Boolean);

const featuresAreaLot = [
  row('Status', status),
  row('Living Area', fmtSqft(sqft)),
  row('Lot Area', fmtAcres(acres)),
  row('MLS® ID', mlsId),
  row('Type', propSubType || propType),
  row('Year Built', yearBuilt),
  row('Architecture Style', style),
  row('Subdivision', subdivisionLegal || subdivision),
  row('County', county),
  row('Elementary School', elementarySchool),
  row('Middle School', middleSchool),
  row('High School', highSchool),
  row('School District', schoolDistrict),
  row('Annual Taxes', fmtMoney(totalTax)),
  row('HOA', fmtHoa()),
  row('Builder', builderName),
].filter(Boolean);

const features = {
  Interior: featuresInterior,
  Exterior: featuresExterior,
  'Area & Lot': featuresAreaLot,
};

const entry = {
  source: 'internal',
  mlsId,
  slug: citySlug(street),                     // e.g. "7607-sky-loop"
  status: status || 'Active',
  price: price || null,
  address: street || null,
  city: cityName && zipcode
    ? `${cityName}, ${stateName === 'Texas' ? 'TX' : stateName} ${zipcode}`
    : cityName || null,
  beds: beds ? parseInt(beds, 10) : undefined,
  baths: totalBaths ? parseFloat(totalBaths) : undefined,
  sqft: sqft || undefined,
  acres: acres || undefined,
  yearBuilt: yearBuilt ? parseInt(yearBuilt, 10) : undefined,
  propertyType: propSubType || propType || undefined,
  subdivision: subdivisionLegal || subdivision || undefined,
  county: county || undefined,
  hoaMonthly,                                 // $/mo for the calculator
  lat, lng,                                   // for the map
  youtubeId: null,                            // ← fill in if you have a tour
  img: `/images/listings/${mlsId}-1.jpg`,
  gallery: photoUrls.map((_, i) => `/images/listings/${mlsId}-${i + 1}.jpg`),
  description,
  features,                                   // structured label/value rows
};

// Strip undefineds for cleaner JSON
const cleaned = JSON.parse(JSON.stringify(entry));

const outFile = `${mlsId}-extracted.json`;
fs.writeFileSync(outFile, JSON.stringify(cleaned, null, 2));

console.log(`\n✓ Wrote ${outFile}`);
console.log('\nNext steps:');
console.log(`  1. Review the description and group features into Interior/Exterior/Amenities.`);
console.log(`  2. Add a youtubeId if you have a video tour.`);
console.log(`  3. Paste the entry into src/data/portfolio.json under "currentListings".`);
console.log(`  4. Delete idx_page.html (in .gitignore).`);
