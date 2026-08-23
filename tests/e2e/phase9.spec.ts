import { test, expect } from '@playwright/test';

test('collection page explains its purpose before the relationship map', async ({ page }) => {
  await page.goto('/collection/productivity-creation/');
  await expect(page.getByRole('heading',{name:'Productivity & Creation',level:1})).toBeVisible();
  await expect(page.getByRole('heading',{name:'About this collection',level:2})).toBeVisible();
  await expect(page.getByText(/turning messy inputs into controlled outputs/i)).toBeVisible();
  await expect(page.getByRole('heading',{name:'How the projects relate',level:2})).toBeVisible();
  await expect(page.getByRole('button',{name:/Finished documents ↔ source publishing/})).toBeVisible();
});

test('large Browser Games collection maps featured anchors while preserving the complete ten-project list', async ({ page }) => {
  await page.goto('/collection/browser-games/');
  await expect(page.locator('[data-collection-node]')).toHaveCount(4);
  await expect(page.locator('[data-collection-map]')).toContainText('04 mapped / 10 total');
  await expect(page.locator('.collection-record__index .compact-artifact')).toHaveCount(10);
  await expect(page.getByRole('heading',{name:'Featured projects',level:2})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Everything in this collection',level:2})).toBeVisible();
});

test('focusing a mapped anchor updates its preview and relationship emphasis', async ({ page }) => {
  await page.goto('/collection/browser-games/');
  const voidcut=page.locator('[data-collection-node][data-project-slug="voidcut"]');
  await voidcut.focus();
  await expect(voidcut).toHaveClass(/is-active/);
  await expect(page.locator('[data-collection-preview="voidcut"]')).toBeVisible();
  await expect(page.locator('[data-collection-relation][data-relation-to="voidcut"]')).toHaveClass(/is-active/);
});

test('collection relationship language is included in Project Search', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  const input=page.locator('[data-catalogue-search-input]');
  await input.fill('social quiz play');
  await expect(page.getByText('Browser Games',{exact:true}).first()).toBeVisible();
});

test('collection relationship map reflows safely on compact mobile', async ({ page }) => {
  await page.setViewportSize({width:320,height:740});
  await page.goto('/collection/french-learning/');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator('[data-collection-node]')).toHaveCount(2);
  const display=await page.locator('.collection-map__lines').evaluate((el)=>getComputedStyle(el).display);
  expect(display).toBe('none');
});
