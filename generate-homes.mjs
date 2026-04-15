import fs from 'fs';
import path from 'path';

const API_KEY = 'AIzaSyCZyedNXc7fZXALTDbumK-oA12e_oJzRZg';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;
const IMAGEN_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${API_KEY}`;
const OUT_DIR = './public/images/generated';

async function getGroundedPrompt(place) {
  console.log(`  Researching...`);
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: `I need to generate a photorealistic image of "${place}". Search Google to find out exactly what homes and architecture look like in this real area. Then write me a single detailed image generation prompt (under 200 words) that produces a realistic photograph. Include specific details about architectural styles, materials, landscaping, and terrain typical of this exact area. Start with "Professional real estate photograph of" and be highly specific. Only return the prompt.`
        }]
      }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 300 }
    })
  });
  const data = await res.json();
  if (data.error) { console.log('  Error:', data.error.message.slice(0, 100)); return null; }
  const text = data.candidates?.[0]?.content?.parts?.find(p => p.text)?.text || '';
  if (data.candidates?.[0]?.groundingMetadata?.searchEntryPoint) console.log('  ✓ Grounded');
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
    name: 'home-nb-ranch.png',
    place: 'A single-story ranch home typical of New Braunfels Texas neighborhoods, with Texas limestone and stucco exterior, standing seam metal roof, covered front porch, mature live oak tree in front yard, well-manicured lawn, Hill Country style'
  },
  {
    name: 'home-nb-modern.png',
    place: 'A modern Hill Country home in a New Braunfels Texas master-planned community like Vintage Oaks, contemporary Texas design with large windows, native limestone accents, metal roof, drought-tolerant landscaping, Hill Country views'
  },
  {
    name: 'home-nb-twostory.png',
    place: 'A two-story family home in a New Braunfels Texas suburban subdivision like River Chase or Westpointe, craftsman style, stone and hardie board exterior, two-car garage, green lawn, neighborhood street with sidewalks and young trees'
  },
  {
    name: 'home-interior-hc.png',
    place: 'Interior of a Texas Hill Country home in the New Braunfels area, open floor plan with high ceilings, exposed wood beams, native limestone fireplace, large windows showing Hill Country views, modern farmhouse style'
  },
];

async function main() {
  console.log(`Generating ${images.length} Hill Country home images...\n`);
  let success = 0;
  for (const img of images) {
    console.log(`[${img.name}]`);
    const prompt = await getGroundedPrompt(img.place);
    if (!prompt) continue;
    console.log(`  Prompt: ${prompt.slice(0, 120)}...`);
    await new Promise(r => setTimeout(r, 500));
    const ok = await generateImage(prompt, img.name);
    if (ok) success++;
    await new Promise(r => setTimeout(r, 1500));
  }
  console.log(`\nDone! ${success}/${images.length} home images generated.`);
}

main();
