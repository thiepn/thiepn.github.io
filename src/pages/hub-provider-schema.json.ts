import schema from '../../contracts/hub-provider-v1.schema.json';
export const prerender = true;
export function GET() { return new Response(JSON.stringify(schema), { headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300' } }); }
