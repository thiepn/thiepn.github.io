import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const [slug, url] = process.argv.slice(2);

if (!slug || !url) {
  console.error('Usage: node scripts/capture-project-media.mjs <slug> <url>');
  process.exit(1);
}

const outputDir = path.resolve('public', 'projects', slug);
await mkdir(outputDir, { recursive: true });

const captures = [
  {
    name: 'screenshot-desktop.png',
    context: {
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    },
  },
  ...(slug === 'wordstrike' ? [] : [{
    name: 'screenshot-mobile.png',
    context: {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      isMobile: true,
      hasTouch: true,
    },
  }]),
];

async function prepareCanonicalState(page) {
  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}',
  });

  if (slug === 'the-bible-challenge') {
    const enhancedHome = page.locator('[data-pr5-nav="home"]').first();
    const nativeHome = page.getByRole('button', { name: /^Home$/i }).first();

    if (await enhancedHome.isVisible().catch(() => false)) {
      await enhancedHome.click();
    } else if (await nativeHome.isVisible().catch(() => false)) {
      await nativeHome.click();
    } else {
      const clicked = await page.evaluate(() => {
        const candidate = Array.from(document.querySelectorAll('button,a,[role="button"]'))
          .find((element) => element.textContent?.trim().toLowerCase() === 'home');
        if (!(candidate instanceof HTMLElement)) return false;
        candidate.click();
        return true;
      });
      if (!clicked) throw new Error('TBC capture could not find a Home navigation control.');
    }

    await page.locator('body[data-pr5-domain="home"]').waitFor({ state: 'attached', timeout: 8_000 });
    await page.locator('.pr5-home').first().waitFor({ state: 'visible', timeout: 8_000 });
    const domain = await page.locator('body').getAttribute('data-pr5-domain');
    if (domain !== 'home') throw new Error(`TBC capture expected home domain, received ${domain ?? 'null'}.`);
    await page.waitForTimeout(500);
  }

  if (slug === 'wordstrike') {
    await page.locator('body').waitFor({ state: 'visible' });
    await page.waitForTimeout(500);
  }
}

const browser = await chromium.launch({ headless: true });

try {
  for (const capture of captures) {
    const context = await browser.newContext(capture.context);
    const page = await context.newPage();

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await page.evaluate(async () => {
      if (document.fonts?.ready) await document.fonts.ready;
    });
    await page.waitForTimeout(1_200);
    await prepareCanonicalState(page);

    await page.screenshot({
      path: path.join(outputDir, capture.name),
      type: 'png',
      fullPage: false,
      animations: 'disabled',
    });

    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`Captured ${captures.length} canonical browser screenshot(s) for ${slug} from ${url}`);
