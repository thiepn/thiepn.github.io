import { test, expect } from '@playwright/test';

test('actual Folio task requires explicit consent and remains read-only in Hub',async({page,context})=>{
  // Both applications are real, immutable production builds, served on one
  // ephemeral CI origin. This browser profile contains only disposable data.
  await page.goto('/home/tasks/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  const preview=page.locator('[data-folio-task-preview]');
  await expect(preview).toContainText('No Folio tasks shared');

  const folio=await context.newPage();
  await folio.goto('/folio/');
  await expect(folio.locator('#main-content')).toBeVisible();
  // Exercise Folio's actual taskService/capture path, not an IndexedDB fixture.
  const desktopAdd=folio.locator('.topbar').getByRole('button',{name:'Add',exact:true});
  const mobileAdd=folio.getByRole('button',{name:'Add task or capture'});
  if(await desktopAdd.isVisible())await desktopAdd.click();
  else await mobileAdd.click();
  await expect(folio.getByRole('dialog',{name:'Quick add'})).toBeVisible();
  await folio.locator('#quick-capture-input').fill('Stage 1A owner proof task');
  await folio.getByRole('button',{name:'Details',exact:true}).click();
  const today=await folio.evaluate(()=>{
    const d=new Date();
    return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  });
  await folio.getByLabel('Planned day').fill(today);
  await folio.getByRole('button',{name:'Add task',exact:true}).click();
  await expect(folio.getByRole('dialog',{name:'Quick add'})).toBeHidden();
  await folio.close();

  const popupEvent=page.waitForEvent('popup');
  await preview.getByRole('button',{name:'Share from Folio'}).click();
  const popup=await popupEvent;
  const consent=popup.getByRole('dialog',{name:'Share today’s Folio summary?'});
  await expect(consent).toBeVisible();
  await expect(preview).not.toContainText('Stage 1A owner proof task');
  await popup.getByRole('button',{name:'Share summary once'}).click();
  await expect(preview).toContainText('Stage 1A owner proof task');
  await expect(preview).toContainText('Showing 1 of 1 planned/due Folio tasks');
  await expect(preview).toContainText('read-only');
  await expect(preview.locator('[data-task-toggle]')).toHaveCount(0);
  await expect(preview.locator('input[type=checkbox]')).toHaveCount(0);
  await expect(page.locator('.ws-task-results')).not.toContainText('Stage 1A owner proof task');
  await expect(preview.getByRole('link',{name:'Open Folio'})).toHaveAttribute('href','/folio/?view=today');
  // The sharing interface must preserve source task authority.
  await preview.getByRole('button',{name:'Clear share'}).click();
  await expect(preview).not.toContainText('Stage 1A owner proof task');
  await popup.close();
  await expect(preview).toContainText('No Folio tasks shared');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth);
  expect(overflow,'Tasks route should not overflow horizontally').toBeLessThanOrEqual(1);
});

test('real Folio rejects a non-allowlisted same-origin opener',async({page})=>{
  await page.goto('/home/settings/');
  const event=page.waitForEvent('popup');
  await page.evaluate(()=>window.open('/folio/?hubBridge='+('a'.repeat(32)),'_blank'));
  const popup=await event;
  await popup.waitForLoadState('domcontentloaded');
  await expect(popup.getByRole('dialog',{name:'Share today’s Folio summary?'})).toHaveCount(0);
  await popup.close();
});
