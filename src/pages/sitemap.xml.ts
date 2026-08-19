import type { APIRoute } from 'astro';
import manifest from '../generated/route-manifest.json';
import { SITE } from '../data/site';

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export const GET = (() => {
  const urls = manifest.routes
    .filter((route) => !route.startsWith('/dev/') && !route.endsWith('.json'))
    .map((route) => `  <url><loc>${escapeXml(new URL(route, SITE.url).href)}</loc></url>`)
    .join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}) satisfies APIRoute;
