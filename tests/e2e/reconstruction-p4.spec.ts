import { expect, test } from '@playwright/test';

test('project record exposes a compact anchored record index', async ({ page }) => {
  await page.goto('/project/pdf-studio/');
  const index = page.getByRole('navigation', { name: 'On this project' });
  await expect(index).toBeVisible();
  for (const label of ['Overview', 'Capabilities', 'Details', 'Views', 'Related']) {
    await expect(index.getByRole('link', { name: new RegExp(label, 'i') })).toBeVisible();
  }
});

test('capability selection persists while hover and focus remain temporary', async ({ page }) => {
  await page.goto('/project/pdf-studio/');
  const preview = page.locator('[data-record-preview]');
  const previewLabel = page.locator('[data-record-preview-label]');
  const redaction = page.getByRole('button', { name: /Inspect Permanent redaction in the project preview/i });
  const exportRow = page.getByRole('button', { name: /Inspect Local export in the project preview/i });

  await redaction.click();
  await expect(redaction).toHaveAttribute('aria-pressed', 'true');
  await expect(redaction).toHaveClass(/is-selected/);
  await expect(preview).toHaveAttribute('data-record-preview-variant', 'redact');
  await expect(previewLabel).toContainText('PERMANENT REDACTION');
  await expect(redaction.locator('[data-capability-signal]')).toHaveText('Selected');

  await exportRow.focus();
  await expect(preview).toHaveAttribute('data-record-preview-variant', 'export');
  await page.getByRole('navigation', { name: 'On this project' }).getByRole('link', { name: /Overview/i }).focus();
  await expect(preview).toHaveAttribute('data-record-preview-variant', 'redact');
  await expect(redaction).toHaveAttribute('aria-pressed', 'true');

  await redaction.click();
  await expect(redaction).toHaveAttribute('aria-pressed', 'false');
  await expect(preview).not.toHaveAttribute('data-record-preview-variant', /.+/);
  await expect(previewLabel).toContainText('PRIMARY /');
});

test('capability selection is usable from a compact touch-sized layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/project/pdf-studio/');
  const organize = page.getByRole('button', { name: /Inspect Page organization in the project preview/i });
  await organize.click();
  await expect(organize).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-record-preview]')).toHaveAttribute('data-record-preview-variant', 'organize');
  await expect(organize.locator('[data-capability-signal]')).toHaveText('Selected');
});

test('gallery inspector traverses project views without reopening the dialog', async ({ page }) => {
  await page.goto('/project/manuscript/');
  const opener = page.getByRole('button', { name: /Inspect view 1/i });
  await opener.click();
  const dialog = page.locator('[data-gallery-dialog]');
  const position = dialog.locator('[data-gallery-dialog-position]');
  const label = dialog.locator('[data-gallery-dialog-label]');
  const firstLabel = await label.textContent();

  await expect(dialog).toBeVisible();
  await expect(position).toHaveText('01 / 03');
  await dialog.getByRole('button', { name: /Next/i }).click();
  await expect(position).toHaveText('02 / 03');
  await expect(label).not.toHaveText(firstLabel ?? '');

  await page.keyboard.press('ArrowRight');
  await expect(position).toHaveText('03 / 03');
  await expect(dialog.getByRole('button', { name: /Next/i })).toBeDisabled();
  await page.keyboard.press('ArrowLeft');
  await expect(position).toHaveText('02 / 03');

  await dialog.getByRole('button', { name: /Close/i }).click();
  await expect(opener).toBeFocused();
});

test('P4 project record remains reflow safe at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/project/pdf-studio/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole('navigation', { name: 'On this project' })).toBeVisible();
  await expect(page.locator('[data-record-preview-label]')).toContainText('PRIMARY /');
});
