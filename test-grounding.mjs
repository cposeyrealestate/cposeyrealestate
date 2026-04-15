import fs from 'fs';
const API_KEY = 'AIzaSyCZyedNXc7fZXALTDbumK-oA12e_oJzRZg';

async function test() {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: "Generate a photorealistic image of the Guadalupe River near New Braunfels, Texas. Use Google Search to ground your understanding of what this actual river looks like. The Guadalupe River has clear emerald-green water flowing over limestone, lined with enormous bald cypress trees with exposed root systems, white limestone riverbanks and bluffs. Show a summer scene with natural beauty, professional landscape photography quality."
        }]
      }],
      tools: [{ google_search: {} }],
      generationConfig: {
        responseModalities: ["IMAGE", "TEXT"]
      }
    })
  });
  
  const data = await res.json();
  if (data.error) {
    console.log('ERROR:', JSON.stringify(data.error, null, 2));
    return;
  }
  
  const parts = data.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) {
      const buf = Buffer.from(part.inlineData.data, 'base64');
      fs.writeFileSync('./public/images/generated/test-guadalupe.png', buf);
      console.log('GOT IMAGE:', part.inlineData.mimeType, (buf.length/1024).toFixed(0) + ' KB');
    } else if (part.text) {
      console.log('TEXT:', part.text.slice(0, 300));
    }
  }
  
  const grounding = data.candidates?.[0]?.groundingMetadata;
  if (grounding) {
    console.log('GROUNDING USED:', Object.keys(grounding));
  }
}

test();
