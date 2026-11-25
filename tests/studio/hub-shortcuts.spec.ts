import { test, expect, type Page } from '@playwright/test';
import manifest from '../../src/generated/launch-manifest.json' with { type: 'json' };
import { HUB_VISIBLE_APP_IDS } from '../../src/lib/workspace/visible-apps';

async function openEditor(page: Page) {
  await page.locator('[data-widget-type="app-shortcuts"] [data-action="configure-widget"]').click();
  const dialog = page.locator('[data-workspace-dialog]');
  await expect(dialog).toBeVisible();
  return dialog;
}
test('shortcut picker offers exactly the fourteen curated apps and preserves selection after reload', async ({page}) => {
  await page.goto('/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await page.locator('[data-action=unified-mode][data-id=workspace]').click();
  const dialog = await openEditor(page);
  const ids = await dialog.locator('input[name="appIds"]').evaluateAll(nodes=>nodes.map(n=>(n as HTMLInputElement).value));
  expect([...ids].sort()).toEqual([...HUB_VISIBLE_APP_IDS].sort());
  await dialog.locator('[data-pin-search]').fill('Chinese');
  await expect(dialog.locator('[data-app-choice]:visible')).toHaveCount(0);
  await dialog.locator('[data-pin-search]').fill('voidcut');
  await expect(dialog.getByRole('checkbox',{name:'VOIDCUT',exact:true})).toBeVisible();
  await dialog.getByRole('checkbox',{name:'VOIDCUT',exact:true}).check();
  await dialog.locator('[data-dialog-submit]').click();
  await page.reload();
  await expect(page.locator('[data-launch="voidcut"]')).toBeVisible();
});
test('Apps roster and category filters show only approved apps; registry is unchanged', async ({page}) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/apps/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  expect(await page.locator('[data-hub-slug]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-hub-slug')))).toEqual([...HUB_VISIBLE_APP_IDS]);
  await expect(page.locator('[data-hub-current-app], [data-hub-pending-app]')).toHaveCount(0);
  const registered = JSON.parse((await page.locator('[data-workspace-apps]').textContent()) ?? '[]') as {id:string}[];
  expect(registered.map(app=>app.id)).toEqual(manifest.entries.map(app=>app.id));
  await page.locator('[data-hub-category="games"]').click();
  await expect(page.locator('[data-hub-slug="gomoku"]')).toBeVisible();
  await expect(page.locator('[data-hub-slug="notes"]')).toBeHidden();
  await page.locator('[data-hub-category="all"]').click();
  const pin=page.locator('[data-hub-slug="gomoku"] [data-action="pin-app"]');
  await pin.click();
  await expect(pin).toHaveAttribute('aria-pressed','true');
  await page.reload();
  await expect(pin).toHaveAttribute('aria-pressed','true');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
