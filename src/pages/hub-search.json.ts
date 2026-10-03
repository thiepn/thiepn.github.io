import { getHubProjects } from '../lib/hub';
import { hubSearchPayload } from '../lib/hub-search';
export const prerender = true;
export async function GET() {
  return new Response(JSON.stringify(hubSearchPayload(await getHubProjects())), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
