import fs from 'fs';
import path from 'path';

const API_KEY = 'AIzaSyCZyedNXc7fZXALTDbumK-oA12e_oJzRZg';
const OUTPUT_DIR = 'public/images/generated/neighborhoods';

const NEIGHBORHOODS = [
  // New Braunfels
  { name: 'nb-river-chase', query: 'What do homes in River Chase neighborhood New Braunfels TX look like? Describe the architectural style, exterior materials, lot sizes, and curb appeal.' },
  { name: 'nb-vintage-oaks', query: 'What do homes in Vintage Oaks community New Braunfels TX look like? Describe the luxury custom homes, Hill Country architecture, stone exteriors, large lots.' },
  { name: 'nb-copper-ridge', query: 'What do homes in Copper Ridge neighborhood New Braunfels TX look like? Describe the gated community homes, estate lots, architectural style.' },
  { name: 'nb-manor-creek', query: 'What do homes in Manor Creek neighborhood New Braunfels TX look like? Describe the gated community, Hill Country style homes, stone and brick exteriors.' },
  { name: 'nb-veramendi', query: 'What do homes in Veramendi master-planned community New Braunfels TX look like? Describe the new construction homes, stone and brick exteriors, modern layouts.' },
  { name: 'nb-mayfair', query: 'What do homes in Mayfair SouthStar Communities New Braunfels TX look like? Describe the newer construction homes, modern Hill Country style.' },
  { name: 'nb-gruene', query: 'What do homes and buildings in Gruene Historic District New Braunfels TX look like? Describe the mix of historic structures, cottages, and newer custom builds.' },
  // Canyon Lake
  { name: 'cl-canyon-lake-hills', query: 'What do homes in Canyon Lake Hills community Canyon Lake TX look like? Describe the lakefront and lake-area homes, architectural styles.' },
  { name: 'cl-mystic-shores', query: 'What do homes in Mystic Shores community Canyon Lake TX look like? Describe the luxury Hill Country homes on large acreage lots with views.' },
  { name: 'cl-oak-shores', query: 'What do homes in Oak Shores Estates Canyon Lake TX look like? Describe the gated lakefront community homes, custom builds.' },
  { name: 'cl-canyon-lake-estates', query: 'What do homes near Canyon Lake TX look like? Describe typical lake area residential homes with Hill Country character.' },
  { name: 'cl-hancock', query: 'What do rural properties along Hancock Road Canyon Lake TX look like? Describe the rural Hill Country land and homes in the area.' },
  { name: 'cl-river-mountain-ranch', query: 'What do homes in River Mountain Ranch Canyon Lake TX look like? Describe the luxury acreage community homes along the Guadalupe River.' },
  // Seguin
  { name: 'seg-nob-hill', query: 'What do condos and homes in Nob Hill area Seguin TX look like? Describe the established residential community.' },
  { name: 'seg-mill-creek', query: 'What do homes in Village of Mill Creek Seguin TX look like? Describe the family-friendly neighborhood homes.' },
  { name: 'seg-cordova-crossing', query: 'What do homes in Cordova Crossing Seguin TX look like? Describe the modern new construction homes with contemporary designs.' },
  { name: 'seg-downtown', query: 'What do homes in downtown Seguin TX historic district look like? Describe the Victorian houses, bungalows, and historic character.' },
  { name: 'seg-country-club', query: 'What do homes in Country Club Estates Seguin TX look like? Describe the neighborhood near Seguin Country Club.' },
  { name: 'seg-river-oaks', query: 'What do homes in River Oaks neighborhood Seguin TX look like? Describe the waterfront homes near Lake Seguin and Guadalupe River.' },
  // Cibolo-Schertz
  { name: 'cs-saddle-creek', query: 'What do homes in Saddle Creek Ranch Cibolo TX look like? Describe the suburban community homes, modern interiors, stone exteriors.' },
  { name: 'cs-falcon-ridge', query: 'What do homes in Falcon Ridge community Cibolo TX look like? Describe the established suburban homes with mature landscaping.' },
  { name: 'cs-bentwood-ranch', query: 'What do homes in Bentwood Ranch Cibolo TX look like? Describe the well-maintained suburban homes, mature trees.' },
  { name: 'cs-turning-stone', query: 'What do homes in Turning Stone community Cibolo TX look like? Describe the upscale suburban homes with contemporary finishes.' },
  { name: 'cs-cibolo-valley', query: 'What do homes in Cibolo Valley Ranch Cibolo TX look like? Describe the master-planned community homes, various sizes.' },
  // Bulverde
  { name: 'bv-indian-springs', query: 'What do homes in Estates at Indian Springs Bulverde TX look like? Describe the gated Hill Country homes with mature oaks on wide lots.' },
  { name: 'bv-bulverde-village', query: 'What do homes in Bulverde Village Bulverde TX look like? Describe the suburban Hill Country homes with oak-lined streets.' },
  { name: 'bv-hidden-trails', query: 'What do homes in Hidden Trails community Bulverde TX look like? Describe the master-planned community homes in Hill Country setting.' },
  { name: 'bv-johnson-ranch', query: 'What do homes in Johnson Ranch Bulverde TX look like? Describe the master-planned community homes with Hill Country views, oak trees.' },
  { name: 'bv-singing-hills', query: 'What do homes in Preserve at Singing Hills Bulverde TX look like? Describe the family homes amid rolling hills and greenery.' },
];

async function groundedResearch(query) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: query + ' Give me a concise 2-3 sentence visual description I can use as an image generation prompt. Focus on exterior appearance, materials, colors, landscaping.' }] }],
      tools: [{ google_search: {} }]
    })
  });
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map(p => p.text || '').join(' ').trim();
}

async function generateImage(prompt, outputName) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Generate a photorealistic image: ${prompt}` }] }],
      generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
    })
  });
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'));
  if (imagePart) {
    const buf = Buffer.from(imagePart.inlineData.data, 'base64');
    const outPath = path.join(OUTPUT_DIR, `${outputName}.png`);
    fs.writeFileSync(outPath, buf);
    console.log(`  Saved: ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
    return true;
  }
  console.error(`  ERROR: No image data for ${outputName}`, JSON.stringify(data).substring(0, 300));
  return false;
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let success = 0;
  let failed = 0;

  for (const hood of NEIGHBORHOODS) {
    // Skip if already generated
    if (fs.existsSync(path.join(OUTPUT_DIR, `${hood.name}.png`))) {
      console.log(`Skipping ${hood.name} (already exists)`);
      success++;
      continue;
    }

    console.log(`\nGenerating: ${hood.name}`);
    try {
      console.log('  Step 1: Grounded research...');
      const research = await groundedResearch(hood.query);
      console.log(`  Research: ${research.substring(0, 120)}...`);

      const prompt = `Photorealistic photograph of a beautiful home in a Texas residential neighborhood. ${research}. Professional real estate photography, warm natural lighting, clear blue sky, well-maintained front yard with landscaping, curb appeal view from the street. High resolution, 16:9 aspect ratio.`;

      console.log('  Step 2: Generating image...');
      const ok = await generateImage(prompt, hood.name);
      if (ok) success++;
      else failed++;
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
      failed++;
    }

    // Rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log(`\nDone! ${success} succeeded, ${failed} failed out of ${NEIGHBORHOODS.length} total.`);
}

main();
