import { test, expect } from '@playwright/test';
test('H5 scopes filter reviewed actions and preserve keyboard and reload state', async ({ page }) => {
  await page.goto('/search/');
  await expect(page.getByRole('tab', { name: 'Apps', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Apps', exact: true }).focus(); await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Actions', exact: true })).toBeFocused();
  await page.getByLabel('Action or task').fill('checklist');
  await expect(page.locator('[data-search-action]:visible')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'New checklist', exact: true })).toHaveAttribute('href', 'https://thiepn.dev/notes/?capture=checklist');
  await expect(page).toHaveURL(/scope=actions&q=checklist/); await page.reload();
  await expect(page.getByLabel('Action or task')).toHaveValue('checklist');
  await page.getByLabel('Action or task').fill('zz-no-match'); await expect(page.locator('[data-action-empty]')).toBeVisible();
  await page.keyboard.press('Escape'); await expect(page.getByRole('tab', { name: 'Apps', exact: true })).toBeFocused();
  await expect(page.locator('[data-portal-search-slug]:visible')).toHaveCount(27);
});
test('H5 resource URLs are scrubbed without collecting or sending private queries', async ({ page }) => {
  const requests: string[] = []; page.on('request', r => requests.push(r.url()));
  await page.goto('/search/?scope=resources&q=fictional-private-secret');
  await expect(page).toHaveURL(/\/search\/\?scope=resources$/);
  await expect(page.locator('[data-portal-query]')).toBeHidden();
  await expect(page.locator('[data-portal-query]')).toHaveValue('');
  await expect(page.getByRole('heading', { name: 'Private resource search is not connected yet' })).toBeVisible();
  await expect(page.locator('[data-search-panel="resources"]')).toContainText('No private sources have been searched');
  expect(requests.filter(url => /fictional-private-secret/.test(url))).toHaveLength(1); // Only the incoming document URL; cannot undo its transmission.
  expect(requests.some(url => /hub\/(search|inbox)|rest\/v1/.test(url))).toBe(false);
  expect(await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }))).not.toContain('fictional-private-secret');
  await page.getByRole('tab', { name: 'My resources' }).focus(); await page.keyboard.press('Home');
  await expect(page.getByRole('tab', { name: 'Apps', exact: true })).toBeFocused(); await expect(page.locator('[data-portal-query]')).toHaveValue('');
});
test('H5 Inbox is reachable without badges, distinguishes unavailable coverage and masks by keyboard', async ({ page }) => {
  const requests: string[] = []; page.on('request', r => requests.push(r.url()));
  await page.goto('/inbox/');
  await expect(page.getByRole('heading', { name: 'Inbox is not connected yet' })).toBeVisible();
  await expect(page.locator('[data-inbox-content]')).toContainText('This does not mean');
  await expect(page.locator('[data-inbox-items]')).toBeEmpty();
  await expect(page.locator('.portal-inbox-footer')).toContainText('No unread total is available');
  await expect(page.getByRole('link', { name: 'Inbox', exact: true }).filter({ visible: true })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: 'Hide Inbox' }).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-inbox-content]')).toBeHidden(); await expect(page.locator('[data-hub-account]')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Show Inbox' })).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.locator('[data-inbox-content]')).toBeVisible();
  expect(requests.some(url => /hub\/(search|inbox)|rest\/v1/.test(url))).toBe(false);
});
test('H5 public directory and Inbox owner links work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false }); const page = await context.newPage();
  await page.goto('http://127.0.0.1:4321/search/'); await expect(page.locator('[data-portal-search-slug]:visible')).toHaveCount(27);
  await expect(page.getByRole('tablist')).toBeHidden(); await page.goto('http://127.0.0.1:4321/inbox/');
  await expect(page.getByRole('link', { name: 'Open Notes', exact: true })).toHaveAttribute('href', 'https://thiepn.dev/notes/');
  await expect(page.getByRole('button', { name: 'Hide Inbox' })).toBeHidden(); await context.close();
});
for (const [width, theme, zoom] of [[320, 'light', false], [1440, 'dark', false], [320, 'dark', true]] as const) test(`H5 Search and Inbox accessibility ${width} ${theme} text200=${zoom}`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
  for (const route of ['/search/', '/inbox/']) {
    await page.goto(route); if (zoom) await page.addStyleTag({ content: 'html { font-size:200%!important; }' });
    await page.addScriptTag({ path: process.env.AXE_PATH || '/tmp/audit-tools/node_modules/axe-core/axe.min.js' });
    const audit = async () => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      expect(await page.evaluate(async () => (await (window as any).axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } })).violations.map((v: any) => ({ id: v.id, nodes: v.nodes.map((n: any) => n.target) })))).toEqual([]);
    };
    await audit();
    if (route === '/search/') for (const name of ['Actions', 'My resources']) { await page.getByRole('tab', { name, exact: true }).click(); await audit(); }
    else { await page.getByRole('button', { name: 'Hide Inbox' }).click(); await audit(); }
    await page.screenshot({ path: `.cache/h5-${route.slice(1,-1)}-${width}-${theme}-${zoom}.png`, fullPage: false });
  }
});
