import { expect, test } from '@playwright/test';

const intentCategories: Record<string, string[]> = {
  play: ['games'],
  use: ['tools'],
  learn: ['learning'],
  read: ['resources'],
  explore: ['visualizations', 'experiments'],
};

test('homepage exposes five visitor-intent discovery routes', async ({ page }) => {
  await page.goto('/');
  const discovery = page.locator('[data-intent-discovery]');
  await expect(discovery).toBeVisible();
  for (const intent of ['play', 'use', 'learn', 'read', 'explore']) {
    const label = intent[0]!.toUpperCase() + intent.slice(1);
    const link = discovery.locator(`[data-project-intent="${intent}"]`);
    await expect(link).toBeVisible();
    await expect(link.getByText(label, { exact: true })).toBeVisible();
    await expect(link).toHaveAttribute('href', `/projects/?intent=${intent}#archive-catalogue`);
  }
});

test('Projects intent links drive the archive URL and visible result set', async ({ page }) => {
  await page.goto('/projects/');
  const catalogueResponse = await page.request.get('/catalogue.json');
  expect(catalogueResponse.ok()).toBe(true);
  const catalogue = await catalogueResponse.json();
  const projects = catalogue.projects ?? catalogue;

  for (const intent of ['play', 'use', 'learn', 'read', 'explore']) {
    await page.goto(`/projects/?intent=${intent}#archive-catalogue`);
    await expect(page.locator(`[data-archive-intent="${intent}"]`)).toHaveAttribute('aria-pressed', 'true');
    const expected = projects.filter((project: { category: string }) => intentCategories[intent]!.includes(project.category));
    await expect(page.locator('[data-archive-result-count]')).toHaveText(String(expected.length).padStart(2, '0'));
    const visibleSlugs = await page.locator('[data-archive-grid] [data-archive-item]:not([hidden])').evaluateAll((items) => items.map((item) => (item as HTMLElement).dataset.slug).filter(Boolean).sort());
    expect(visibleSlugs).toEqual(expected.map((project: { slug: string }) => project.slug).sort());
  }
});

test('Explore combines visualizations and experiments without creating a new project category', async ({ page }) => {
  await page.goto('/projects/?intent=explore');
  await expect(page.getByRole('button', { name: 'Explore', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Visualizations', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Experiments', exact: true })).toHaveAttribute('aria-pressed', 'false');
  const categories = await page.locator('[data-archive-grid] [data-archive-item]:not([hidden]) .artifact-plate__category').allTextContents().catch(() => [] as string[]);
  if (categories.length) expect(categories.every((category) => /visualizations|experiments/i.test(category))).toBe(true);
});

test('choosing a canonical category clears visitor intent state', async ({ page }) => {
  await page.goto('/projects/?intent=play');
  await page.getByRole('button', { name: 'Tools', exact: true }).click();
  await expect(page).toHaveURL(/category=tools/);
  await expect(page).not.toHaveURL(/intent=/);
  await expect(page.getByRole('button', { name: 'Tools', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Everything', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('intent discovery reflows without page-level overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  for (const route of ['/', '/projects/?intent=explore']) {
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, route).toBeLessThanOrEqual(1);
  }
});
