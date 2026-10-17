import { test, expect } from '@playwright/test';

test('daily Hub summary uses original local planner commands and preserves layout editing', async ({ page }) => {
  await page.setViewportSize({width:1440,height:900});
  await page.goto('/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await expect(page.locator('[data-native-overview]')).toBeVisible();
  await expect(page.locator('[data-native-overview]')).toContainText('Sign in to Hub');
  await expect(page.locator('[data-native-overview] [data-task-toggle]')).toHaveCount(0);

  await page.locator('[data-native-overview] [data-action="brief-new-task"]').click();
  await page.getByLabel('Task', {exact:true}).fill('Review chapter nine');
  await page.locator('[data-dialog-submit]').click();
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await expect(page.locator('[data-native-overview]')).toContainText('Review chapter nine');

  await page.locator('[data-native-overview] [data-action="brief-complete-task"]').click();
  await expect(page.locator('[data-planner] [data-task-toggle]')).toBeChecked();
  await page.getByRole('button', {name:'Customize',exact:true}).click();
  await expect(page.locator('[data-native-overview]')).toHaveCount(0);
  await expect(page.locator('[data-widget-id]')).toHaveCount(6);
  await page.getByRole('button', {name:'Done',exact:true}).click();
  await expect(page.locator('[data-native-overview]')).toContainText('Review chapter nine');
  await page.reload();
  await expect(page.locator('[data-planner] [data-task-toggle]')).toBeChecked();
});

test('mobile overview projects genuine tracker logs and local note titles', async ({page}) => {
  await page.setViewportSize({width:375,height:812});
  await page.goto('/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await page.locator('[data-native-overview] [data-action="brief-capture"]').click();
  await page.getByLabel('Title',{exact:true}).fill('Reading reflections');
  await page.getByLabel('Note',{exact:true}).fill('Private source-owned Hub note.');
  await page.locator('[data-dialog-submit]').click();
  await expect(page.locator('[data-native-overview]')).toContainText('Reading reflections');

  await page.locator('[data-widget-type="tracker-summary"] [data-action="new-tracker"]').click();
  await page.getByLabel('Name',{exact:true}).fill('Reading');
  await page.locator('[data-dialog-submit]').click();
  await expect(page.locator('[data-native-overview]')).toContainText('Reading');
  await page.locator('[data-native-overview] [data-action="brief-log-tracker"]').click();
  await page.locator('[data-dialog-submit]').click();
  await expect(page.locator('[data-native-overview] .ws-brief-tracker')).toContainText('1 /');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
