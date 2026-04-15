import fs from 'fs';
const API_KEY = 'AIzaSyCZyedNXc7fZXALTDbumK-oA12e_oJzRZg';
const IMAGEN_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${API_KEY}`;

const prompt = "Professional real estate photograph of a two-story family home in a New Braunfels Texas suburban subdivision. Craftsman style with native Texas limestone and hardie board siding, two-car garage, covered front porch with stone columns, green manicured lawn, young live oak trees along street, warm golden hour sunlight, clear blue Texas sky, residential neighborhood setting with sidewalks";

async function main() {
  console.log('Generating...');
  const res = await fetch(IMAGEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: '16:9' } }),
  });
  const data = await res.json();
  if (data.error) { console.log('Error:', data.error.message); return; }
  const buf = Buffer.from(data.predictions[0].bytesBase64Encoded, 'base64');
  fs.writeFileSync('./public/images/generated/home-nb-twostory.png', buf);
  console.log(`✓ home-nb-twostory.png (${(buf.length/1024).toFixed(0)} KB)`);
}
main();
