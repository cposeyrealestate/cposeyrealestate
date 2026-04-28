export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

/**
 * Lead submission endpoint.
 *
 * Posts leads to the BoldTrail / kvCORE vendor API using a JWT Bearer
 * token. The token is issued from BoldTrail admin → Lead Engine →
 * "My API Tokens" with either "All" or "Contacts" scope (Contacts is
 * the minimum required to create leads).
 *
 * On failure, the full lead payload is logged to the Cloudflare Worker
 * console so leads are never silently lost — you can inspect failed
 * submissions under Workers & Pages → your worker → Logs.
 */

// Endpoint can be overridden by env var if BoldTrail ever changes paths.
const BOLDTRAIL_API_URL =
  (import.meta.env.BOLDTRAIL_API_URL as string | undefined) ||
  'https://api.kvcore.com/v2/public/contact';

// kvCORE classifies contacts as "buyer" or "seller". Forms whose source
// indicates the lead is selling go to seller; everything else is buyer.
function dealTypeForSource(source: string | undefined): 'buyer' | 'seller' {
  if (!source) return 'buyer';
  const s = source.toLowerCase();
  if (
    s.includes('valuation') ||
    s.includes('seller') ||
    s.includes('net sheet') ||
    s.includes('home value')
  ) {
    return 'seller';
  }
  return 'buyer';
}

// Best-effort parse of "123 Main St, New Braunfels, TX 78130" into
// kvCORE's primary_address / primary_city / primary_state / primary_zip.
// Falls back gracefully when the user types a freeform address.
function parseAddress(addr: string): {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
} {
  const parts = addr
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { street: parts[0] };

  const last = parts[parts.length - 1];
  const stateZip = last.match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  const zipOnly = last.match(/^(\d{5}(?:-\d{4})?)$/);
  const stateOnly = last.match(/^([A-Za-z]{2})$/);

  let state: string | undefined;
  let zip: string | undefined;
  let city: string | undefined;
  let street: string | undefined;

  if (stateZip) {
    state = stateZip[1].toUpperCase();
    zip = stateZip[2];
    if (parts.length >= 3) {
      city = parts[parts.length - 2];
      street = parts.slice(0, -2).join(', ');
    } else {
      street = parts[0];
    }
  } else if (zipOnly) {
    zip = zipOnly[1];
    if (parts.length >= 3) {
      city = parts[parts.length - 2];
      street = parts.slice(0, -2).join(', ');
    } else {
      street = parts[0];
    }
  } else if (stateOnly) {
    state = stateOnly[1].toUpperCase();
    if (parts.length >= 3) {
      city = parts[parts.length - 2];
      street = parts.slice(0, -2).join(', ');
    } else {
      street = parts[0];
    }
  } else {
    city = last;
    street = parts.slice(0, -1).join(', ');
  }

  return { street, city, state, zip };
}

export const POST: APIRoute = async ({ request }) => {
  const apiKey = (env as any).BOLDTRAIL_API_KEY as string | undefined;

  let leadData: Record<string, any> = {};

  try {
    const body = await request.json();
    const { name, firstName, lastName, email, phone, address, message, source } = body;

    if (!email) {
      return json({ error: 'Email is required' }, 400);
    }

    // Prefer explicit firstName/lastName, otherwise split the single name field.
    let first = firstName || '';
    let last = lastName || '';
    if (!first && !last && name) {
      const parts = String(name).trim().split(/\s+/);
      first = parts[0] || '';
      last = parts.slice(1).join(' ') || '';
    }

    const finalSource = source || 'cposeyrealestate.com';

    // Compose the contact payload using kvCORE/BoldTrail field names.
    leadData = {
      first_name: first,
      last_name: last,
      email,
      source: finalSource,
      deal_type: dealTypeForSource(finalSource),
    };

    // kvCORE expects cell_phone_1, not "phone".
    if (phone) leadData.cell_phone_1 = String(phone).trim();

    // Map address into structured primary_* fields when possible.
    if (address) {
      const parsed = parseAddress(String(address));
      leadData.primary_address = parsed.street || String(address);
      if (parsed.city) leadData.primary_city = parsed.city;
      if (parsed.state) leadData.primary_state = parsed.state;
      if (parsed.zip) leadData.primary_zip = parsed.zip;
    }

    // Also keep a human-readable note so the agent sees full context.
    const notes: string[] = [];
    if (message) notes.push(String(message));
    if (address) notes.push(`Property: ${address}`);
    if (notes.length) leadData.message = notes.join('\n');

    if (!apiKey) {
      console.error('[lead] Missing BOLDTRAIL_API_KEY — leaving lead in logs', leadData);
      return json({ error: 'Server configuration error' }, 500);
    }

    const res = await fetch(BOLDTRAIL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(leadData),
    });

    const responseText = await res.text();
    let responseData: unknown;
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch {
      responseData = { raw: responseText };
    }

    if (!res.ok) {
      // Log the lead AND the BoldTrail response so nothing is lost.
      console.error('[lead] BoldTrail rejected submission', {
        status: res.status,
        endpoint: BOLDTRAIL_API_URL,
        response: responseData,
        lead: leadData,
      });
      return json(
        {
          error: 'Failed to submit lead',
          status: res.status,
          details: responseData,
        },
        502
      );
    }

    console.log('[lead] BoldTrail accepted submission', {
      email,
      source: leadData.source,
      deal_type: leadData.deal_type,
    });
    return json({ success: true, data: responseData }, 200);
  } catch (err) {
    // Always log the lead payload even on unexpected errors.
    console.error('[lead] Unhandled error', { error: err, lead: leadData });
    return json({ error: 'Internal server error' }, 500);
  }
};

function json(data: unknown, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
