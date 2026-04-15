import fs from 'fs';
import path from 'path';

const API_KEY = 'AIzaSyCZyedNXc7fZXALTDbumK-oA12e_oJzRZg';
const OUTPUT_DIR = 'public/images/generated';

const images = [
  {
    name: 'canyon-lake-water',
    groundingQuery: 'What does Canyon Lake Texas look like? Describe the turquoise blue water, limestone cliffs, the dam, surrounding Hill Country terrain, boat docks, and typical weather lighting.',
    promptTemplate: (research) => `Photorealistic wide landscape photograph of Canyon Lake, Texas. ${research}. Shot during golden hour with warm light. High resolution, professional real estate photography style, 16:9 aspect ratio.`
  },
  {
    name: 'cibolo-schertz-home',
    groundingQuery: 'What do typical homes in Cibolo and Schertz Texas look like? Describe the suburban neighborhoods, housing styles, brick homes, manicured lawns, and neighborhood character.',
    promptTemplate: (research) => `Photorealistic photograph of a beautiful suburban home in Cibolo-Schertz, Texas. ${research}. Neatly manicured front lawn, paved driveway, clear blue sky. Professional real estate photography, warm natural lighting.`
  },
  {
    name: 'modern-home-nb',
    groundingQuery: 'What do modern new construction homes in New Braunfels Texas look like? Describe the architectural style of newer homes in neighborhoods like Vintage Oaks, Homestead, or River Chase.',
    promptTemplate: (research) => `Photorealistic photograph of a modern new construction home in New Braunfels, Texas. ${research}. Beautiful curb appeal with landscaping, stone and stucco exterior, warm evening light. Professional real estate photography.`
  }
];

async function groundedResearch(query) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: query + ' Give me a concise 2-3 sentence visual description I can use as an image generation prompt.' }] }],
      tools: [{ google_search: {} }]
    })
  });
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.map(p => p.text || '').join(' ').trim();
  console.log(`  Research: ${text.substring(0, 150)}...`);
  return text;
}

async function generateImage(prompt, outputName) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1, aspectRatio: '16:9' }
    })
  });
  const data = await res.json();
  if (data.predictions?.[0]?.bytesBase64Encoded) {
    const buf = Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
    const outPath = path.join(OUTPUT_DIR, `${outputName}.png`);
    fs.writeFileSync(outPath, buf);
    console.log(`  Saved: ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
    return true;
  }
  console.error(`  ERROR: No image data for ${outputName}`, JSON.stringify(data).substring(0, 200));
  return false;
}

async function main() {
  for (const img of images) {
    console.log(`\nGenerating: ${img.name}`);
    console.log('  Step 1: Grounded research...');
    const research = await groundedResearch(img.groundingQuery);
    const prompt = img.promptTemplate(research);
    console.log(`  Step 2: Generating image...`);
    console.log(`  Prompt: ${prompt.substring(0, 120)}...`);
    await generateImage(prompt, img.name);
  }
  console.log('\nDone!');
}

main();
