import configuration from '../data/hub-account.json';
export const prerender = true;
export function GET() { return new Response(JSON.stringify(configuration),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=0, must-revalidate'}}); }
