export const prerender = false;

import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

/**
 * Google Search Console API proxy.
 *
 * Authenticates to Google using a service account JSON key (stored
 * as GOOGLE_SERVICE_ACCOUNT_JSON secret), gets an OAuth access token
 * via JWT Bearer exchange, and forwards the request to the GSC
 * searchAnalytics/query endpoint.
 *
 * JWT signing is done with the Web Crypto API (native to Cloudflare
 * Workers) — no external dependency.
 *
 * Docs: https://developers.google.com/webmaster-tools/v1/searchanalytics/query
 */

const GSC_BASE = 'https://www.googleapis.com/webmasters/v3';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
// Try URL-prefix property first; fall back to sc-domain:… if 403.
const SITE_CANDIDATES = [
  'https://cposeyrealestate.com/',
  'sc-domain:cposeyrealestate.com',
];

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

export const POST: APIRoute = async ({ request }) => {
  const saJsonRaw = (env as any).GOOGLE_SERVICE_ACCOUNT_JSON as string | undefined;

  if (!saJsonRaw) {
    console.error('[admin/gsc] Missing GOOGLE_SERVICE_ACCOUNT_JSON');
    return json({ error: 'Server not configured' }, 500);
  }

  let sa: ServiceAccount;
  try {
    sa = JSON.parse(saJsonRaw);
  } catch (err) {
    console.error('[admin/gsc] Service account JSON is not valid JSON', err);
    return json({ error: 'Server configuration error' }, 500);
  }

  let clientQuery: Record<string, any> = {};
  try {
    clientQuery = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  try {
    const accessToken = await getAccessToken(sa);

    // Try each site candidate until one succeeds (or they all fail).
    let lastErr: any = null;
    for (const site of SITE_CANDIDATES) {
      const encoded = encodeURIComponent(site);
      const url = `${GSC_BASE}/sites/${encoded}/searchAnalytics/query`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientQuery),
      });

      const text = await res.text();
      let data: any;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }

      if (res.ok) {
        return new Response(JSON.stringify({ ...data, _site: site }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      lastErr = { status: res.status, data, site };
      // Only keep trying on 403/404 — other errors are terminal.
      if (res.status !== 403 && res.status !== 404) break;
    }

    console.error('[admin/gsc] all site candidates failed', lastErr);
    return json(
      {
        error: 'GSC request failed',
        details: lastErr,
        hint: 'Make sure the service account email is added as a user on your Search Console property.',
      },
      502
    );
  } catch (err) {
    console.error('[admin/gsc] auth or fetch failed', err);
    return json({ error: 'GSC proxy error', details: String(err) }, 500);
  }
};

/**
 * Exchange a signed JWT for a short-lived OAuth access token.
 */
async function getAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';

  const header = { alg: 'RS256', typ: 'JWT' };
  const claims = {
    iss: sa.client_email,
    scope: SCOPE,
    aud: tokenUri,
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = toBase64Url(encoder.encode(JSON.stringify(header)));
  const claimsB64 = toBase64Url(encoder.encode(JSON.stringify(claims)));
  const signingInput = `${headerB64}.${claimsB64}`;

  const key = await importPkcs8(sa.private_key);
  const sig = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    encoder.encode(signingInput)
  );
  const jwt = `${signingInput}.${toBase64Url(new Uint8Array(sig))}`;

  const tokenRes = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  const tokenJson: any = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(
      `Token exchange failed: ${tokenRes.status} ${tokenJson.error || ''} ${
        tokenJson.error_description || ''
      }`.trim()
    );
  }
  return tokenJson.access_token as string;
}

async function importPkcs8(pem: string): Promise<CryptoKey> {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
