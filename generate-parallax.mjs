import fs from 'fs';
import path from 'path';

const API_KEY = 'AIzaSyCZyedNXc7fZXALTDbumK-oA12e_oJzRZg';
const MODEL = 'imagen-4.0-fast-generate-001';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:predict?key=${API_KEY}`;
const OUT_DIR = './public/images/generated';

const images = [
  {
    name: 'guadalupe-river.png',
    prompt: 'Scenic Guadalupe River in Texas Hill Country with crystal clear green water, tall cypress trees on riverbanks, limestone cliffs, kayakers in distance, beautiful sunny day, professional landscape photography, panoramic wide angle, 4K',
  },
  {
    name: 'nb-neighborhood.png',
    prompt: 'Beautiful suburban neighborhood street in New Braunfels Texas at golden hour, tree-lined street with mature live oaks, charming craftsman and ranch style homes, kids riding bikes, green lawns, warm golden sunset light, professional real estate photography, panoramic wide angle, 4K',
  },
  {
    name: 'hill-country-sunset.png',
    prompt: 'Dramatic panoramic sunset over Texas Hill Country landscape, rolling green hills, scattered oak trees, wildflowers in foreground, orange and purple sky, beautiful natural scenery, professional landscape photography, ultrawide panoramic, 4K',
  },
  {
    name: 'modern-kitchen-wide.png',
    prompt: 'Panoramic view of a stunning modern farmhouse kitchen in Texas with large island, white marble countertops, wood beam ceiling, stainless appliances, large windows with Hill Country view, pendant lighting, warm natural light, professional interior real estate photography, wide angle, 4K',
  },
  {
    name: 'porch-view.png',
    prompt: 'View from a covered back porch of a Texas Hill Country home looking out over rolling hills at sunset, comfortable outdoor furniture, string lights overhead, glass of wine on table, warm golden light, relaxing lifestyle scene, professional photography, panoramic, 4K',
  },
];

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
      return;
    }
    const buffer = Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
    fs.writeFileSync(path.join(OUT_DIR, img.name), buffer);
    console.log(`  OK: ${(buffer.length / 1024).toFixed(0)} KB`);
  } catch (err) {
    console.error(`  ERROR: ${err.message}`);
  }
}

async function main() {
  for (const img of images) {
    await generateImage(img);
    await new Promise(r => setTimeout(r, 1000));
  }
  console.log('Done!');
}

main();
