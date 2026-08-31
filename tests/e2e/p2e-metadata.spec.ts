import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

async function jsonLd(page: Page) {
  const text = await page.locator('script[type="application/ld+json"]').textContent();
  expect(text).toBeTruthy();
  return JSON.parse(text ?? '{}') as { '@context'?: string; '@graph'?: Array<Record<string, unknown>> };
}

function graphType(data: { '@graph'?: Array<Record<string, unknown>> }, type: string) {
  return data['@graph']?.find((node) => node['@type'] === type);
}

async function expectPng(request: APIRequestContext, path: string) {
  const response = await request.get(path);
  expect(response.ok(), path).toBeTruthy();
  expect(response.headers()['content-type']).toContain('image/png');
  const body = await response.body();
  expect(body.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(body.readUInt32BE(16)).toBe(1200);
  expect(body.readUInt32BE(20)).toBe(630);
}

test('homepage exposes current portfolio metadata and WebSite JSON-LD', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/index\.png$/);
  await expect(page.locator('meta[property="og:image:type"]')).toHaveAttribute('content', 'image/png');
  await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
  await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute('content', '630');
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute('content', /THIEPN/i);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute('content', /\/og\/index\.png$/);

  const data = await jsonLd(page);
  expect(data['@context']).toBe('https://schema.org');
  const website = graphType(data, 'WebSite');
  expect(website?.url).toBe('https://thiepn.dev/');
  expect(website?.name).toBe('THIEPN');
  expect(String(website?.description ?? '')).toContain('software');
  expect(String(website?.description ?? '')).toContain('books');
  expect(website?.sameAs).toEqual(['https://github.com/thiepn']);
  expect(website).not.toHaveProperty('alternateName');
  expect(website).not.toHaveProperty('potentialAction');
  await expectPng(request, '/og/index.png');
});

test('install and crawler metadata use the current portfolio identity', async ({ request }) => {
  const manifestResponse = await request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json() as { name?: string; short_name?: string; description?: string };
  expect(manifest.name).toBe('THIEPN Portfolio');
  expect(manifest.short_name).toBe('THIEPN');
  expect(manifest.description).toContain('books');
  expect(manifest.name).not.toContain('Project Universe');

  const robotsResponse = await request.get('/robots.txt');
  expect(robotsResponse.ok()).toBeTruthy();
  const robots = await robotsResponse.text();
  expect(robots).toContain('Allow: /');
  expect(robots).toContain('Disallow: /dev/');
  expect(robots).toContain('Sitemap: https://thiepn.dev/sitemap.xml');
});

test('project pages expose canonical project structured data', async ({ page, request }) => {
  await page.goto('/project/pdf-studio/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/pdf-studio\.png$/);
  const data = await jsonLd(page);
  const app = graphType(data, 'SoftwareApplication');
  expect(app?.name).toBe('PDF Studio');
  expect(app?.url).toBe('https://thiepn.dev/project/pdf-studio/');
  expect(String(app?.codeRepository ?? '')).toMatch(/^https:\/\/github\.com\//);
  expect(app?.mainEntityOfPage).toEqual({ '@id': 'https://thiepn.dev/project/pdf-studio/#webpage' });
  await expectPng(request, '/og/pdf-studio.png');
});

test('game projects use VideoGame schema rather than generic software schema', async ({ page }) => {
  await page.goto('/project/the-bible-challenge/');
  const data = await jsonLd(page);
  const game = graphType(data, 'VideoGame');
  expect(game?.name).toBe('The Bible Challenge');
  expect(Array.isArray(game?.gamePlatform)).toBeTruthy();
});

test('projects catalogue exposes an ItemList derived from public project data', async ({ page }) => {
  await page.goto('/projects/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/projects\.png$/);
  const data = await jsonLd(page);
  const list = graphType(data, 'ItemList');
  expect(Number(list?.numberOfItems)).toBeGreaterThan(0);
  const items = list?.itemListElement as Array<Record<string, unknown>>;
  expect(items.length).toBe(list?.numberOfItems);
  expect(String(items[0]?.url ?? '')).toMatch(/^https:\/\/thiepn\.dev\/project\//);
});

test('books catalogue exposes Book entities owned by their Library URLs', async ({ page, request }) => {
  await page.goto('/books/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/og\/books\.png$/);
  const data = await jsonLd(page);
  const list = graphType(data, 'ItemList');
  expect(Number(list?.numberOfItems)).toBeGreaterThan(0);
  const books = data['@graph']?.filter((node) => node['@type'] === 'Book') ?? [];
  expect(books.length).toBe(list?.numberOfItems);
  for (const book of books) {
    expect(String(book.url ?? '')).toMatch(/^https:\/\/thiepn\.dev\/library\//);
    expect(String(book.image ?? '')).toMatch(/^https:\/\//);
    expect(book.datePublished).toBeTruthy();
    expect(book.dateModified).toBeTruthy();
  }
  await expectPng(request, '/og/books.png');
});
