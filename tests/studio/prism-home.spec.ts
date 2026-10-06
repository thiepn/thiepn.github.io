import { test, expect } from '@playwright/test';

const route = '/home/prism-preview/';

test('Prism preview locks the canonical desktop composition without legacy Home chrome', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(route);

  await expect(page.locator('[data-prism-home="v1"]')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-prism-shell', 'true');
  await expect(page.locator('.prism-rail')).toBeVisible();
  await expect(page.locator('.prism-topbar')).toBeVisible();
  await expect(page.locator('.prism-mobile-header')).toBeHidden();
  await expect(page.locator('.prism-mobile-nav')).toBeHidden();
  await expect(page.locator('.site-header')).toHaveCount(0);
  await expect(page.locator('.portal-bottom-nav')).toHaveCount(0);

  const accountTrigger = page.locator('.prism-topbar__account');
  await accountTrigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#prism-account-dialog')).toHaveJSProperty('open', true);
  await expect(page.locator('#prism-account-dialog [data-auth-status]')).toBeVisible();
  await page.locator('[data-prism-account-close]').click();
  await expect(page.locator('#prism-account-dialog')).toHaveJSProperty('open', false);
  await expect(accountTrigger).toBeFocused();

  await expect(page.locator('.hub-hero')).toHaveCount(0);
  await expect(page.locator('.portal-home-heading')).toHaveCount(0);
  await expect(page.locator('.portal-daily')).toHaveCount(0);
  await expect(page.locator('.portal-pins')).toHaveCount(0);

  const continuation = page.locator('.prism-continue');
  const now = page.locator('.prism-now');
  const apps = page.locator('.prism-apps');
  const study = page.locator('.prism-study');
  const recent = page.locator('.prism-recent');

  for (const block of [continuation, now, apps, study, recent]) await expect(block).toBeVisible();
  await expect(page.locator('.prism-app')).toHaveCount(8);

  const [continueBox, nowBox, appsBox, studyBox, recentBox] = await Promise.all(
    [continuation, now, apps, study, recent].map((locator) => locator.boundingBox()),
  );
  expect(continueBox && nowBox && appsBox && studyBox && recentBox).toBeTruthy();

  expect(Math.abs(continueBox!.y - nowBox!.y)).toBeLessThan(2);
  expect(continueBox!.x).toBeLessThan(nowBox!.x);
  expect(continueBox!.width).toBeGreaterThan(nowBox!.width * 1.8);
  expect(appsBox!.y).toBeGreaterThan(continueBox!.y + continueBox!.height);
  expect(Math.abs(studyBox!.y - recentBox!.y)).toBeLessThan(2);
  expect(studyBox!.width).toBeGreaterThan(recentBox!.width);

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
});

test('Prism preview uses the intentional tablet 5/8 + 3/8 composition', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 1000 });
  await page.goto(route);

  await expect(page.locator('.prism-rail')).toBeHidden();
  await expect(page.locator('.prism-topbar')).toBeVisible();

  const continueBox = await page.locator('.prism-continue').boundingBox();
  const nowBox = await page.locator('.prism-now').boundingBox();
  const studyBox = await page.locator('.prism-study').boundingBox();
  const recentBox = await page.locator('.prism-recent').boundingBox();

  expect(continueBox && nowBox && studyBox && recentBox).toBeTruthy();
  expect(Math.abs(continueBox!.y - nowBox!.y)).toBeLessThan(2);
  expect(continueBox!.width).toBeGreaterThan(nowBox!.width * 1.45);
  expect(Math.abs(studyBox!.y - recentBox!.y)).toBeLessThan(2);
  expect(studyBox!.width).toBeGreaterThan(recentBox!.width * 1.45);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1024);
});

test('Prism mobile order is Continue → Now → Apps → Study → Recent with a four-column app grid', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route);

  await expect(page.locator('.prism-rail')).toBeHidden();
  await expect(page.locator('.prism-topbar')).toBeHidden();
  await expect(page.locator('.prism-mobile-header')).toBeVisible();
  await expect(page.locator('.prism-mobile-nav')).toBeVisible();
  await expect(page.locator('.prism-mobile-nav a')).toHaveCount(4);
  await expect(page.locator('.prism-mobile-nav [data-prism-nav="home"]')).toHaveAttribute('aria-current', 'page');

  const selectors = ['.prism-continue', '.prism-now', '.prism-apps', '.prism-study', '.prism-recent'];
  const boxes = [];
  for (const selector of selectors) {
    const box = await page.locator(selector).boundingBox();
    expect(box).toBeTruthy();
    boxes.push(box!);
  }
  for (let index = 1; index < boxes.length; index += 1) {
    expect(boxes[index]!.y).toBeGreaterThan(boxes[index - 1]!.y);
  }

  const icons = page.locator('.prism-app');
  const iconBoxes = await Promise.all(Array.from({ length: 4 }, (_, index) => icons.nth(index).boundingBox()));
  expect(iconBoxes.every(Boolean)).toBe(true);
  const firstRowY = iconBoxes[0]!.y;
  for (const box of iconBoxes) expect(Math.abs(box!.y - firstRowY)).toBeLessThan(2);

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('Prism Dark remains graphite-first', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('thiepn:index-theme', 'dark'));
  await page.goto(route);

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const canvas = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--canvas').trim());
  expect(canvas.toLowerCase()).toBe('#0c0f13');
});
