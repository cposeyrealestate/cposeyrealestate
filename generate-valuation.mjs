import fs from 'fs';

const API_KEY = 'AIzaSyCZyedNXc7fZXALTDbumK-oA12e_oJzRZg';

async function groundedResearch() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'What do beautiful homes in New Braunfels Texas look like from the street? Describe the curb appeal of upscale homes in neighborhoods like Vintage Oaks, River Chase, or Gruene — the stone and stucco exteriors, landscaping, driveways, mature trees. Give me a 2-3 sentence visual description for generating a photorealistic image of a gorgeous NB home with excellent curb appeal.' }] }],
      tools: [{ google_search: {} }]
    })
  });
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map(p => p.text || '').join(' ').trim();
}

async function generateImage(prompt, name) {
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
    fs.writeFileSync(`public/images/generated/${name}.png`, buf);
    console.log(`Saved: ${name}.png (${(buf.length / 1024).toFixed(0)} KB)`);
  } else {
    console.error('ERROR:', JSON.stringify(data).substring(0, 300));
  }
}

async function main() {
  console.log('Step 1: Grounded research...');
  const research = await groundedResearch();
  console.log('Research:', research.substring(0, 200));

  const prompt = `Photorealistic street-level photograph of a stunning home in New Braunfels, Texas with excellent curb appeal. ${research}. Beautiful front yard with mature oak trees and native Texas landscaping, stone walkway leading to the front door. Golden hour warm evening light. Professional real estate photography, wide angle, 16:9 format.`;

  console.log('\nStep 2: Generating image...');
  await generateImage(prompt, 'home-valuation-hero');
  console.log('Done!');
}

main();
