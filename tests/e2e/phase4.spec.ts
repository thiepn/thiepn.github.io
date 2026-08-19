import { test, expect } from '@playwright/test';

test('Catalogue Search opens from keyboard and finds aliases/typos', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  const dialog=page.locator('[data-catalogue-search-dialog]');
  await expect(dialog).toBeVisible();
  const input=page.locator('[data-catalogue-search-input]');
  await input.fill('manuscipt');
  await expect(page.getByText('Manuscript',{exact:true}).first()).toBeVisible();
  await input.fill('G-003');
  await expect(page.getByText('Curio',{exact:true}).first()).toBeVisible();
});

test('archive category, search, sort and view persist in URL', async ({ page }) => {
  await page.goto('/projects/');
  await page.getByRole('button',{name:'Games',exact:true}).click();
  await expect(page).toHaveURL(/category=games/);
  await page.locator('[data-archive-query]').fill('typing');
  await expect(page).toHaveURL(/q=typing/);
  await expect(page.locator('[data-archive-result-count]')).toHaveText('002');
  await page.locator('[data-archive-sort]').selectOption('az');
  await expect(page).toHaveURL(/sort=az/);
  await page.getByRole('button',{name:'List',exact:true}).click();
  await expect(page).toHaveURL(/view=list/);
  await expect(page.locator('[data-archive-list]')).toBeVisible();
});

test('shared category index applies local filter and Back restores state', async ({ page }) => {
  await page.goto('/projects/');
  await page.locator('.category-index').getByRole('link',{name:/Games/}).click();
  await expect(page).toHaveURL(/category=games/);
  await page.locator('[data-archive-grid] [data-slug="curio"] a').filter({hasText:'Curio'}).first().click();
  await expect(page).toHaveURL(/\/project\/curio\//);
  await page.goBack();
  await expect(page).toHaveURL(/category=games/);
  await expect(page.getByRole('button',{name:'Games',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('Random Access selects an artifact without auto-launching it', async ({ page }) => {
  await page.goto('/projects/');
  await page.locator('[data-archive-random]').click();
  await expect(page.locator('[data-catalogue-search-dialog]')).toBeVisible();
  await expect(page.locator('[data-catalogue-search-random]')).toBeVisible();
  await expect(page.locator('[data-catalogue-search-random-card] a')).toHaveText(/Open details/);
  await expect(page).toHaveURL(/\/projects\//);
});

test('mobile Catalogue Search is full screen and usable with touch viewport', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await page.getByRole('button',{name:'Menu'}).click();
  await page.getByRole('link',{name:/Search index/i}).click();
  await expect(page.locator('[data-catalogue-search-dialog]')).toBeVisible();
  await page.locator('[data-catalogue-search-input]').fill('french');
  await expect(page.getByText('French 3000',{exact:true}).first()).toBeVisible();
});
