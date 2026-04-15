import fs from 'fs';
import path from 'path';

const API_KEY = 'AIzaSyCZyedNXc7fZXALTDbumK-oA12e_oJzRZg';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
const IMAGEN_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${API_KEY}`;
const OUT_DIR = './public/images/generated';

async function getGroundedPrompt(place) {
  console.log(`  Researching: ${place}...`);
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `I need to generate a photorealistic image of "${place}". Search Google to find out exactly what this place and area looks like. Then write me a single detailed image generation prompt (under 200 words) that would produce a realistic photograph. Include specific visual details: terrain, vegetation types, rock/soil types, architectural styles, sky, and lighting. The prompt should start with "Professional photograph of" and be highly specific to what this real area actually looks like. Only return the prompt, nothing else.`
        }]
      }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 300 }
    })
  });
  const data = await res.json();
  if (data.error) { console.log('  Error:', data.error.message.slice(0, 100)); return null; }
  const text = data.candidates?.[0]?.content?.parts?.find(p => p.text)?.text || '';
  const grounding = data.candidates?.[0]?.groundingMetadata;
  if (grounding?.searchEntryPoint) console.log('  ✓ Grounded');
  return text.trim();
}

async function generateImage(prompt, filename) {
  console.log(`  Generating: ${filename}...`);
  const res = await fetch(IMAGEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: '16:9' },
    }),
  });
  const data = await res.json();
  if (data.error) { console.log('  Imagen error:', data.error.message.slice(0, 100)); return false; }
  const buffer = Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
  fs.writeFileSync(path.join(OUT_DIR, filename), buffer);
  console.log(`  ✓ ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);
  return true;
}

const images = [
  {
    name: 'new-braunfels-downtown.png',
    place: 'Rolling Texas Hill Country landscape near New Braunfels with limestone outcroppings, live oak and cedar trees, native wildflowers like bluebonnets and Indian paintbrush, winding country road, wide open sky at golden hour'
  },
  {
    name: 'nb-neighborhood.png',
    place: 'A scenic Hill Country vista near Canyon Lake and New Braunfels Texas, showing the layered green hills, scattered live oaks, a ranch fence line in the foreground, clear blue sky, warm afternoon light'
  },
  {
    name: 'faq-hero.png',
    place: 'A beautiful single-story Hill Country ranch-style home in the New Braunfels Texas area with native Texas limestone exterior, standing seam metal roof, covered front porch, native landscaping with Texas sage and prickly pear, live oak tree in front yard, gravel accents'
  },
  {
    name: 'closing-table.png',
    place: 'A wide panoramic view of the Texas Hill Country from an elevated vantage point near New Braunfels, showing green rolling hills fading into the distance, scattered ranch properties, the Balcones Escarpment, blue sky with scattered clouds, late afternoon golden light'
  },
  {
    name: 'modern-kitchen-wide.png',
    place: 'A beautiful two-story Texas Hill Country home in the New Braunfels area, Hill Country modern style with cream limestone and dark wood exterior, large windows, native landscaping, mature live oak trees, Hill Country hills visible in background'
  },
];

async function main() {
  console.log(`Replacing ${images.length} city photos with Hill Country views & homes...\n`);
  let success = 0;
  for (const img of images) {
    console.log(`\n[${img.name}]`);
    const prompt = await getGroundedPrompt(img.place);
    if (!prompt) continue;
    console.log(`  Prompt: ${prompt.slice(0, 120)}...`);
    await new Promise(r => setTimeout(r, 500));
    const ok = await generateImage(prompt, img.name);
    if (ok) success++;
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log(`\n\nDone! ${success}/${images.length} replaced.`);
}

main();
