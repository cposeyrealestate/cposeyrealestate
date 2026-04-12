export async function onRequestPost(context) {
  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await request.json();
    const { name, email, phone, source } = body;

    // Validate required fields
    if (!name || !email || !phone) {
      return new Response(
        JSON.stringify({ success: false, error: 'Name, email, and phone are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid email format.' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Build lead record
    const lead = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      source: source || 'website',
      registeredAt: new Date().toISOString(),
      userAgent: request.headers.get('User-Agent') || '',
    };

    // Store in Cloudflare KV if available
    if (env.LEADS) {
      await env.LEADS.put(lead.email, JSON.stringify(lead));
    }

    // Send notification email via webhook (optional — configure later)
    // You can add a Zapier/Make webhook URL here to forward leads
    if (env.LEAD_WEBHOOK_URL) {
      try {
        await fetch(env.LEAD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lead),
        });
      } catch (e) {
        // Don't fail the request if webhook fails
        console.error('Webhook error:', e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Registration successful.' }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ success: false, error: 'Server error. Please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
