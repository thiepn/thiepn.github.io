import { test, expect, type Page } from '@playwright/test';
import manifest from '../../src/generated/launch-manifest.json' with { type: 'json' };

async function openEditor(page: Page) {
  await page.locator('[data-widget-type="app-shortcuts"] [data-action="configure-widget"]').click();
  const dialog = page.locator('[data-workspace-dialog]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#ws-dialog-title')).toHaveText('Choose app shortcuts');
  return dialog;
}

test('newer apps can be pinned, reordered with existing IDs preserved, and unpinned after reload', async ({ page }) => {
  await page.goto('/?mode=workspace');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  const published = JSON.parse((await page.locator('[data-workspace-apps]').textContent()) ?? '[]') as { id: string }[];
  expect(published.map(a => a.id)).toEqual(manifest.entries.map(e => e.id));

  let dialog = await openEditor(page);
  await expect(dialog.getByRole('checkbox', { name: 'Chinese', exact: true })).toBeVisible();
  await expect(dialog.getByRole('checkbox', { name: 'Japanese', exact: true })).toBeVisible();
  await expect(dialog.getByRole('checkbox', { name: 'My Daily Devotion', exact: true })).toBeVisible();
  await dialog.getByRole('checkbox', { name: 'Chinese', exact: true }).check();
  await dialog.getByRole('checkbox', { name: 'Japanese', exact: true }).check();
  await dialog.getByRole('checkbox', { name: 'My Daily Devotion', exact: true }).check();

  await dialog.locator('[data-pin-search]').fill('voidcut');
  await expect(dialog.locator('[data-other-shortcuts]')).toHaveAttribute('open', '');
  await expect(dialog.getByRole('checkbox', { name: 'VOIDCUT', exact: true })).toBeVisible();
  await dialog.locator('[data-pin-search]').fill('');
  await dialog.locator('[data-dialog-submit]').click();
  await expect(dialog).not.toBeVisible();

  const shortcuts = page.locator('[data-widget-type="app-shortcuts"] .ws-shortcuts');
  await expect(shortcuts).toContainText('Chinese');
  await expect(shortcuts).toContainText('Japanese');
  await expect(shortcuts).toContainText('My Daily Devotion');
  await expect(shortcuts).toContainText('Notes');

  await page.reload();
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await expect(shortcuts).toContainText('Chinese');
  dialog = await openEditor(page);
  await dialog.getByRole('checkbox', { name: 'Chinese', exact: true }).uncheck();
  await dialog.locator('[data-dialog-submit]').click();
  await expect(dialog).not.toBeVisible();
  await expect(shortcuts).not.toContainText('Chinese');
  await expect(shortcuts).toContainText('Japanese');
  await expect(shortcuts).toContainText('Notes');
});

test('mobile shortcut editor keeps current and older apps searchable without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?mode=workspace');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  const dialog = await openEditor(page);
  await expect(dialog.getByRole('checkbox', { name: 'ION', exact: true })).toBeVisible();
  await dialog.locator('[data-pin-search]').fill('wordstrike');
  await expect(dialog.getByRole('checkbox', { name: 'WORDSTRIKE', exact: true })).toBeVisible();
  const width = await dialog.evaluate(element => element.getBoundingClientRect().width);
  expect(width).toBeLessThanOrEqual(390);
  await dialog.getByRole('checkbox', { name: 'WORDSTRIKE', exact: true }).check();
  await dialog.locator('[data-dialog-submit]').click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('[data-widget-type="app-shortcuts"] .ws-shortcuts')).toContainText('WORDSTRIKE');
});


test('Apps tab displays current independent apps while the published catalogue stays frozen', async ({ page }) => {
  await page.goto('/apps/');
  await expect(page.locator('[data-hub-current-app]')).toHaveCount(12);
  await expect(page.locator('[data-hub-item]')).toHaveCount(manifest.entries.length);
  for (const app of ['languages', 'chinese', 'japanese', 'korea', 'studyos', 'mdd', 'ion', 'chess', 'karaoke', 'ligoquiz', 'control']) {
    await expect(page.locator(`[data-hub-current-app="${app}"] a`)).toHaveAttribute('href', /https:\/\//);
  }
  const publiclyRegistered = JSON.parse((await page.locator('[data-workspace-apps]').textContent()) ?? '[]') as { id: string }[];
  expect(publiclyRegistered.map(app => app.id)).toEqual(manifest.entries.map(entry => entry.id));
});

test('Apps tab filters both current and published apps, with pin persistence on mobile', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/apps/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await page.locator('[data-hub-category="games"]').click();
  await expect(page.locator('[data-hub-current-app="chess"]')).toBeVisible();
  await expect(page.locator('[data-hub-current-app="japanese"]')).toBeHidden();
  await page.locator('[data-hub-category="all"]').click();
  const pin = page.locator('[data-hub-current-app="chess"] [data-action="pin-app"]');
  await pin.click();
  await expect(pin).toHaveAttribute('aria-pressed','true');
  await page.reload();
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await expect(page.locator('[data-hub-current-app="chess"] [data-action="pin-app"]')).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
