import { test, expect } from '@playwright/test';

test('automatic live capture keeps PDF Studio authentic and static on the homepage', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('[data-preview-slug="pdf-studio"]').first();
  await expect(root).toHaveAttribute('data-preview-kind', 'static');
  await expect(root).toHaveAttribute('data-preview-provenance', 'captured');
  await expect(root).toHaveAttribute('data-preview-state', 'static');
  await expect(root.locator('img')).toHaveAttribute('src', '/projects/pdf-studio/capture.jpg');
});

test('WORDSTRIKE video is lazy and only receives a source after interaction', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('[data-preview-slug="wordstrike"]').first();
  const video = root.locator('[data-preview-video]');
  await expect(video).not.toHaveAttribute('src', /.+/);
  await root.hover();
  await expect(video).toHaveAttribute('src', /projects\/wordstrike\/preview\.webm/);
  await expect(root).toHaveAttribute('data-preview-state', 'active', { timeout: 2000 });
});

test('project-detail inspector still arms, activates, and resets after hover', async ({ page }) => {
  await page.goto('/project/pdf-studio/');
  const root = page.locator('[data-record-preview] [data-preview-slug="pdf-studio"]').first();
  await expect(root).toHaveAttribute('data-preview-state', 'poster');
  await root.hover();
  await expect.poll(async () => await root.getAttribute('data-preview-state'), { timeout: 1200 })
    .toMatch(/^(armed|active)$/);
  await expect(root).toHaveAttribute('data-preview-state', 'active', { timeout: 1200 });
  await page.mouse.move(0, 0);
  await expect(root).toHaveAttribute('data-preview-state', 'poster');
});

test('leaving viewport resets an animated project-detail preview', async ({ page }) => {
  await page.goto('/project/manuscript/');
  const root = page.locator('[data-record-preview] [data-preview-slug="manuscript"]').first();
  await root.hover();
  await page.waitForTimeout(230);
  await expect(root).toHaveAttribute('data-preview-state', 'active');
  await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
  await page.waitForTimeout(120);
  await expect(root).toHaveAttribute('data-preview-state', 'poster');
});

test('reduced motion never starts animated project-detail previews', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/project/pdf-studio/');
  const root = page.locator('[data-record-preview] [data-preview-slug="pdf-studio"]').first();
  await root.hover();
  await page.waitForTimeout(350);
  await expect(root).toHaveAttribute('data-preview-state', 'poster');
  await context.close();
});

test('touch/mobile keeps the project-detail inspector poster-first with no hover dependency', async ({ browser, browserName }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, ...(browserName === 'firefox' ? {} : { isMobile: true }) });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/project/pdf-studio/');
  const root = page.locator('[data-record-preview] [data-preview-slug="pdf-studio"]').first();
  await expect(root).toHaveAttribute('data-preview-state', 'poster');
  expect(await page.locator('[data-preview-state="active"]').count()).toBe(0);
  await context.close();
});
