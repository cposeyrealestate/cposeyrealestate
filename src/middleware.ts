import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (/^\/(?:admin|api)(?:\/|$)/.test(context.url.pathname)) {
    headers.set('Cache-Control', 'private, no-store');
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});
