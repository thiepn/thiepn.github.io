import { expect, test } from '@playwright/test';

test('homepage exposes the compact portfolio hub hierarchy', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Projects, tools & experiments.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Selected projects' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'All projects' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Browse by interest' })).toBeVisible();
  await expect(page.locator('#featured .featured-card')).toHaveCount(5);
  await expect(page.locator('[data-project-directory] .project-directory__item')).toHaveCount(19);
});

test('featured work renders the selected project previews', async ({ page }) => {
  await page.goto('/');
  for (const slug of ['the-bible-challenge','pdf-studio','wordstrike','manuscript','voidcut']) {
    await expect(page.locator(`#featured [data-preview-slug="${slug}"]`)).toBeVisible();
  }
});

test('dedicated archive is catalogue-first and category anchored', async ({ page }) => {
  await page.goto('/projects/');
  await expect(page.getByRole('heading', { name: 'Project Archive' })).toBeVisible();
  await expect(page.getByText('03.1 / Catalogue')).toBeVisible();
  await expect(page.locator('.category-index').getByRole('link', { name: /Games/ })).toBeVisible();
});

test('artifact record renders overview and accession metadata', async ({ page }) => {
  await page.goto('/project/pdf-studio/');
  await expect(page.getByRole('heading', { name: 'PDF Studio' })).toBeVisible();
  await expect(page.getByText('01 / Overview')).toBeVisible();
  await expect(page.getByText('02 / Record')).toBeVisible();
  await expect(page.getByText('T-001', { exact: true }).first()).toBeVisible();
});

test('collection page has relationship map and anchor artifacts', async ({ page }) => {
  await page.goto('/collection/french-learning/');
  await expect(page.getByRole('heading', { name: 'French Learning' })).toBeVisible();
  await expect(page.getByText('01 / Relationships')).toBeVisible();
  await expect(page.getByText('02 / Anchor Artifacts')).toBeVisible();
});

test('phase 2 baseline remains free of page-level horizontal overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  for (const path of ['/', '/projects/', '/project/pdf-studio/', '/collections/', '/collection/browser-games/']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, path).toBe(false);
  }
});
