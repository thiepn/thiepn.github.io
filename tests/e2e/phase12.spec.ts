import { expect, test, type Page } from '@playwright/test';

const majorRoutes = [
  '/',
  '/projects/',
  '/project/pdf-studio/',
  '/collections/',
  '/collection/browser-games/',
];

async function hasHorizontalOverflow(page: Page) {
  return await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

async function openSearch(page: Page) {
  await page.goto('/');
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K');
  const dialog = page.getByRole('dialog', { name: 'Search the portfolio' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test('major pages expose stable landmark and heading semantics', async ({ page }) => {
  for (const route of majorRoutes) {
    await page.goto(route);
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('banner')).toHaveCount(1);
    await expect(page.getByRole('contentinfo')).toHaveCount(1);
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toHaveCount(1);
  }
});

test('accessibility tree exposes the project browser hierarchy', async ({ page }) => {
  await page.goto('/projects/');
  const main = page.getByRole('main');
  const title = main.getByRole('heading', { name: 'Projects', level: 1 });
  const browser = main.getByRole('heading', { name: 'Find a project', level: 2 });
  await expect(title).toMatchAriaSnapshot(`- heading "Projects" [level=1]`);
  await expect(browser).toMatchAriaSnapshot(`- heading "Find a project" [level=2]`);
});

test('portfolio search follows combobox/listbox semantics and restores focus', async ({ page }) => {
  await page.goto('/');
  const opener = page.getByRole('link', { name: 'Search projects, collections, and books' }).first();
  await opener.focus();
  await opener.press('Enter');

  const dialog = page.getByRole('dialog', { name: 'Search the portfolio' });
  await expect(dialog).toBeVisible();
  const input = page.getByRole('combobox', { name: 'Search projects, collections, and books' });
  await expect(input).toBeFocused();
  const listbox = page.getByRole('listbox', { name: 'Portfolio search results' });
  await expect(listbox).toBeVisible();
  await expect(listbox.getByRole('option')).toHaveCount(5);

  await input.fill('pdf');
  const options = listbox.getByRole('option');
  await expect(options.first()).toBeVisible();
  await expect(options.first()).toHaveAttribute('aria-selected', 'true');
  const firstId = await options.first().getAttribute('id');
  await expect(input).toHaveAttribute('aria-activedescendant', firstId ?? '');

  await page.keyboard.press('ArrowDown');
  if (await options.count() > 1) {
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
  }

  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test('search suggestions are visible and populate the finder', async ({ page }) => {
  const dialog = await openSearch(page);
  const input = page.getByRole('combobox', { name: 'Search projects, collections, and books' });
  await dialog.getByRole('button', { name: 'Games', exact: true }).click();
  await expect(input).toHaveValue('games');
  await expect(dialog.getByRole('listbox', { name: 'Portfolio search results' }).getByRole('option').first()).toBeVisible();
});

test('search close control keeps its native keyboard activation', async ({ page }) => {
  await page.goto('/');
  const opener = page.getByRole('link', { name: 'Search projects, collections, and books' }).first();
  await opener.focus();
  await opener.press('Enter');
  const input = page.getByRole('combobox', { name: 'Search projects, collections, and books' });
  await expect(input).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  const close = page.getByRole('button', { name: 'Close portfolio search' });
  await expect(close).toBeFocused();
  await close.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Search the portfolio' })).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test('modal search keeps sequential keyboard focus inside the dialog', async ({ page }) => {
  const dialog = await openSearch(page);
  for (let index = 0; index < 14; index += 1) {
    await page.keyboard.press('Tab');
    const inside = await page.evaluate(() => {
      const active = document.activeElement;
      const modal = document.querySelector('[data-catalogue-search-dialog]');
      return Boolean(active && modal?.contains(active));
    });
    expect(inside).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
});

test('gallery dialog closes with Escape and restores the exact opener', async ({ page }) => {
  await page.goto('/project/pdf-studio/');
  const gallery = page.locator('[data-artifact-gallery]');
  await gallery.scrollIntoViewIfNeeded();
  const opener = gallery.locator('[data-gallery-open]').first();
  await expect(opener).toBeVisible();
  await opener.focus();
  await opener.press('Enter');
  const dialog = page.locator('[data-gallery-dialog]');
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test('collection relationship selection is announced without misusing aria-current', async ({ page }) => {
  await page.goto('/collection/browser-games/');
  const map = page.locator('[data-collection-map]');
  await map.scrollIntoViewIfNeeded();
  const firstNode = map.locator('[data-collection-node]').first();
  await firstNode.focus();
  await expect(firstNode).not.toHaveAttribute('aria-current', /.+/);
  await expect(map.locator('[data-collection-map-status]')).not.toHaveText('');
  const pressed = map.locator('[data-collection-relation][aria-pressed="true"]');
  expect(await pressed.count()).toBeGreaterThan(0);
});

test('keyboard-focused controls are not obscured by the sticky header', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto('/project/pdf-studio/');
  const target = page.locator('[data-gallery-open]').first();
  await expect(target).toBeVisible();
  await target.scrollIntoViewIfNeeded();
  await target.focus();
  const geometry = await page.evaluate(() => {
    const header = document.querySelector('.site-header')?.getBoundingClientRect();
    const active = (document.activeElement as HTMLElement | null)?.getBoundingClientRect();
    return { headerBottom: header?.bottom ?? 0, activeTop: active?.top ?? 9999, activeBottom: active?.bottom ?? 9999 };
  });
  expect(geometry.activeBottom).toBeGreaterThan(geometry.headerBottom);
});

test('WCAG text-spacing overrides preserve content and avoid horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/project/echoframe-last-signal/');
  await page.addStyleTag({ content: `
    p { line-height: 1.5 !important; margin-bottom: 2em !important; }
    p, li, dd, dt, a, button, label, input { letter-spacing: .12em !important; word-spacing: .16em !important; }
  ` });
  expect(await hasHorizontalOverflow(page)).toBe(false);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
});

test('320 CSS-pixel reflow retains all major route functionality', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  for (const route of majorRoutes) {
    await page.goto(route);
    expect(await hasHorizontalOverflow(page), route).toBe(false);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
  }
});

test('core button targets satisfy the project 44 CSS-pixel target', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of ['/projects/', '/project/pdf-studio/', '/collection/browser-games/']) {
    await page.goto(route);
    const controls = page.locator('button:visible, .structural-button:visible');
    const count = Math.min(await controls.count(), 40);
    for (let index = 0; index < count; index += 1) {
      const box = await controls.nth(index).boundingBox();
      if (!box) continue;
      expect(box.height, `${route} control ${index}`).toBeGreaterThanOrEqual(44);
    }
  }
});

test('reduced motion leaves project content usable and suppresses preview activation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const preview = page.locator('[data-preview-root]').first();
  if (await preview.count()) {
    await preview.hover();
    await page.waitForTimeout(350);
    await expect(preview).toHaveAttribute('data-preview-state', 'poster');
  }
  await expect(page.getByRole('heading', { name: 'Things I build.', level: 1 })).toBeVisible();
});

test('forced-colors mode preserves focus, borders, and selected states', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'Playwright forced-colors emulation is certified in Chromium.');
  await page.emulateMedia({ forcedColors: 'active' });
  await page.goto('/projects/');
  const firstCategory = page.locator('[data-archive-category]').first();
  await firstCategory.focus();
  const styles = await firstCategory.evaluate((element) => {
    const css = getComputedStyle(element);
    return { outline: css.outlineStyle, color: css.color };
  });
  expect(styles.outline).not.toBe('none');
  expect(styles.color).not.toBe('rgba(0, 0, 0, 0)');
});

test('no-JavaScript desktop keeps the complete project set and direct navigation', async ({ browser, request }) => {
  const catalogueResponse = await request.get('/catalogue.json');
  expect(catalogueResponse.ok()).toBeTruthy();
  const catalogue = await catalogueResponse.json();
  const expectedProjectCount = catalogue.projects.length;

  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto('/projects/');
  await expect(page.locator('[data-archive-controls]')).toBeHidden();
  await expect(page.locator('[data-archive-grid] [data-archive-item]')).toHaveCount(expectedProjectCount);
  await expect(page.getByRole('link', { name: 'Search projects, collections, and books' }).first()).toHaveAttribute('href', '/projects/');
  await expect(page.getByRole('link', { name: /PDF Studio/ }).first()).toBeVisible();
  await context.close();
});

test.describe('@mobile-cert mobile certification', () => {
  test('mobile menu is modal, keyboard-contained, and focus-restoring', async ({ page }) => {
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Menu' });
    await trigger.focus();
    await trigger.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Navigation' });
    await expect(dialog).toBeVisible();
    for (let index = 0; index < 10; index += 1) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const active = document.activeElement;
        const modal = document.querySelector('[data-mobile-menu-dialog]');
        return Boolean(active && modal?.contains(active));
      });
      expect(inside).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });

  test('touch interaction does not depend on hover and has no page overflow', async ({ page }) => {
    for (const route of majorRoutes) {
      await page.goto(route);
      expect(await hasHorizontalOverflow(page), route).toBe(false);
    }
    await page.goto('/');
    await expect(page.locator('[data-index-scanner]')).toBeHidden();
  });

  test('mobile no-JavaScript fallback exposes direct navigation', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:4321/');
    const fallbackNav = page.getByRole('navigation', { name: 'Mobile navigation without JavaScript' });
    await expect(fallbackNav).toBeVisible();
    await expect(fallbackNav.getByRole('link', { name: 'Projects', exact: true })).toBeVisible();
    await context.close();
  });
});