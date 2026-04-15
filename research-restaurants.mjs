import fs from 'fs';

const API_KEY = 'AIzaSyCZyedNXc7fZXALTDbumK-oA12e_oJzRZg';

const RESTAURANTS = {
  'new-braunfels': [
    "Cooper's Old Time Pit Bar-B-Que, New Braunfels TX",
    "Black's Barbecue, New Braunfels TX",
    "Granzin Bar-B-Q, New Braunfels TX",
    "Adobe Cafe, New Braunfels TX",
    "Las Fontanas, New Braunfels TX (Mexican restaurant)",
    "La Cosecha or La Conseca, New Braunfels TX (Mexican restaurant - find the correct name and spelling)",
    "Alpine Haus Restaurant, New Braunfels TX",
    "Krause's Cafe, New Braunfels TX",
    "Faust Brewing Company, New Braunfels TX",
    "New Braunfels Brewing Company, New Braunfels TX",
    "Huisache Grill, New Braunfels TX",
    "McAdoo's Seafood Company, New Braunfels TX",
    "Myron's Prime Steakhouse, New Braunfels TX",
    "Gristmill River Restaurant & Bar, New Braunfels TX",
    "Gruene River Grill, New Braunfels TX",
  ],
  'canyon-lake': [
    "Gennaro's Trattoria, Canyon Lake TX",
    "Wildflour Artisan Bakery & Grill, Canyon Lake TX",
    "Baja Icehouse and Grill, Canyon Lake TX",
    "The Last Shot Bar & Grill, Canyon Lake TX",
    "Canyon Lake Smokehouse, Canyon Lake TX",
  ],
  'seguin': [
    "Burnt Bean Co., Seguin TX",
    "Seguin Brewing Company, Seguin TX",
    "The Oak Tavern, Seguin TX",
    "Juan Seguin Brewing Co., Seguin TX",
    "Court Street Coffee, Seguin TX",
  ],
  'cibolo-schertz': [
    "Main Street Social, Cibolo TX or Schertz TX",
    "Sauced Wings & Bar, Cibolo TX or Schertz TX",
    "Nacho Daddy, Cibolo TX or Schertz TX",
    "Thai Lao Cuisine, Cibolo TX or Schertz TX",
    "Wild Wings N' Things, Cibolo TX or Schertz TX",
  ],
  'bulverde': [
    "Screaming Goat Yard & Tap, Bulverde TX",
    "Branch Neighborhood Grill, Bulverde TX",
    "Richter's Antler Cafe, Bulverde TX",
    "Smokey Mo's BBQ, Bulverde TX",
  ],
};

async function research(query) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `What is the exact street address of ${query}? I need: 1) The full street address including city, state, zip code. 2) A one-sentence description of what type of food they serve. Be factual only — do not guess. If this restaurant does not exist or you cannot find it, say "NOT FOUND".` }] }],
      tools: [{ google_search: {} }]
    })
  });
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  return parts.map(p => p.text || '').join(' ').trim();
}

async function main() {
  const results = {};

  for (const [area, restaurants] of Object.entries(RESTAURANTS)) {
    console.log(`\n=== ${area.toUpperCase()} ===`);
    results[area] = {};

    for (const restaurant of restaurants) {
      console.log(`  Researching: ${restaurant}`);
      try {
        const info = await research(restaurant);
        results[area][restaurant] = info;
        console.log(`    ${info.substring(0, 120)}`);
      } catch (err) {
        console.error(`    ERROR: ${err.message}`);
        results[area][restaurant] = '';
      }
    }
  }

  fs.writeFileSync('restaurant-research.json', JSON.stringify(results, null, 2));
  console.log('\nSaved to restaurant-research.json');
}

main();
