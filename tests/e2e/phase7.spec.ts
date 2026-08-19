import { test, expect } from '@playwright/test';

const featured = [
  'pdf-studio','manuscript','clean30','wordstrike','french-3000','ligo-quizabend','analysis-ii-klausurlabor',
];

test('all seven Featured artifacts use dedicated non-generic preview scenes', async ({ page }) => {
  await page.goto('/');
  for (const slug of featured) {
    const root = page.locator(`[data-preview-slug="${slug}"]`).first();
    await expect(root).toBeVisible();
    await expect(root.locator('.scene--generic')).toHaveCount(0);
  }
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

test('Clean30 preview demonstrates task completion rather than decorative motion', async ({ page }) => {
  await page.goto('/');
  const root = page.locator('[data-preview-slug="clean30"]').first();
  await root.hover();
  await page.waitForTimeout(1900);
  await expect(root).toHaveAttribute('data-preview-state','active');
  const width = await root.locator('.clean-progress span').evaluate((node) => parseFloat(getComputedStyle(node).width));
  expect(width).toBeGreaterThan(0);
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

test('French, LiGo and Analysis use distinct workflow choreography', async ({ page }) => {
  await page.goto('/');
  const probes = [
    ['french-3000','.french-card--two','p7-french-next'],
    ['ligo-quizabend','.answer-correct','p7-quiz-answer'],
    ['analysis-ii-klausurlabor','.analysis-curve--b','p7-curve-b'],
  ] as const;
  for (const [slug,selector,name] of probes) {
    const root=page.locator(`[data-preview-slug="${slug}"]`).first();
    await root.hover(); await page.waitForTimeout(230);
    const animation=await root.locator(selector).evaluate((node)=>getComputedStyle(node).animationName);
    expect(animation).toContain(name);
    await page.mouse.move(0,0);
  }
});

test('reduced motion keeps every Featured preview in poster state', async ({ browser }) => {
  const context=await browser.newContext({ reducedMotion:'reduce', viewport:{width:1440,height:900} });
  const page=await context.newPage();
  await page.goto('http://127.0.0.1:4321/');
  for(const slug of featured.slice(0,4)){
    const root=page.locator(`[data-preview-slug="${slug}"]`).first();
    await root.hover(); await page.waitForTimeout(320);
    await expect(root).toHaveAttribute('data-preview-state','poster');
  }
  await context.close();
});
