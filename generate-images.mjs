import fs from 'fs';
import path from 'path';

const API_KEY = 'AIzaSyCZyedNXc7fZXALTDbumK-oA12e_oJzRZg';
const MODEL = 'imagen-4.0-fast-generate-001';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predict?key=${API_KEY}`;
const OUT_DIR = './public/images/generated';

// Images to generate - realistic photos for the site
const images = [
  {
    name: 'hill-country-home-1.png',
    prompt: 'Beautiful single-story Texas Hill Country ranch home with cream limestone exterior, dark metal roof, large covered porch with stone columns, mature live oak trees in front yard, manicured green lawn, blue sky with wispy clouds, golden hour warm light, professional real estate photography, wide angle, 4K high quality',
  },
  {
    name: 'hill-country-home-2.png',
    prompt: 'Stunning two-story Texas Hill Country home with native limestone and wood accents, wraparound porch, large windows, xeriscaped front yard with Texas sage and agave plants, gravel driveway, scenic Hill Country rolling hills in background, warm sunset light, professional real estate exterior photo, 4K',
  },
  {
    name: 'new-braunfels-downtown.png',
    prompt: 'Charming downtown New Braunfels Texas historic main street with German-style buildings, colorful storefronts, American flags, mature trees lining the street, pedestrians walking, warm sunny day, small town America charm, professional photography, wide angle, 4K',
  },
  {
    name: 'comal-river.png',
    prompt: 'Beautiful clear turquoise Comal River in New Braunfels Texas with cypress trees along the banks, lush green vegetation, sunlight filtering through trees, calm flowing water over rocks, serene natural setting, professional landscape photography, 4K',
  },
  {
    name: 'family-new-home.png',
    prompt: 'Happy diverse family of four standing in front of their new beautiful home holding keys, excited expressions, moving boxes nearby, suburban Texas neighborhood, green lawn, warm natural light, lifestyle photography, 4K high quality',
  },
  {
    name: 'home-interior-kitchen.png',
    prompt: 'Modern open-concept kitchen in Texas home with white quartz countertops, dark wood island, stainless steel appliances, pendant lights, shiplap accent wall, natural light from large windows, fresh flowers on counter, warm and inviting, professional interior real estate photography, 4K',
  },
  {
    name: 'home-interior-living.png',
    prompt: 'Spacious modern farmhouse living room in Texas home with high vaulted ceiling, exposed wood beams, large stone fireplace, comfortable sectional sofa, large windows with Hill Country views, natural light, warm neutral tones, professional interior real estate photography, 4K',
  },
  {
    name: 'closing-table.png',
    prompt: 'Professional real estate closing meeting at title company, couple signing documents at conference table, real estate agent and title officer present, modern office with glass windows, paperwork and pens on table, warm professional lighting, business photography, 4K',
  },
  {
    name: 'hill-country-aerial.png',
    prompt: 'Stunning aerial view of Texas Hill Country landscape with rolling green hills, scattered oak trees, winding country road, ranch properties in distance, blue sky with white clouds, golden hour light, drone photography style, 4K panoramic',
  },
  {
    name: 'home-sold.png',
    prompt: 'Beautiful Texas suburban home with SOLD real estate sign in front yard, well-maintained lawn, mature trees, charming front porch, warm golden hour light, celebration feeling, professional real estate photography, 4K',
  },
  {
    name: 'calculator-hero.png',
    prompt: 'Close up of a modern desk with a laptop showing financial charts, calculator, pen, house model miniature, mortgage documents, coffee cup, warm natural light from window, professional business photography, shallow depth of field, 4K',
  },
  {
    name: 'faq-hero.png',
    prompt: 'Friendly professional real estate agent in business casual attire having a consultation with a young couple in a bright modern office, large windows, whiteboard in background, warm natural light, professional lifestyle photography, 4K',
  },
];

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

let totalCost = 0;
const COST_PER_IMAGE = 0.02; // Imagen 4 Fast approximate cost

async function generateImage(img) {
  console.log(`Generating: ${img.name}...`);
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: img.prompt }],
        parameters: { sampleCount: 1, aspectRatio: '16:9' },
      }),
    });

    const data = await res.json();
    if (data.error) {
      console.error(`  ERROR: ${data.error.message.slice(0, 100)}`);
      return false;
    }

    const predictions = data.predictions || [];
    if (predictions.length === 0) {
      console.error(`  ERROR: No predictions returned`);
      return false;
    }

    const base64 = predictions[0].bytesBase64Encoded;
    const buffer = Buffer.from(base64, 'base64');
    const filePath = path.join(OUT_DIR, img.name);
    fs.writeFileSync(filePath, buffer);
    totalCost += COST_PER_IMAGE;
    console.log(`  OK: ${filePath} (${(buffer.length / 1024).toFixed(0)} KB) — running total: $${totalCost.toFixed(2)}`);
    return true;
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
    return false;
  }
}

// Generate sequentially to be kind to the API
async function main() {
  console.log(`Generating ${images.length} images...`);
  console.log(`Estimated cost: $${(images.length * COST_PER_IMAGE).toFixed(2)}\n`);

  let success = 0;
  for (const img of images) {
    const ok = await generateImage(img);
    if (ok) success++;
    // Small delay between requests
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\nDone! ${success}/${images.length} images generated.`);
  console.log(`Estimated total cost: $${totalCost.toFixed(2)}`);
}

main();
