import { test, expect } from '@playwright/test';

test('flagship Artifact Record exposes the full five-part examination sequence', async ({ page }) => {
  await page.goto('/project/pdf-studio/');
  await expect(page.getByRole('heading',{name:'PDF Studio',level:1})).toBeVisible();
  for(const heading of ['Overview','Capabilities','Gallery','Record','Related Artifacts']){
    await expect(page.getByRole('heading',{name:heading,level:2})).toBeVisible();
  }
  await expect(page.locator('.capability-row')).toHaveCount(4);
  await expect(page.locator('.gallery-figure')).toHaveCount(3);
  await expect(page.locator('.record__related > *')).toHaveCount(4);
});

test('capability focus drives the hero into a named preview state', async ({ page }) => {
  await page.goto('/project/pdf-studio/');
  const row=page.getByRole('button',{name:/Permanent redaction preview state/i});
  await row.focus();
  await expect(page.locator('[data-record-preview]')).toHaveAttribute('data-record-preview-variant','redact');
  await expect(page.locator('[data-record-preview-label]')).toContainText('PERMANENT REDACTION');
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-record-preview]')).not.toHaveAttribute('data-record-preview-variant');
});

test('gallery inspection opens a native dialog and restores focus on close', async ({ page }) => {
  await page.goto('/project/manuscript/');
  const opener=page.getByRole('button',{name:/Inspect figure 1/i});
  await opener.click();
  const dialog=page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-gallery-dialog-label]')).toContainText('FIG.01');
  await dialog.getByRole('button',{name:/close/i}).click();
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test('non-featured records still have rich capabilities without fake galleries', async ({ page }) => {
  await page.goto('/project/tms60/');
  await expect(page.getByRole('heading',{name:'Learning Modes',level:2})).toBeVisible();
  await expect(page.locator('.capability-row')).toHaveCount(4);
  await expect(page.getByRole('heading',{name:'Gallery',level:2})).toHaveCount(0);
  await expect(page.getByRole('heading',{name:'Record',level:2})).toBeVisible();
});

test('curated previous and next navigation follows archive order', async ({ page }) => {
  await page.goto('/project/french-3000/');
  const nav=page.getByRole('navigation',{name:'Adjacent artifacts'});
  await expect(nav).toContainText('WORDFALL');
  await expect(nav).toContainText('CURIO');
});

test('Artifact Record remains reflow-safe on a compact phone', async ({ page }) => {
  await page.setViewportSize({width:320,height:740});
  await page.goto('/project/pdf-studio/');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole('heading',{name:'Capabilities',level:2})).toBeVisible();
});
