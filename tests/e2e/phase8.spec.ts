import { test, expect } from '@playwright/test';

test('flagship project page exposes the complete product-oriented detail sequence', async ({ page }) => {
  await page.goto('/project/pdf-studio/');
  await expect(page.getByRole('heading',{name:'PDF Studio',level:1})).toBeVisible();
  for(const heading of ['About this project','Key features','Project views','Project details','Related projects']){
    await expect(page.getByRole('heading',{name:heading,level:2})).toBeVisible();
  }
  await expect(page.locator('.capability-row')).toHaveCount(4);
  await expect(page.locator('.gallery-figure')).toHaveCount(3);
  await expect(page.locator('.record__related > *')).toHaveCount(4);
});

test('capability focus drives the hero through named preview states', async ({ page }) => {
  await page.goto('/project/pdf-studio/');
  const redaction=page.getByRole('button',{name:/Show Permanent redaction preview state/i});
  await redaction.focus();
  await expect(page.locator('[data-record-preview]')).toHaveAttribute('data-record-preview-variant','redact');
  await expect(page.locator('[data-record-preview-label]')).toContainText('PERMANENT REDACTION');

  await page.keyboard.press('Tab');
  const exportRow=page.getByRole('button',{name:/Show Local export preview state/i});
  await expect(exportRow).toBeFocused();
  await expect(page.locator('[data-record-preview]')).toHaveAttribute('data-record-preview-variant','export');
  await expect(page.locator('[data-record-preview-label]')).toContainText('LOCAL EXPORT');
});

test('gallery inspection opens a native dialog and restores focus on close', async ({ page }) => {
  await page.goto('/project/manuscript/');
  const opener=page.getByRole('button',{name:/Open view 1/i});
  await opener.click();
  const dialog=page.locator('[data-gallery-dialog]');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-gallery-dialog-label]')).not.toHaveText('');
  await dialog.getByRole('button',{name:/close/i}).click();
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test('non-featured projects still have rich capabilities without fake galleries', async ({ page }) => {
  await page.goto('/project/tms60/');
  await expect(page.getByRole('heading',{name:'Learning modes',level:2})).toBeVisible();
  await expect(page.locator('.capability-row')).toHaveCount(4);
  await expect(page.getByRole('heading',{name:'Project views',level:2})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Project details',level:2})).toBeVisible();
});

test('curated previous and next navigation follows project order', async ({ page }) => {
  await page.goto('/project/french-3000/');
  const nav=page.getByRole('navigation',{name:'Adjacent projects'});
  await expect(nav).toContainText('Wordfall');
  await expect(nav).toContainText('Curio');
});

test('project detail page remains reflow-safe on a compact phone', async ({ page }) => {
  await page.setViewportSize({width:320,height:740});
  await page.goto('/project/pdf-studio/');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole('heading',{name:'Key features',level:2})).toBeVisible();
});
