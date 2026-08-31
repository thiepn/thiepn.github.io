import { expect, test } from '@playwright/test';

const representativeCards = [
  '/og/index.svg',
  '/og/projects.svg',
  '/og/books.svg',
  '/og/collections.svg',
  '/og/collection-browser-games.svg',
  '/og/pdf-studio.svg',
];

test('social-card sources use the current portfolio identity', async ({ request }) => {
  for (const path of representativeCards) {
    const response = await request.get(path);
    expect(response.ok(), path).toBeTruthy();
    expect(response.headers()['content-type'], path).toContain('image/svg+xml');
    const svg = await response.text();
    expect(svg, path).toContain('THIEPN / PORTFOLIO');
    expect(svg, path).not.toContain('PROJECT UNIVERSE');
  }

  const home = await (await request.get('/og/index.svg')).text();
  expect(home).toContain('Software, games, learning systems, books and experiments');
});
