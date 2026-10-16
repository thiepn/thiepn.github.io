import {test,expect} from '@playwright/test';
test('tracker goals and log corrections preserve the original measurement history',async({page})=>{
 await page.goto('/home/trackers/');await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
 await page.locator('[data-action=new-tracker]').first().click();
 await page.getByLabel('Name',{exact:true}).fill('Reading minutes');await page.getByLabel('Track',{exact:true}).selectOption('duration');
 await page.getByLabel('Unit',{exact:true}).fill('minutes');await page.getByLabel('Goal',{exact:true}).fill('60');
 await page.locator('[data-dialog-submit]').click();await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();
 const tracker=page.locator('.ws-surface').filter({has:page.getByRole('heading',{name:'Reading minutes',exact:true})});
 await tracker.locator('[data-action=log-tracker]').click();await page.getByLabel('Duration (minutes)',{exact:true}).fill('30');
 await page.locator('[data-dialog-submit]').click();await expect(tracker).toContainText('30 / 60 minutes');
 await tracker.locator('[data-action=edit-tracker]').click();await expect(page.getByLabel('Track',{exact:true})).toBeDisabled();
 const unit=page.getByLabel('Unit',{exact:true});await expect(unit).toHaveAttribute('readonly','');
 // The command also protects history if a stale or modified form changes its unit.
 await unit.evaluate((input:HTMLInputElement)=>{input.readOnly=false;});await unit.fill('hours');await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-dialog-error]')).toContainText('recorded history');await expect(tracker).toContainText('30 / 60 minutes');
 await unit.fill('minutes');await page.getByLabel('Goal',{exact:true}).fill('120');await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();await expect(tracker).toContainText('30 / 120 minutes');
 await tracker.locator('[data-action=edit-log]').click();await page.getByLabel('Duration (minutes)',{exact:true}).fill('15');await page.locator('[data-dialog-submit]').click();
 await expect(tracker).toContainText('15 / 120 minutes');await expect(tracker.locator('[data-action=edit-log]')).toHaveCount(1);
 await page.reload();await expect(tracker).toContainText('15 / 120 minutes');await expect(tracker.locator('[data-action=edit-log]')).toHaveCount(1);
});
