import configuration from '../data/reading-pilot.json';
export const prerender = true;
export function GET() {
  return new Response(JSON.stringify(configuration), {headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
}
