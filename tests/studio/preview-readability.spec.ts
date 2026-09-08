import { test, expect } from '@playwright/test';

test('Tiny Tools default example is fully readable across viewport and theme variants', async ({ page }, testInfo) => {
  for (const width of [320, 375, 768, 1440]) {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.setViewportSize({ width, height: 960 });
      await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
      await page.goto('/');
      await expect(page.locator('[data-text-preview]')).toHaveAttribute('data-ready', 'true');
      await page.evaluate(() => document.fonts.ready);
      // A desktop-only line break must not join two sentences on mobile or in text extraction.
      expect((await page.locator('.tools-spotlight__line').textContent())?.replace(/\s+/g, ' ').trim()).toBe('Small jobs. Less friction.');
      for (const selector of ['[data-preview-input]', '[data-preview-output]']) {
        const size = await page.locator(selector).evaluate((element: HTMLTextAreaElement) => ({
          content: element.scrollHeight,
          viewport: element.clientHeight,
          width: element.scrollWidth,
          viewportWidth: element.clientWidth,
        }));
        expect(size.content, `${selector} is clipped at ${width}px in ${colorScheme}`).toBeLessThanOrEqual(size.viewport + 1);
        expect(size.width).toBeLessThanOrEqual(size.viewportWidth + 1);
      }
      await testInfo.attach(`tiny-tools-${width}-${colorScheme}`, {
        body: await page.locator('#tiny-tools').screenshot(),
        contentType: 'image/png',
      });
    }
  }
});
