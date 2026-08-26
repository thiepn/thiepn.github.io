import { expect, test } from '@playwright/test';

test('homepage exposes the Project Universe hierarchy', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'THIEPN', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Start with the flagship.', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What do you want to do?', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Long-form published works.', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'More to explore.', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Follow an interest.', level: 2 })).toBeVisible();
  await expect(page.locator('#featured article')).toHaveCount(5);
  await expect(page.locator('[data-project-intent]')).toHaveCount(5);
  await expect(page.locator('.project-strip__item')).toHaveCount(8);
});

test('featured work renders the selected project previews', async ({ page }) => {
  await page.goto('/');
  for (const slug of ['the-bible-challenge','pdf-studio','wordstrike','manuscript','voidcut']) {
    await expect(page.locator(`#featured [data-preview-slug="${slug}"]`)).toBeVisible();
  }
});

test('projects page is portfolio-first and category anchored', async ({ page }) => {
  await page.goto('/projects/');
  await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Find a project', level: 2 })).toBeVisible();
  await expect(page.locator('.category-index').getByRole('link', { name: /Games/ })).toBeVisible();
});

test('project page renders about and project details', async ({ page }) => {
  await page.goto('/project/pdf-studio/');
  await expect(page.getByRole('heading', { name: 'PDF Studio' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'About this project' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Project details' })).toBeVisible();
  await expect(page.getByText('T-001', { exact: true }).first()).toBeVisible();
});

test('collection page uses project-oriented relationship language', async ({ page }) => {
  await page.goto('/collection/french-learning/');
  await expect(page.getByRole('heading', { name: 'French Learning' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'How the projects relate' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Featured projects' })).toBeVisible();
});

test('phase 2 baseline remains free of page-level horizontal overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  for (const path of ['/', '/projects/', '/project/pdf-studio/', '/collections/', '/collection/browser-games/']) {
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow, path).toBe(false);
  }
});
