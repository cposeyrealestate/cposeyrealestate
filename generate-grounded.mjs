import fs from 'fs';
import path from 'path';

const API_KEY = 'AIzaSyCZyedNXc7fZXALTDbumK-oA12e_oJzRZg';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
const IMAGEN_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${API_KEY}`;
const OUT_DIR = './public/images/generated';

// Step 1: Use Gemini with Google Search grounding to get accurate visual descriptions
async function getGroundedDescription(place) {
  console.log(`  Researching: ${place}...`);
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `I need to generate a photorealistic image of "${place}". Search Google to find out exactly what this place looks like. Then write me a single detailed image generation prompt (under 200 words) that would produce a realistic photograph of this actual location. Include specific visual details: water color, vegetation types, rock/soil types, architectural styles, landmarks, and lighting. The prompt should start with "Professional photograph of" and be highly specific to what this real place actually looks like. Only return the prompt, nothing else.`
        }]
      }],
      tools: [{ google_search: {} }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 300,
      }
    })
  });

  const data = await res.json();
  if (data.error) {
    console.log('  Grounding error:', data.error.message.slice(0, 100));
    return null;
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const grounding = data.candidates?.[0]?.groundingMetadata;
  if (grounding?.searchEntryPoint) {
    console.log('  ✓ Google Search grounding used');
  }
  return text.trim();
}

// Step 2: Generate image with Imagen using the grounded prompt
async function generateImage(prompt, filename) {
  console.log(`  Generating image: ${filename}...`);
  const res = await fetch(IMAGEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: '16:9' },
    }),
  });

  const data = await res.json();
  if (data.error) {
    console.log('  Imagen error:', data.error.message.slice(0, 100));
    return false;
  }

  const buffer = Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
  fs.writeFileSync(path.join(OUT_DIR, filename), buffer);
  console.log(`  ✓ Saved: ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
  return true;
}

// Images to regenerate with grounding
const images = [
  {
    name: 'guadalupe-river.png',
    place: 'Guadalupe River near New Braunfels Texas in summer, the actual river where people go tubing',
  },
  {
    name: 'comal-river.png',
    place: 'Comal River in New Braunfels Texas, the shortest navigable river in the US with crystal clear spring-fed water',
  },
  {
    name: 'new-braunfels-downtown.png',
    place: 'Downtown New Braunfels Texas main plaza and historic district with German heritage buildings',
  },
  {
    name: 'nb-neighborhood.png',
    place: 'Typical residential neighborhood in New Braunfels Texas Hill Country with ranch-style homes and mature oak trees',
  },
  {
    name: 'hill-country-sunset.png',
    place: 'Texas Hill Country landscape between New Braunfels and Wimberley with rolling limestone hills, live oak trees, and wildflowers at sunset',
  },
  {
    name: 'hill-country-aerial.png',
    place: 'Aerial view of Texas Hill Country near New Braunfels showing the green rolling hills, Guadalupe River winding through, scattered ranch properties',
  },
  {
    name: 'hill-country-home-1.png',
    place: 'A beautiful home in the Texas Hill Country near New Braunfels, typical of the area with limestone and stucco exterior, metal roof, covered patio, native landscaping',
  },
  {
    name: 'hill-country-home-2.png',
    place: 'A luxury Hill Country ranch home near New Braunfels Texas with native Texas limestone exterior, large front porch with stone columns, live oak trees in yard',
  },
  {
    name: 'porch-view.png',
    place: 'View from a back porch of a Texas Hill Country home near New Braunfels looking out at rolling green hills and live oak trees at golden hour',
  },
];

async function main() {
  console.log(`Regenerating ${images.length} images with Google Search grounding...\n`);

  let success = 0;
  for (const img of images) {
    console.log(`\n[${img.name}]`);

    // Step 1: Get grounded description
    const prompt = await getGroundedDescription(img.place);
    if (!prompt) {
      console.log('  Skipping - no prompt generated');
      continue;
    }
    console.log(`  Prompt: ${prompt.slice(0, 150)}...`);

    // Small delay
    await new Promise(r => setTimeout(r, 500));

    // Step 2: Generate image
    const ok = await generateImage(prompt, img.name);
    if (ok) success++;

    // Rate limit
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log(`\n\nDone! ${success}/${images.length} images regenerated with grounding.`);
}

main();
