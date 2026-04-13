export const prerender = false;

import type { APIRoute } from 'astro';

const BOLDTRAIL_API_KEY = import.meta.env.BOLDTRAIL_API_KEY;
const BOLDTRAIL_URL = 'https://kvcore.com/api/leads';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { name, email, phone, address, message, source } = body;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Split name into first/last
    const nameParts = (name || '').trim().split(/\s+/);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Build the BoldTrail lead payload
    const leadData: Record<string, any> = {
      first_name: firstName,
      last_name: lastName,
      email: email,
      source: source || 'cposeyrealestate.com',
    };

    if (phone) leadData.phone = phone;
    if (message) leadData.notes = message;
    if (address) leadData.notes = (leadData.notes ? leadData.notes + '\n' : '') + 'Property: ' + address;

    // Send to BoldTrail
    const res = await fetch(BOLDTRAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${BOLDTRAIL_API_KEY}`,
      },
      body: JSON.stringify(leadData),
    });

    const responseText = await res.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    if (!res.ok) {
      console.error('BoldTrail API error:', res.status, responseText);
      return new Response(JSON.stringify({
        error: 'Failed to submit lead',
        status: res.status,
        details: responseData,
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Lead submission error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
