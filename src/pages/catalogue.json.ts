import type { APIRoute } from 'astro';
import catalogue from '../generated/catalogue-public.json';

export const GET = (() => new Response(JSON.stringify(catalogue, null, 2), {
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
  },
})) satisfies APIRoute;
