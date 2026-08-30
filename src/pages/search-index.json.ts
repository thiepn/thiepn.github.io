import { getCollection } from 'astro:content';
import searchIndex from '../generated/search-index.json';

export const prerender = true;

export async function GET() {
  const books = (await getCollection('books'))
    .sort((a, b) => b.data.lastUpdated.getTime() - a.data.lastUpdated.getTime())
    .map(({ data }) => ({
      kind: 'book' as const,
      slug: data.slug,
      title: data.title,
      subtitle: data.subtitle,
      summary: data.summary,
      subjects: data.subjects,
      version: data.version,
      libraryUrl: data.libraryUrl,
      lastUpdated: data.lastUpdated.toISOString().slice(0, 10),
    }));

  Object.assign(searchIndex, { books });

  return new Response(JSON.stringify(searchIndex), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
