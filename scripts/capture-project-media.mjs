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

async function dismissTbcModal(page) {
  const backdrop = page.locator('#modalRoot .modal-backdrop').first();
  if (!await backdrop.isVisible().catch(() => false)) return;

  const closedViaApi = await page.evaluate(() => {
    const closer = globalThis.closeModal;
    if (typeof closer !== 'function') return false;
    closer();
    return true;
  }).catch(() => false);

  if (!closedViaApi) await page.keyboard.press('Escape').catch(() => {});

  await backdrop.waitFor({ state: 'hidden', timeout: 5_000 }).catch(async () => {
    const closeControl = page.locator('#modalRoot button').filter({ hasText: /^(close|back|cancel|done|×|✕)$/i }).first();
    if (await closeControl.isVisible().catch(() => false)) await closeControl.click({ force: true });
  });

  if (await backdrop.isVisible().catch(() => false)) {
    throw new Error('TBC capture could not dismiss the open modal before capturing Home.');
  }
}

async function activateTbcHome(page) {
  const enhancedHome = page.locator('[data-pr5-nav="home"]').first();
  if (await enhancedHome.isVisible().catch(() => false)) {
    await enhancedHome.evaluate((element) => element.click());
  } else {
    const nativeHome = page.getByRole('button', { name: /^Home$/i }).first();
    if (await nativeHome.isVisible().catch(() => false)) {
      await nativeHome.evaluate((element) => element.click());
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
  }
  await page.waitForTimeout(700);
}

async function dismissWordstrikeOnboarding(page) {
  const backdrop = page.locator('.onboarding-backdrop').first();
  if (!await backdrop.isVisible().catch(() => false)) return;

  const skip = page.locator('[data-onboarding-action="skip"]').first();
  const close = page.locator('[data-onboarding-action="close"]').first();
  if (await skip.isVisible().catch(() => false)) await skip.click();
  else if (await close.isVisible().catch(() => false)) await close.click();
  else await page.keyboard.press('Escape').catch(() => {});

  await backdrop.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
  if (await backdrop.isVisible().catch(() => false)) {
    throw new Error('WORDSTRIKE capture could not dismiss the first-run Introduction overlay.');
  }
}

async function prepareCanonicalState(page) {
  await page.addStyleTag({
    content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}',
  });

  if (slug === 'the-bible-challenge') {
    await dismissTbcModal(page);

    let domain = await page.locator('body').getAttribute('data-pr5-domain');
    const visibleNativeHome = page.locator('.pr5-native-home').first();
    if (domain !== 'home' || !await visibleNativeHome.isVisible().catch(() => false)) {
      await activateTbcHome(page);
      await dismissTbcModal(page);
      domain = await page.locator('body').getAttribute('data-pr5-domain');
    }

    await page.locator('body[data-pr5-domain="home"]').waitFor({ state: 'attached', timeout: 8_000 });
    await visibleNativeHome.waitFor({ state: 'visible', timeout: 8_000 });

    if (domain !== 'home') throw new Error(`TBC capture expected home domain, received ${domain ?? 'null'}.`);
    if (await page.locator('#modalRoot .modal-backdrop').first().isVisible().catch(() => false)) {
      throw new Error('TBC capture reached Home but a modal still obscures the home menu.');
    }

    const visibleContent = await visibleNativeHome.evaluate((element) => {
      const text = element.textContent?.replace(/\s+/g, ' ').trim() ?? '';
      const rect = element.getBoundingClientRect();
      return text.length > 0 && rect.width > 0 && rect.height > 0;
    });
    if (!visibleContent) throw new Error('TBC native Home surface is visible but contains no usable home-menu content.');

    await page.waitForTimeout(500);
  }

  if (slug === 'wordstrike') {
    await page.locator('body').waitFor({ state: 'visible' });
    await dismissWordstrikeOnboarding(page);
    await page.waitForTimeout(500);

    const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    const expectedMenuLabels = ['Campaign', 'Typing Test', 'Endless', 'Daily Strike'];
    const visibleMenuLabels = expectedMenuLabels.filter((label) => bodyText.includes(label));
    if (visibleMenuLabels.length < 2) {
      throw new Error(`WORDSTRIKE capture expected its mode menu after onboarding; found ${visibleMenuLabels.length} known mode labels.`);
    }
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
