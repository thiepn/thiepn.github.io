import { test, expect } from '@playwright/test';

// aria-allowed-role is a best-practice rule, outside the WCAG-tagged suite.
// Preserve native figure semantics inside a generic tabpanel container.
for (const route of ['/', '/project/micro-arcade/']) {
  test(`game preview uses supported roles and native figure captions ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.addScriptTag({ path: process.env.AXE_PATH || '/tmp/audit-tools/node_modules/axe-core/axe.min.js' });
    const result = await page.evaluate(async () => await (window as any).axe.run(document, { runOnly: { type: 'rule', values: ['aria-allowed-role'] } }));
    expect(result.violations).toEqual([]);
    await expect(page.locator('[data-media-panel]:visible > figure > figcaption')).toContainText('Breakout');
    expect(await page.locator('[data-media-panel]').evaluateAll(es => es.every(e => e.tagName === 'DIV'))).toBe(true);
  });
}
