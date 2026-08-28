import { expect, test, type Locator, type Page } from '@playwright/test';

async function expectMinimumHeight(locator: Locator, minimum = 44) {
  const count = await locator.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const box = await locator.nth(index).boundingBox();
    if (!box) continue;
    expect(box.height, `control ${index}`).toBeGreaterThanOrEqual(minimum - 0.01);
  }
}

async function expectReadableControlText(locator: Locator, minimumPx = 11) {
  const count = await locator.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    const size = await locator.nth(index).evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
    expect(size, `control ${index}`).toBeGreaterThanOrEqual(minimumPx);
  }
}

async function expectNoHorizontalOverflow(page: Page, route: string) {
  await page.goto(route);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, route).toBeLessThanOrEqual(1);
}

test('project lifecycle status exposes explicit screen-reader context', async ({ page }) => {
  await page.goto('/project/pdf-studio/');
  const status = page.locator('.status-label').first();
  await expect(status).toBeVisible();
  await expect(status).toContainText('Project status:');
  await expect(status).toContainText(/live|beta|experiment|archived/i);
});

test('project search exposes help, loading semantics, readable controls, and 44px suggestions', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+K');
  const dialog = page.getByRole('dialog', { name: 'Find a project' });
  await expect(dialog).toBeVisible();
  const input = page.getByRole('combobox', { name: 'Search projects and collections' });
  await expect(input).toHaveAttribute('aria-describedby', 'catalogue-search-help');
  const results = page.getByRole('listbox', { name: 'Project search results' });
  await expect(results).toHaveAttribute('aria-busy', 'false');
  const suggestions = dialog.locator('[data-search-suggestion]');
  await expectMinimumHeight(suggestions);
  await expectReadableControlText(suggestions);
  const close = page.getByRole('button', { name: 'Close project search' });
  await expectMinimumHeight(close);
});

test('archive filters retain 44px targets and readable labels at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/projects/');
  const controls = page.locator('[data-archive-controls] button:visible');
  await expectMinimumHeight(controls);
  await expectReadableControlText(controls);
  const firstFilter = page.locator('[data-archive-intent]').first();
  await firstFilter.focus();
  const focus = await firstFilter.evaluate((node) => ({
    style: getComputedStyle(node).outlineStyle,
    width: Number.parseFloat(getComputedStyle(node).outlineWidth),
  }));
  expect(focus.style).not.toBe('none');
  expect(focus.width).toBeGreaterThanOrEqual(3);
});

test('gallery inspector has descriptive semantics, deterministic focus, 44px controls, and live view announcements', async ({ page }) => {
  await page.goto('/project/pdf-studio/');
  const opener = page.locator('[data-gallery-open]').first();
  await opener.scrollIntoViewIfNeeded();
  await opener.click();
  const dialog = page.locator('[data-gallery-dialog]');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute('aria-describedby', 'gallery-dialog-caption');
  const close = page.getByRole('button', { name: 'Close project view inspector' });
  await expect(close).toBeFocused();
  await expectMinimumHeight(dialog.locator('button:visible'));

  const next = dialog.locator('[data-gallery-next]');
  if (!(await next.isDisabled())) {
    await next.click();
    await expect(dialog.locator('[data-gallery-dialog-status]')).toContainText('View 2 of');
  }

  await close.click();
  await expect(opener).toBeFocused();
});

test('book cover images have meaningful alternative text', async ({ page }) => {
  await page.goto('/books/');
  const covers = page.locator('.book-card__cover img');
  const count = await covers.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) {
    await expect(covers.nth(index)).toHaveAttribute('alt', /Cover of .+/);
  }
});

test('decorative project images are contained by labelled or hidden contexts', async ({ page }) => {
  await page.goto('/project/the-bible-challenge/');
  const images = page.locator('img');
  const count = await images.count();
  for (let index = 0; index < count; index += 1) {
    const semantics = await images.nth(index).evaluate((img) => {
      const alt = img.getAttribute('alt');
      const contextual = img.closest('[aria-hidden="true"],button[aria-label]');
      return { alt, contextual: Boolean(contextual) };
    });
    expect(semantics.alt).not.toBeNull();
    if (semantics.alt === '') expect(semantics.contextual).toBe(true);
  }
});

test('external GitHub navigation is explicitly named for assistive technology', async ({ page }) => {
  await page.goto('/');
  const link = page.getByRole('link', { name: 'THIEPN on GitHub, external site' }).last();
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', /github\.com\/thiepn/);
});

test('P2D typography changes preserve 200 percent reflow and 320px containment', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 900 });
  for (const route of ['/', '/projects/', '/books/', '/project/pdf-studio/']) {
    await expectNoHorizontalOverflow(page, route);
  }

  await page.setViewportSize({ width: 320, height: 900 });
  for (const route of ['/', '/projects/', '/books/', '/project/pdf-studio/']) {
    await expectNoHorizontalOverflow(page, route);
  }
});

test('forced colors preserves selected archive state and focus indication', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Forced-colors emulation is certified in Chromium.');
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/projects/');
  const selected = page.locator('[data-archive-intent][aria-pressed="true"]').first();
  await selected.focus();
  const styles = await selected.evaluate((node) => ({
    outlineStyle: getComputedStyle(node).outlineStyle,
    outlineWidth: Number.parseFloat(getComputedStyle(node).outlineWidth),
  }));
  expect(styles.outlineStyle).not.toBe('none');
  expect(styles.outlineWidth).toBeGreaterThanOrEqual(3);
});
