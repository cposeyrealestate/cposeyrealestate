import fs from 'fs';

const API_KEY = 'AIzaSyCZyedNXc7fZXALTDbumK-oA12e_oJzRZg';

const NEIGHBORHOODS = {
  'new-braunfels': [
    'River Chase, New Braunfels TX',
    'Vintage Oaks, New Braunfels TX',
    'Copper Ridge, New Braunfels TX',
    'Manor Creek, New Braunfels TX',
    'Veramendi, New Braunfels TX',
    'Mayfair, New Braunfels TX (SouthStar Communities)',
    'Gruene Historic District, New Braunfels TX',
  ],
  'canyon-lake': [
    'Canyon Lake Hills, Canyon Lake TX',
    'Mystic Shores, Canyon Lake TX',
    'Oak Shores Estates, Canyon Lake TX',
    'Holiday Estates, Canyon Lake TX',
    'Hancock Park, Canyon Lake TX',
    'River Mountain Ranch, Canyon Lake TX',
  ],
  'seguin': [
    'Nob Hill neighborhood, Seguin TX',
    'Village of Mill Creek, Seguin TX',
    'Cordova Crossing, Seguin TX',
    'Downtown Seguin TX historic district',
    'Country Club Estates, Seguin TX',
    'River Oaks neighborhood, Seguin TX',
  ],
  'cibolo-schertz': [
    'Saddle Creek Ranch, Cibolo TX',
    'Falcon Ridge, Cibolo TX',
    'Bentwood Ranch, Cibolo TX',
    'Turning Stone, Cibolo TX',
    'Cibolo Valley Ranch, Cibolo TX',
    'Verde Ranch, Schertz TX',
  ],
  'bulverde': [
    'Estates at Indian Springs, Bulverde TX',
    'Bulverde Village, Bulverde TX',
    'Hidden Trails, Bulverde TX',
    'Johnson Ranch, Bulverde TX',
    'Singing Hills, Bulverde TX',
  ],
};

async function research(query) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `Tell me about the ${query} residential neighborhood/community. Give me: 1) A 3-4 sentence description of what it's like to live there — the vibe, amenities, home styles, lot sizes, and what makes it unique. 2) The typical architectural style and exterior materials of homes (stone, brick, stucco, etc). 3) Price range. 4) Year built range. Be factual and specific. Do not make anything up.` }] }],
      tools: [{ google_search: {} }]
    })
  });
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map(p => p.text || '').join(' ').trim();
}

async function main() {
  const results = {};

  for (const [area, hoods] of Object.entries(NEIGHBORHOODS)) {
    console.log(`\n=== ${area.toUpperCase()} ===`);
    results[area] = {};

    for (const hood of hoods) {
      console.log(`  Researching: ${hood}`);
      try {
        const info = await research(hood);
        results[area][hood] = info;
        console.log(`    OK (${info.length} chars)`);
      } catch (err) {
        console.error(`    ERROR: ${err.message}`);
        results[area][hood] = '';
      }
    }
  }

  fs.writeFileSync('neighborhood-research.json', JSON.stringify(results, null, 2));
  console.log('\nSaved to neighborhood-research.json');
}

main();
