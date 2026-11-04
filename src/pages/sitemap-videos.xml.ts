import videos from '../data/watch-videos.json';
import { videoSitemap } from '../lib/video-sitemap.mjs';
export const prerender = true;
export function GET() { return new Response(videoSitemap(videos), { headers: { 'Content-Type':'application/xml; charset=utf-8' } }); }
