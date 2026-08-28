import { test, expect } from '@playwright/test';

const featured = [
  'the-bible-challenge','pdf-studio','wordstrike','micro-arcade','voidcut',
];
const automaticCapturedFeatured = ['pdf-studio','micro-arcade','voidcut'];

test('homepage renders the intentional five-project featured set in order', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('#featured article');
  await expect(cards).toHaveCount(5);
  for (let index = 0; index < featured.length; index += 1) {
    await expect(cards.nth(index).locator(`[data-preview-slug="${featured[index]}"]`)).toBeVisible();
  }
});

test('The Bible Challenge uses its explicitly captured interface media', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('#featured [data-preview-slug="the-bible-challenge"]').first();
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute('data-preview-kind', 'static');
  await expect(root).toHaveAttribute('data-preview-provenance', 'captured');
  await expect(root).toHaveAttribute('data-preview-state', 'static');
  await expect(root.locator('img')).toHaveAttribute('src', '/projects/the-bible-challenge/screenshot-desktop.png');
  await expect(root.locator('.scene--bible-quiz')).toHaveCount(0);
});

test('featured projects prefer authentic live captures while WORDSTRIKE keeps its real demo video', async ({ page }) => {
  await page.goto('/');
  for (const slug of automaticCapturedFeatured) {
    const root = page.locator(`#featured [data-preview-slug="${slug}"]`).first();
    await expect(root).toBeVisible();
    await expect(root).toHaveAttribute('data-preview-kind', 'static');
    await expect(root).toHaveAttribute('data-preview-provenance', 'captured');
    await expect(root.locator('img')).toHaveAttribute('src', `/projects/${slug}/capture.jpg`);
    await expect(root.locator('.scene--generic')).toHaveCount(0);
  }

  const strike = page.locator('#featured [data-preview-slug="wordstrike"]').first();
  await expect(strike).toHaveAttribute('data-preview-kind', 'video');
  await expect(strike).toHaveAttribute('data-preview-provenance', 'reconstructed');
});

test('Manuscript project detail keeps its source-to-publication choreography for inspection', async ({ page }) => {
  await page.goto('/project/manuscript/');
  const root = page.locator('[data-record-preview] [data-preview-slug="manuscript"]').first();
  await root.hover();
  await page.waitForTimeout(240);
  await expect(root).toHaveAttribute('data-preview-state','active');
  const line = root.locator('.md-line--2');
  const animation = await line.evaluate((node) => getComputedStyle(node).animationName);
  expect(animation).toContain('p7-md-line');
});

test('WORDSTRIKE Featured video is deferred and retains demo provenance', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('[data-preview-slug="wordstrike"]').first();
  const status = root.locator('[data-preview-status]');
  await expect(root).toHaveAttribute('data-preview-provenance','reconstructed');
  const video = root.locator('[data-preview-video]');
  await expect(video).not.toHaveAttribute('src', /.+/);
  await root.hover();
  await expect(video).toHaveAttribute('src', /projects\/wordstrike\/preview\.webm/);
  await expect.poll(async () => {
    const [state, label] = await Promise.all([
      root.getAttribute('data-preview-state'),
      status.textContent(),
    ]);
    return `${state}|${label}`;
  }, { timeout: 2500 }).toBe('active|DEMO');
});

test('reduced motion keeps animated previews in poster state', async ({ browser }) => {
  const context=await browser.newContext({ reducedMotion:'reduce', viewport:{width:1440,height:900} });
  const page=await context.newPage();

  await page.goto('http://127.0.0.1:4321/');
  const strike=page.locator('[data-preview-slug="wordstrike"]').first();
  await strike.hover();
  await page.waitForTimeout(320);
  await expect(strike).toHaveAttribute('data-preview-state','poster');

  await page.goto('http://127.0.0.1:4321/project/manuscript/');
  const manuscript=page.locator('[data-record-preview] [data-preview-slug="manuscript"]').first();
  await manuscript.hover();
  await page.waitForTimeout(320);
  await expect(manuscript).toHaveAttribute('data-preview-state','poster');
  await context.close();
});
