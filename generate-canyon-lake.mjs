import fs from 'fs';

const API_KEY = 'AIzaSyCZyedNXc7fZXALTDbumK-oA12e_oJzRZg';

async function generateImage(prompt) {
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
    fs.writeFileSync('public/images/generated/canyon-lake-water.png', buf);
    console.log(`Saved: canyon-lake-water.png (${(buf.length / 1024).toFixed(0)} KB)`);
  } else {
    console.error('ERROR:', JSON.stringify(data).substring(0, 300));
  }
}

const prompt = `High-altitude aerial photograph of Canyon Lake reservoir in Comal County, Texas, shot from the south looking north from several thousand feet up. In the bottom foreground is the Canyon Lake dam — a long earth-fill embankment dam with a gently sloping grass-covered downstream face, NOT concrete. To the left of the dam is a large white exposed limestone spillway and outlet works area. Beyond the dam, the massive 8,230-acre reservoir of deep teal-blue-green water stretches wide and far into the distance, filling most of the frame. The lake is mostly wide open water with very few islands — the water is largely uninterrupted. The shoreline along the edges has some coves and inlets but the main body of the lake is clear open water. Small residential neighborhoods, houses, and winding roads are scattered along the far shores. The surrounding terrain is green rolling Texas Hill Country covered in live oak and cedar trees. Clear bright sunny day with blue sky. Photorealistic aerial photography matching a real helicopter flyover photo.`;

console.log('Generating exact Canyon Lake aerial...');
console.log('Prompt:', prompt.substring(0, 150) + '...');
generateImage(prompt).then(() => console.log('Done!'));
