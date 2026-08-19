import { expect, test, type Page } from '@playwright/test';
import config from '../../visual-regression.config.json';

type Target = (typeof config.targets)[number];

async function prepare(page: Page, target: Target) {
  const viewport = target.viewport === 'mobile' ? config.mobileViewport : config.referenceViewport;
  await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: target.theme as 'light'|'dark' });
  await page.addInitScript((theme: string) => localStorage.setItem('thiepn:index-theme', theme), target.theme);
  await page.goto(target.path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts?.ready);
  if ('state' in target && target.state === 'search') {
    await page.keyboard.press('Control+K');
    const input = page.getByRole('combobox', { name: 'Search projects and collections' });
    await input.fill(('query' in target && target.query) || 'analysis');
    await expect(page.getByRole('dialog', { name: 'Search / The Index' })).toBeVisible();
  }
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
}

test.describe('Phase 13 canonical visual regression', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Canonical pixel baselines are Chromium-only; cross-browser behavior is certified in Phase 12.');
  for (const target of config.targets) {
    test(target.id, async ({ page }) => {
      await prepare(page, target);
      await expect(page).toHaveScreenshot(`${target.id}.png`, {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: config.maxDiffPixelRatio,
      });
    });
  }
});
