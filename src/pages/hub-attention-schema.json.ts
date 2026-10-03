import schema from '../../contracts/hub-attention-v1.schema.json';
export const prerender = true;
export function GET() { return new Response(JSON.stringify(schema), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300' } }); }
