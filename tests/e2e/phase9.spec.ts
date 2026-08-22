import { test, expect } from '@playwright/test';

test('collection page explains its purpose before the relationship map', async ({ page }) => {
  await page.goto('/collection/productivity-creation/');
  await expect(page.getByRole('heading',{name:'Productivity & Creation',level:1})).toBeVisible();
  await expect(page.getByRole('heading',{name:'About this collection',level:2})).toBeVisible();
  await expect(page.getByText(/turning messy inputs into controlled outputs/i)).toBeVisible();
  await expect(page.getByRole('heading',{name:'How the projects relate',level:2})).toBeVisible();
  await expect(page.getByText('Finished documents ↔ source publishing',{exact:true})).toBeVisible();
});

test('large Browser Games collection uses a relationship map plus the complete ten-project list', async ({ page }) => {
  await page.goto('/collection/browser-games/');
  await expect(page.locator('[data-collection-node]')).toHaveCount(6);
  await expect(page.locator('.collection-record__index .compact-artifact')).toHaveCount(10);
  await expect(page.getByRole('heading',{name:'Featured projects',level:2})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Everything in this collection',level:2})).toBeVisible();
});

test('focusing a map node updates the selected project preview and relationship emphasis', async ({ page }) => {
  await page.goto('/collection/browser-games/');
  const curio=page.locator('[data-collection-node][data-project-slug="curio"]');
  await curio.focus();
  await expect(curio).toHaveClass(/is-active/);
  await expect(page.locator('[data-collection-preview="curio"]')).toBeVisible();
  await expect(page.locator('[data-collection-relation][data-relation-from="curio"]')).toHaveClass(/is-active/);
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
  await expect(page.locator('[data-collection-node]')).toHaveCount(3);
  const display=await page.locator('.collection-map__lines').evaluate((el)=>getComputedStyle(el).display);
  expect(display).toBe('none');
});
