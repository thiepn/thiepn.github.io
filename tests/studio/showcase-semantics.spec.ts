import { test, expect } from '@playwright/test';

test('Hub app cards use native article/link semantics without ARIA-role violations', async ({ page }) => {
  await page.goto('/');
  await page.addScriptTag({ path: process.env.AXE_PATH || '/tmp/audit-tools/node_modules/axe-core/axe.min.js' });
  const result = await page.evaluate(async () => await (window as any).axe.run(document, { runOnly: { type: 'rule', values: ['aria-allowed-role'] } }));
  expect(result.violations).toEqual([]);
  await expect(page.locator('[data-hub-item]')).toHaveCount(26);
  expect(await page.locator('[data-hub-item]').evaluateAll((elements) => elements.every((element) => element.tagName === 'ARTICLE'))).toBe(true);
  await expect(page.locator('[data-hub-item]').first().locator('h2 a')).toBeVisible();
});

test('Micro Arcade project preview keeps supported tabpanel and figure semantics', async ({ page }) => {
  await page.goto('/project/micro-arcade/');
  await page.addScriptTag({ path: process.env.AXE_PATH || '/tmp/audit-tools/node_modules/axe-core/axe.min.js' });
  const result = await page.evaluate(async () => await (window as any).axe.run(document, { runOnly: { type: 'rule', values: ['aria-allowed-role'] } }));
  expect(result.violations).toEqual([]);
  await expect(page.locator('[data-media-panel]:visible > figure > figcaption')).toContainText('Breakout');
  expect(await page.locator('[data-media-panel]').evaluateAll((elements) => elements.every((element) => element.tagName === 'DIV'))).toBe(true);
});
