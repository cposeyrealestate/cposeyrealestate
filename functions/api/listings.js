// Cloudflare Pages Function — Serves listing data
// Data is refreshed every 4 hours via GitHub Actions cron

export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=900, s-maxage=3600',
  };

  try {
    // Fetch the static JSON file that's deployed with the site
    const url = new URL('/data/idx-map-listings.json', context.request.url);
    const res = await fetch(url.toString());

    if (!res.ok) {
      throw new Error(`Failed to load listings data: ${res.status}`);
    }

    const data = await res.text();
    return new Response(data, { headers: corsHeaders });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to load listings', message: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
