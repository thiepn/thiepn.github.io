import { test, expect } from '@playwright/test';

test('Portfolio Search opens from keyboard and finds projects, books, aliases, and typos', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  const dialog=page.locator('[data-catalogue-search-dialog]');
  await expect(dialog).toBeVisible();
  const input=page.locator('[data-catalogue-search-input]');
  await input.fill('manuscipt');
  await expect(page.getByText('Manuscript',{exact:true}).first()).toBeVisible();
  await input.fill('G-003');
  await expect(page.getByText('Curio',{exact:true}).first()).toBeVisible();
  await input.fill('unfinished mission');
  await expect(page.getByText('The Unfinished Mission',{exact:true}).first()).toBeVisible();
  await expect(page.locator('[data-search-result]').filter({hasText:'The Unfinished Mission'})).toContainText('BOOK');
  await input.fill('world christianity');
  await expect(page.getByText('The Unfinished Mission',{exact:true}).first()).toBeVisible();
});

test('project category, search, sort and view persist in URL', async ({ page }) => {
  await page.goto('/projects/');
  await page.getByRole('button',{name:'Games',exact:true}).click();
  await expect(page).toHaveURL(/category=games/);
  await page.locator('[data-archive-query]').fill('typing');
  await expect(page).toHaveURL(/q=typing/);
  await expect(page.locator('[data-archive-result-count]')).toHaveText('02');
  await page.locator('[data-archive-sort]').selectOption('az');
  await expect(page).toHaveURL(/sort=az/);
  await page.getByRole('button',{name:'List',exact:true}).click();
  await expect(page).toHaveURL(/view=list/);
  await expect(page.locator('[data-archive-list]')).toBeVisible();
});

test('shared category browser applies local filter and Back restores state', async ({ page }) => {
  await page.goto('/projects/');
  await page.locator('.category-index').getByRole('link',{name:/Games/}).click();
  await expect(page).toHaveURL(/category=games/);
  await page.locator('[data-archive-grid] [data-slug="curio"] a').filter({hasText:'Curio'}).first().click();
  await expect(page).toHaveURL(/\/project\/curio\//);
  await page.goBack();
  await expect(page).toHaveURL(/category=games/);
  await expect(page.getByRole('button',{name:'Games',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('active project filters expose an explicit clear action', async ({ page }) => {
  await page.goto('/projects/?category=games&q=typing&sort=az');
  const clear = page.locator('[data-archive-clear]');
  await expect(clear).toBeVisible();
  await clear.focus();
  await expect(clear).toBeFocused();
  await clear.press('Enter');
  await expect(page).not.toHaveURL(/category=/);
  await expect(page).not.toHaveURL(/q=/);
  await expect(page).not.toHaveURL(/sort=/);
  await expect(page.getByRole('button',{name:'All',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-archive-query]')).toHaveValue('');
});

test('mobile Portfolio Search is full screen and usable with touch viewport', async ({ page }) => {
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  const menu = page.getByRole('button',{name:'Menu'});
  await menu.click();
  const navigation = page.getByRole('dialog',{name:'Navigation'});
  await expect(navigation).toBeVisible();
  await navigation.getByRole('link',{name:/Search portfolio/}).click();
  const search = page.getByRole('dialog',{name:'Search the portfolio'});
  await expect(search).toBeVisible();
  await page.locator('[data-catalogue-search-input]').fill('french');
  await expect(page.getByText('French 3000',{exact:true}).first()).toBeVisible();
  await page.locator('[data-catalogue-search-input]').fill('missions');
  await expect(page.getByText('The Unfinished Mission',{exact:true}).first()).toBeVisible();
  await page.getByRole('button',{name:'Close portfolio search'}).click();
  await expect(search).not.toBeVisible();
  await expect(menu).toBeFocused();
});