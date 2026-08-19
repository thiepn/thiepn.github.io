import { test, expect } from '@playwright/test';
import fs from 'node:fs';

interface PublicProject { code: string; slug: string; title: string; route: string; liveUrl: string; }
const catalogue = JSON.parse(fs.readFileSync('src/generated/catalogue-public.json','utf8')) as { projects: PublicProject[] };
const projects = catalogue.projects;

test.describe('Phase 14 / release candidate', () => {
  test('every public project is searchable by exact title and resolves to its record', async ({ page }) => {
    await page.goto('/');
    for (const project of projects) {
      await page.locator('[data-catalogue-search-open]').first().click();
      const dialog = page.locator('[data-catalogue-search-dialog]');
      await expect(dialog).toBeVisible();
      const input = page.locator('[data-catalogue-search-input]');
      await input.fill(project.title);
      const first = page.locator('[data-search-result]').first();
      await expect(first).toContainText(project.code);
      await expect(first).toContainText(project.title);
      await page.locator('[data-catalogue-search-close]').click();
    }
  });

  test('every listed record exposes its canonical live launch destination', async ({ page }) => {
    for (const project of projects) {
      await page.goto(project.route);
      const launch = page.locator(`a[href="${project.liveUrl}"]`).first();
      await expect(launch, `${project.code} launch link`).toBeVisible();
      await expect(launch).toHaveAttribute('href', project.liveUrl);
    }
  });

  test('archive URL state and scroll context survive detail navigation and Back', async ({ page }) => {
    await page.goto('/projects/?category=games&q=word&sort=az&view=list');
    const query = page.locator('[data-archive-query]');
    await expect(query).toHaveValue('word');
    await expect(page.locator('[data-archive-view="list"]')).toHaveAttribute('aria-pressed','true');
    const visibleRecord = page.locator('[data-archive-list] a[href^="/project/"]:visible').first();
    await expect(visibleRecord).toBeVisible();
    await visibleRecord.click();
    await expect(page).toHaveURL(/\/project\//);
    await page.goBack();
    await expect(page).toHaveURL(/category=games/);
    await expect(query).toHaveValue('word');
    await expect(page.locator('[data-archive-view="list"]')).toHaveAttribute('aria-pressed','true');
  });

  test('theme preference persists across routes', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-theme-option="dark"]').first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await page.goto('/projects/');
    await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
    await expect(page.locator('[data-theme-option="dark"]').first()).toHaveAttribute('aria-pressed','true');
  });

  test('search index failure degrades to an explicit unavailable state without breaking navigation', async ({ page }) => {
    await page.route('**/search-index.json', (route) => route.abort('failed'));
    await page.goto('/');
    await page.locator('[data-catalogue-search-open]').first().click();
    await expect(page.locator('[data-catalogue-search-status]')).toContainText('Catalogue index unavailable');
    await page.locator('[data-catalogue-search-close]').click();
    await expect(page.getByRole('link', { name: /Projects/i }).first()).toBeVisible();
  });

  test('preview media failure returns to the static project aperture', async ({ page }) => {
    await page.goto('/project/wordstrike/');
    const preview = page.locator('[data-preview-root]').first();
    await expect(preview).toBeVisible();
    await page.waitForTimeout(1100);
    const video = preview.locator('[data-preview-video]');
    if (await video.count()) {
      await video.dispatchEvent('error');
      await expect(preview).toHaveAttribute('data-preview-state','unavailable');
      await expect(preview.locator('.aperture').first()).toBeVisible();
    }
  });

  test('404 preserves useful release navigation', async ({ page }) => {
    await page.goto('/404.html');
    await expect(page.getByRole('heading', { name: /This artifact does not exist/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Return to index/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Project archive/i })).toBeVisible();
  });

  test('no-JS public catalogue remains complete and launchable', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto('/projects/');
    await expect(page.locator('[data-archive-grid] [data-archive-item]')).toHaveCount(projects.length);
    await expect(page.locator('noscript')).toHaveCount(1);
    const firstProject = projects[0];
    expect(firstProject).toBeDefined();
    if (!firstProject) throw new Error('Phase 14 catalogue fixture must contain at least one public project.');
    await expect(page.locator(`a[href="${firstProject.route}"]`).first()).toBeVisible();
    await context.close();
  });

  test('mobile RC shell has no horizontal overflow and keeps menu/search routes reachable @mobile-cert', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.locator('[data-mobile-menu-open]').click();
    const dialog = page.locator('[data-mobile-menu-dialog]');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('link', { name: /Projects$/ })).toBeVisible();
  });
});