import { test, expect } from '@playwright/test';

const featured = [
  'the-bible-challenge','pdf-studio','wordstrike','manuscript','voidcut',
];
const interactiveFeatured = ['pdf-studio','wordstrike','manuscript'];

test('homepage renders the intentional five-project featured set in order', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('#featured article');
  await expect(cards).toHaveCount(5);
  for (let index = 0; index < featured.length; index += 1) {
    await expect(cards.nth(index).locator(`[data-preview-slug="${featured[index]}"]`)).toBeVisible();
  }
});

test('The Bible Challenge uses real captured interface media', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('#featured [data-preview-slug="the-bible-challenge"]').first();
  await expect(root).toBeVisible();
  await expect(root).toHaveAttribute('data-preview-kind', 'static');
  await expect(root).toHaveAttribute('data-preview-provenance', 'captured');
  await expect(root).toHaveAttribute('data-preview-state', 'static');
  await expect(root.locator('img')).toHaveAttribute('src', '/projects/the-bible-challenge/screenshot-desktop.png');
  await expect(root.locator('.scene--bible-quiz')).toHaveCount(0);
});

test('interactive Featured projects keep dedicated non-generic preview scenes while VOIDCUT uses the honest static fallback', async ({ page }) => {
  await page.goto('/');
  for (const slug of interactiveFeatured) {
    const root = page.locator(`#featured [data-preview-slug="${slug}"]`).first();
    await expect(root).toBeVisible();
    await expect(root.locator('.scene--generic')).toHaveCount(0);
  }
  const voidcut = page.locator('#featured [data-preview-slug="voidcut"]').first();
  await expect(voidcut).toHaveAttribute('data-preview-kind', 'static');
  await expect(voidcut.locator('.scene--generic')).toHaveCount(1);
});

test('P5 Manuscript preview runs its source-to-publication choreography', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('[data-preview-slug="manuscript"]').first();
  await root.hover();
  await page.waitForTimeout(240);
  await expect(root).toHaveAttribute('data-preview-state','active');
  const line = root.locator('.md-line--2');
  const animation = await line.evaluate((node) => getComputedStyle(node).animationName);
  expect(animation).toContain('p7-md-line');
});

test('WORDSTRIKE Featured video is deferred and truthfully labelled as a demo', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('[data-preview-slug="wordstrike"]').first();
  await expect(root).toHaveAttribute('data-preview-provenance','reconstructed');
  const video = root.locator('[data-preview-video]');
  await expect(video).not.toHaveAttribute('src', /.+/);
  await root.hover();
  await page.waitForTimeout(340);
  await expect(video).toHaveAttribute('src', /projects\/wordstrike\/preview\.webm/);
  await expect(root.locator('[data-preview-status]')).toHaveText('DEMO');
});

test('reduced motion keeps interactive Featured previews in poster state', async ({ browser }) => {
  const context=await browser.newContext({ reducedMotion:'reduce', viewport:{width:1440,height:900} });
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:4321/');
  for(const slug of interactiveFeatured){
    const root=page.locator(`[data-preview-slug="${slug}"]`).first();
    await root.hover(); await page.waitForTimeout(320);
    await expect(root).toHaveAttribute('data-preview-state','poster');
  }
  await context.close();
});
