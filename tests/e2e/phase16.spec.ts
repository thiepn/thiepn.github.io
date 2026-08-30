import { expect, test } from '@playwright/test';

test('Projects presents the full directory before guided discovery layers', async ({ page }) => {
  await page.goto('/projects/');

  const order = await page.evaluate(() => {
    const directory = document.querySelector('.projects-page__browser');
    const browseModel = document.querySelector('[data-portfolio-browse-model]');
    const intents = document.querySelector('[data-intent-discovery]');
    const categories = document.querySelector('.projects-page__types');
    if (!directory || !browseModel || !intents || !categories) return null;
    const before = (first: Element, second: Element) => Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
    return {
      directoryBeforeBrowseModel: before(directory, browseModel),
      directoryBeforeIntents: before(directory, intents),
      directoryBeforeCategories: before(directory, categories),
    };
  });

  expect(order).toEqual({
    directoryBeforeBrowseModel: true,
    directoryBeforeIntents: true,
    directoryBeforeCategories: true,
  });
  await expect(page.getByRole('heading', { name: 'Find a project', level: 2 })).toBeVisible();
  await expect(page.locator('[data-archive-controls]')).toBeVisible();
});

test('portfolio search remains visible at the compact desktop/tablet boundary', async ({ page }) => {
  await page.setViewportSize({ width: 761, height: 900 });
  await page.goto('/');

  const search = page.locator('.site-header__search');
  await expect(search).toBeVisible();
  await expect(page.getByRole('button', { name: 'Menu' })).toBeHidden();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await search.click();
  const dialog = page.getByRole('dialog', { name: 'Search the portfolio' });
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: 'Close portfolio search' }).click();
  await expect(dialog).not.toBeVisible();
});

test('compact tablet switches to the mobile navigation without losing search', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 900 });
  await page.goto('/');

  await expect(page.locator('.site-header__search')).toBeHidden();
  const menu = page.getByRole('button', { name: 'Menu' });
  await expect(menu).toBeVisible();
  await menu.click();

  const navigation = page.getByRole('dialog', { name: 'Navigation' });
  await expect(navigation).toBeVisible();
  const search = navigation.getByRole('link', { name: /Search portfolio/ });
  await expect(search).toBeVisible();
  await search.click();

  const dialog = page.getByRole('dialog', { name: 'Search the portfolio' });
  await expect(dialog).toBeVisible();
  await page.locator('[data-catalogue-search-input]').fill('missions');
  await expect(page.getByText('The Unfinished Mission', { exact: true }).first()).toBeVisible();
});

test('collection records present projects before editorial taxonomy explanation', async ({ page }) => {
  await page.goto('/collection/productivity-creation/');

  const order = await page.evaluate(() => {
    const featured = document.querySelector('#featured');
    const directory = document.querySelector('#directory');
    const about = document.querySelector('#about');
    const position = document.querySelector('#position');
    if (!directory || !about || !position) return null;
    const before = (first: Element, second: Element) => Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
    return {
      featuredBeforeAbout: featured ? before(featured, about) : true,
      directoryBeforeAbout: before(directory, about),
      directoryBeforePosition: before(directory, position),
    };
  });

  expect(order).toEqual({
    featuredBeforeAbout: true,
    directoryBeforeAbout: true,
    directoryBeforePosition: true,
  });

  const index = page.getByRole('navigation', { name: 'On this collection' });
  const links = index.getByRole('link');
  await expect(links.first()).toHaveAttribute('href', '#featured');
  await expect(links.nth(1)).toHaveAttribute('href', '#directory');
  await expect(page.getByRole('heading', { name: 'Everything in this collection', level: 2 })).toBeVisible();
  await expect(page.locator('[data-collection-classification]')).toBeVisible();
});
