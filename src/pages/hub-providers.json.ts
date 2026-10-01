import registry from '../data/hub-providers.json';
export const prerender = true;
export function GET() { return new Response(JSON.stringify(registry), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' } }); }
