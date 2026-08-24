import { expect, test } from '@playwright/test';

test('Projects exposes categories and collections as distinct browse models', async ({ page }) => {
  await page.goto('/projects/');
  const model = page.locator('[data-portfolio-browse-model]');
  await expect(model).toBeVisible();
  await expect(model.getByText('Project type', { exact: true })).toBeVisible();
  await expect(model.getByText('Editorial themes', { exact: true })).toBeVisible();
  await expect(model.getByText(/exactly one category/i)).toBeVisible();
  await expect(model.getByText(/several collections/i)).toBeVisible();
  await expect(model.getByRole('link', { name: /02 \/ Collections/ })).toHaveAttribute('href', '/collections/');
});

test('Collections reciprocates the portfolio browse hierarchy without inventing another taxonomy', async ({ page }) => {
  await page.goto('/collections/');
  const model = page.locator('[data-portfolio-browse-model]');
  await expect(model).toBeVisible();
  await expect(model.getByRole('link', { name: /01 \/ Categories/ })).toHaveAttribute('href', '/projects/#category-title');
  await expect(model.getByRole('link', { name: /02 \/ Collections/ })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('[data-collection-index-item]')).toHaveCount(5);
  await expect(page.getByText(/one project can belong to several collections/i)).toBeVisible();
});

test('project records expose one category and their editorial collection memberships', async ({ page }) => {
  await page.goto('/project/pdf-studio/');
  const classification = page.locator('[data-portfolio-classification]');
  await expect(classification).toBeVisible();
  await expect(classification.getByRole('heading', { name: 'Classification', level: 2 })).toBeVisible();
  await expect(classification.locator('[data-project-category="tools"]')).toBeVisible();
  await expect(classification.getByRole('link', { name: /Tools/ })).toHaveAttribute('href', '/projects/?category=tools');
  await expect(classification.getByRole('link', { name: /Productivity & Creation/ })).toHaveAttribute('href', '/collection/productivity-creation/');
  await expect(page.getByRole('navigation', { name: 'On this project' }).getByRole('link', { name: /Classification/ })).toHaveAttribute('href', '#classification');
});

test('collection records preserve project categories and expose category composition', async ({ page }) => {
  await page.goto('/collection/productivity-creation/');
  const position = page.locator('[data-collection-classification]');
  await expect(position).toBeVisible();
  await expect(position.getByRole('heading', { name: 'Collection, not category', level: 2 })).toBeVisible();
  await expect(position.getByText(/membership does not replace a project's category/i)).toBeVisible();
  const categoryLinks = position.getByRole('navigation', { name: /Project categories represented/ }).getByRole('link');
  expect(await categoryLinks.count()).toBeGreaterThan(0);
  for (let index = 0; index < await categoryLinks.count(); index += 1) {
    await expect(categoryLinks.nth(index)).toHaveAttribute('href', /\/projects\/\?category=/);
  }
  await expect(page.getByRole('navigation', { name: 'On this collection' }).getByRole('link', { name: /Position/ })).toHaveAttribute('href', '#position');
});

test('portfolio hierarchy remains direct-navigation usable without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto('/project/pdf-studio/');
  await expect(page.locator('[data-portfolio-classification]')).toBeVisible();
  await expect(page.getByRole('link', { name: /Productivity & Creation/ })).toHaveAttribute('href', '/collection/productivity-creation/');
  await page.goto('/collections/');
  await expect(page.locator('[data-collection-index-item]').first().getByRole('link')).toBeVisible();
  await context.close();
});

test('P5 browse and classification structures reflow without horizontal overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  for (const route of ['/projects/', '/collections/', '/project/pdf-studio/', '/collection/productivity-creation/']) {
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, route).toBeLessThanOrEqual(1);
    await expect(page.getByRole('main')).toBeVisible();
  }
});
