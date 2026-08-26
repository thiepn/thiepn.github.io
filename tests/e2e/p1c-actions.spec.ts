import { expect, test } from '@playwright/test';

test('homepage exposes direct semantic actions for featured projects', async ({ page }) => {
  await page.goto('/');

  const flagship = page.locator('.flagship-card').filter({ hasText: 'The Bible Challenge' });
  const flagshipAction = flagship.locator('[data-primary-project-action]');
  await expect(flagshipAction).toBeVisible();
  await expect(flagshipAction).toContainText('Play');
  await expect(flagshipAction).toHaveAttribute('href', 'https://thiepn.dev/tbc/');
  await expect(flagship.getByRole('link', { name: /Project details/ })).toBeVisible();

  const supportCards = page.locator('.support-card');
  expect(await supportCards.count()).toBeGreaterThan(0);
  expect(await supportCards.locator('[data-primary-project-action]').count()).toBeGreaterThan(0);
});

test('project archive keeps direct actions primary in grid and list views', async ({ page }) => {
  await page.goto('/projects/');

  const gridActions = page.locator('.artifact-plate [data-primary-project-action]');
  expect(await gridActions.count()).toBeGreaterThan(0);
  await expect(gridActions.first()).toBeVisible();

  await page.getByRole('button', { name: 'List', exact: true }).click();
  const tbcRow = page.locator('.archive-runtime-row').filter({ hasText: 'The Bible Challenge' });
  await expect(tbcRow).toBeVisible();
  await expect(tbcRow.locator('.archive-runtime-row__open')).toContainText('Play');
  await expect(tbcRow.locator('.archive-runtime-row__open')).toHaveAttribute('href', 'https://thiepn.dev/tbc/');
  await expect(tbcRow.getByRole('link', { name: 'The Bible Challenge', exact: true })).toHaveAttribute('href', '/project/the-bible-challenge/');
});

test('project records retain direct action plus secondary detail/source navigation', async ({ page }) => {
  await page.goto('/project/the-bible-challenge/');

  const primary = page.locator('.record__actions .structural-button');
  await expect(primary).toContainText('Play');
  await expect(primary).toHaveAttribute('href', 'https://thiepn.dev/tbc/');
  const source = page.locator('.record__actions').getByRole('link', { name: /Source/ });
  await expect(source).toBeVisible();
  await expect(source).toHaveAttribute('href', 'https://github.com/thiepn/tbc');
});
