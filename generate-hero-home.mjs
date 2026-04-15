import fs from 'fs';

const API_KEY = 'AIzaSyCZyedNXc7fZXALTDbumK-oA12e_oJzRZg';

async function groundedResearch() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: 'What do luxury modern homes in the Texas Hill Country look like from above? Describe the architectural style of high-end modern Hill Country homes — flat or low-pitched metal roofs, floor-to-ceiling windows, natural stone and wood exteriors, infinity pools, outdoor living spaces. Describe the surrounding Hill Country landscape visible from an aerial drone shot — rolling green hills, live oaks, limestone outcroppings, blue sky. Give me a 2-3 sentence visual description for generating a photorealistic aerial drone image.' }] }],
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

  const prompt = `Stunning aerial drone photograph shot from above and slightly behind a luxurious modern Hill Country home in Texas. ${research}. The home sits on an elevated lot with sweeping panoramic views of the Texas Hill Country stretching to the horizon — rolling green hills dotted with live oak trees, limestone terrain, and a clear blue sky. The property has beautiful landscaping, an outdoor pool area, and stone driveway. Golden hour warm light. Ultra high quality professional real estate drone photography, 16:9 wide format.`;

  console.log('\nStep 2: Generating image...');
  await generateImage(prompt, 'hero-home-aerial');
  console.log('Done!');
}

main();
