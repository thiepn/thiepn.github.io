import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

type Theme = 'light' | 'dark';
type Viewport = 'desktop' | 'mobile';
type Target = {
  id: string;
  path: string;
  theme: Theme;
  viewport: Viewport;
  state?: 'search';
  query?: string;
};
type VisualConfig = {
  referenceViewport: { width: number; height: number };
  mobileViewport: { width: number; height: number };
  maxDiffPixelRatio: number;
  targets: Target[];
};

const config = JSON.parse(
  readFileSync(new URL('../../visual-regression.config.json', import.meta.url), 'utf8'),
) as VisualConfig;

async function prepare(page: Page, target: Target) {
  const viewport = target.viewport === 'mobile' ? config.mobileViewport : config.referenceViewport;
  await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: target.theme });
  await page.addInitScript((theme: string) => localStorage.setItem('thiepn:index-theme', theme), target.theme);
  await page.goto(target.path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts?.ready);
  if (target.state === 'search') {
    await page.keyboard.press('Control+K');
    const input = page.getByRole('combobox', { name: 'Search projects and collections' });
    await input.fill(target.query ?? 'analysis');
    await expect(page.getByRole('dialog', { name: 'Search projects' })).toBeVisible();
  }
  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}*{content-visibility:visible!important}',
  });
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
