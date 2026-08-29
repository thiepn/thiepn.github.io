import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const [slug, url] = process.argv.slice(2);

if (!slug || !url) {
  console.error('Usage: node scripts/capture-project-media.mjs <slug> <url>');
  process.exit(1);
}

const desktop = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' };
const mobile = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, reducedMotion: 'reduce', isMobile: true, hasTouch: true };

const plans = {
  'the-bible-challenge': [
    { name: 'screenshot-desktop.png', state: 'home', context: desktop },
    { name: 'screenshot-mobile.png', state: 'home', context: mobile },
  ],
  wordstrike: [
    { name: 'screenshot-desktop.png', state: 'home', context: desktop },
  ],
  'pdf-studio': [
    { name: 'screenshot-desktop.png', state: 'home', context: desktop },
    { name: 'screenshot-workspace.png', state: 'workspace', context: desktop },
  ],
  'micro-arcade': [
    { name: 'screenshot-desktop.png', state: 'home', context: desktop },
    { name: 'screenshot-gameplay.png', state: 'gameplay', context: desktop },
  ],
  voidcut: [
    { name: 'screenshot-desktop.png', state: 'home', context: desktop },
    { name: 'screenshot-gameplay.png', state: 'gameplay', context: desktop },
  ],
};

const captures = plans[slug];
if (!captures) {
  console.error(`No canonical media plan is registered for ${slug}.`);
  process.exit(1);
}

const outputDir = path.resolve('public', 'projects', slug);
await mkdir(outputDir, { recursive: true });

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
  if (await backdrop.isVisible().catch(() => false)) throw new Error('TBC capture could not dismiss the open modal before capturing Home.');
}

async function activateTbcHome(page) {
  const enhancedHome = page.locator('[data-pr5-nav="home"]').first();
  if (await enhancedHome.isVisible().catch(() => false)) await enhancedHome.evaluate((element) => element.click());
  else {
    const nativeHome = page.getByRole('button', { name: /^Home$/i }).first();
    if (await nativeHome.isVisible().catch(() => false)) await nativeHome.evaluate((element) => element.click());
    else {
      const clicked = await page.evaluate(() => {
        const candidate = Array.from(document.querySelectorAll('button,a,[role="button"]')).find((element) => element.textContent?.trim().toLowerCase() === 'home');
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
  if (await backdrop.isVisible().catch(() => false)) throw new Error('WORDSTRIKE capture could not dismiss the first-run Introduction overlay.');
}

async function prepareTbc(page) {
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
  if (await page.locator('#modalRoot .modal-backdrop').first().isVisible().catch(() => false)) throw new Error('TBC capture reached Home but a modal still obscures the home menu.');
}

async function prepareWordstrike(page) {
  const app = page.locator('#app').first();
  await app.waitFor({ state: 'visible', timeout: 8_000 });
  await dismissWordstrikeOnboarding(page);
  if (await page.locator('.onboarding-backdrop').first().isVisible().catch(() => false)) throw new Error('WORDSTRIKE onboarding still obscures the app after dismissal.');
}

async function preparePdfStudio(page, state) {
  await page.locator('body').waitFor({ state: 'visible', timeout: 12_000 });
  await page.waitForTimeout(1_000);
  const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim();
  console.log(`PDF Studio deployed surface (${state}): ${bodyText.slice(0, 1800)}`);
  if (!/pdf/i.test(bodyText)) throw new Error('PDF Studio live surface contains no visible PDF product content.');
  if (state === 'home') return;

  const sampleControl = page.locator('button, a').filter({ hasText: /sample/i }).first();
  if (!await sampleControl.isVisible().catch(() => false)) {
    const controls = await page.locator('button, a').allTextContents();
    throw new Error(`PDF Studio live surface has no visible sample control. Controls: ${controls.map((text) => text.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 40).join(' | ')}`);
  }
  await sampleControl.click();
  await page.waitForTimeout(2_000);
  const hash = await page.evaluate(() => window.location.hash);
  if (!hash || hash === '#/home') throw new Error(`PDF Studio sample control did not leave Home. Current hash: ${hash || '(empty)'}`);
}

async function prepareMicroArcade(page, state) {
  await page.locator('#library-section').waitFor({ state: 'visible', timeout: 12_000 });
  await page.getByText('MICRO ARCADE', { exact: true }).first().waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {});
  if (state === 'home') {
    await page.evaluate(() => window.scrollTo(0, 0));
    return;
  }

  await page.locator('#play-btn-orbit').click();
  const shell = page.locator('.game-shell').first();
  await shell.waitFor({ state: 'visible', timeout: 12_000 });
  await shell.getByRole('heading', { name: 'Orbit', exact: true }).waitFor({ state: 'visible', timeout: 8_000 });
  await page.waitForTimeout(1_500);
}

async function prepareVoidcut(page, state) {
  const menu = page.locator('#menu').first();
  await menu.waitFor({ state: 'visible', timeout: 12_000 });
  await page.locator('.logo-lockup').first().waitFor({ state: 'visible', timeout: 8_000 });
  if (state === 'home') return;

  const play = page.locator('#play').first();
  await play.waitFor({ state: 'visible', timeout: 8_000 });
  await play.click();
  await menu.waitFor({ state: 'hidden', timeout: 12_000 });
  await page.locator('#game').waitFor({ state: 'visible', timeout: 8_000 });
  await page.waitForTimeout(1_600);
}

async function prepareCanonicalState(page, state) {
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}' });

  if (slug === 'the-bible-challenge') await prepareTbc(page);
  else if (slug === 'wordstrike') await prepareWordstrike(page);
  else if (slug === 'pdf-studio') await preparePdfStudio(page, state);
  else if (slug === 'micro-arcade') await prepareMicroArcade(page, state);
  else if (slug === 'voidcut') await prepareVoidcut(page, state);

  await page.waitForTimeout(500);
}

const browser = await chromium.launch({ headless: true });
try {
  for (const capture of captures) {
    const context = await browser.newContext(capture.context);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
    await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
    await page.waitForTimeout(1_200);
    await prepareCanonicalState(page, capture.state);
    await page.screenshot({ path: path.join(outputDir, capture.name), type: 'png', fullPage: false, animations: 'disabled' });
    await context.close();
  }
} finally {
  await browser.close();
}
console.log(`Captured ${captures.length} canonical browser screenshot(s) for ${slug} from ${url}`);
