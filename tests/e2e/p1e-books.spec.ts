import { expect, test } from '@playwright/test';

const expectedBooks = ['AI for the Kingdom', 'How to Love God', 'The Unfinished Mission'];

test('Books is a first-class published-work surface backed by real Library records', async ({ page }) => {
  await page.goto('/books/');
  await expect(page.getByRole('heading', { name: 'Books', level: 1 })).toBeVisible();
  const records = page.locator('[data-book-record]');
  await expect(records).toHaveCount(3);
  for (const title of expectedBooks) await expect(page.getByRole('heading', { name: title })).toBeVisible();

  for (let index = 0; index < await records.count(); index += 1) {
    const record = records.nth(index);
    const cover = record.locator('img');
    await expect(cover).toHaveAttribute('src', /^https:\/\/thiepn\.dev\/library\/media\/works\//);
    await expect(record.getByRole('link', { name: /Read .* in the THIEPN Library/ })).toHaveAttribute('href', /^https:\/\/thiepn\.dev\/library\/works\//);
  }
});

test('Books is represented in primary, mobile, and footer navigation', async ({ page }) => {
  await page.goto('/books/');
  const primary = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(primary.getByRole('link', { name: 'Books', exact: true })).toHaveAttribute('aria-current', 'page');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('dialog', { name: 'Navigation' }).getByRole('link', { name: 'Books', exact: true })).toHaveAttribute('href', '/books/');

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/books/');
  await expect(page.getByRole('navigation', { name: 'Footer navigation' }).getByRole('link', { name: 'Books', exact: true })).toHaveAttribute('href', '/books/');
});

test('Read discovery hands off to Books while resource-project filtering remains available', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-intent-discovery] [data-project-intent="read"]')).toHaveAttribute('href', '/books/');
  await expect(page.locator('[data-books-discovery] [data-book-record]')).toHaveCount(3);

  await page.goto('/projects/');
  await expect(page.locator('[data-intent-discovery] [data-project-intent="read"]')).toHaveAttribute('href', '/books/');
  await expect(page.getByRole('link', { name: /03 \/ Books/ })).toHaveAttribute('href', '/books/');

  await page.goto('/projects/?intent=read#archive-catalogue');
  await expect(page.locator('[data-archive-intent="read"]')).toHaveAttribute('aria-pressed', 'true');
});

test('Books reflows without horizontal overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/books/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator('[data-book-record]').first()).toBeVisible();
});
