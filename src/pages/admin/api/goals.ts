export const prerender = false;
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

// Read goal configuration using the existing server-side Stats API credential.
// Cloudflare Access protects this route with the rest of /admin.
export const GET: APIRoute = async () => {
  const key = (env as any).PLAUSIBLE_API_KEY as string | undefined;
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' };
  if (!key) return new Response(JSON.stringify({ error: 'Analytics not configured' }), { status: 503, headers });
  try {
    const goals: unknown[] = [];
    let after: string | null = null;
    for (let page = 0; page < 10; page++) {
      const url = new URL('https://plausible.io/api/v1/sites/goals');
      url.searchParams.set('site_id', 'cposeyrealestate.com');
      url.searchParams.set('limit', '100');
      if (after) url.searchParams.set('after', after);
      const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) return new Response(JSON.stringify({ error: 'Goal configuration unavailable' }), { status: 502, headers });
      const data = await response.json() as any;
      if (!Array.isArray(data.goals)) throw new Error('Invalid goal response');
      goals.push(...data.goals.map((goal: any) => ({ event_name: goal.event_name, display_name: goal.display_name, custom_props: goal.custom_props || {} })));
      after = data.meta?.after || null;
      if (!after) return new Response(JSON.stringify({ goals }), { headers });
    }
    return new Response(JSON.stringify({ error: 'Goal configuration exceeds report limit' }), { status: 502, headers });
  } catch {
    return new Response(JSON.stringify({ error: 'Goal configuration unavailable' }), { status: 502, headers });
  }
};
