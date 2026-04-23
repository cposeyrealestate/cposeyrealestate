export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

/**
 * Plausible Stats API proxy.
 *
 * Accepts a JSON body matching the Plausible v2 Query API schema and
 * forwards it to plausible.io with the server-side API key. The
 * site_id is injected server-side so the client doesn't need to
 * include it (and can't spoof it).
 *
 * Docs: https://plausible.io/docs/stats-api
 */

const PLAUSIBLE_API_URL = 'https://plausible.io/api/v2/query';
const SITE_ID = 'cposeyrealestate.com';

export const POST: APIRoute = async ({ request }) => {
  const apiKey = (env as any).PLAUSIBLE_API_KEY as string | undefined;

  if (!apiKey) {
    console.error('[admin/plausible] Missing PLAUSIBLE_API_KEY');
    return json({ error: 'Server not configured' }, 500);
  }

  let clientQuery: Record<string, any> = {};
  try {
    clientQuery = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  // Always force site_id server-side.
  const body = { ...clientQuery, site_id: SITE_ID };

  try {
    const res = await fetch(PLAUSIBLE_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      console.error('[admin/plausible] upstream error', { status: res.status, data });
    }

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[admin/plausible] fetch failed', err);
    return json({ error: 'Upstream fetch failed', details: String(err) }, 502);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
