import type { APIRoute } from 'astro';
import registry from '../data/products-v2.json';

export const GET = (() =>
  new Response(JSON.stringify(registry, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  })) satisfies APIRoute;
