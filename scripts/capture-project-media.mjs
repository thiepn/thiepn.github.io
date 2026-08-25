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
  {
    name: 'screenshot-mobile.png',
    context: {
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      isMobile: true,
      hasTouch: true,
    },
  },
];

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

console.log(`Captured ${captures.length} real browser screenshots for ${slug} from ${url}`);
