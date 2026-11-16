import { test, expect } from '@playwright/test';
test.use({ serviceWorkers:'block' });

test('Tasks route presents the approved Folio summary without creating Hub task copies',async({page,context})=>{
  await context.route('**/folio/?hubBridge=*',route=>route.fulfill({
    status:200,contentType:'text/html',body:`<!doctype html><html><body>
    <button id="share">Share Folio tasks</button><script>
    document.getElementById('share').addEventListener('click',()=>{
      const nonce=new URL(location.href).searchParams.get('hubBridge');
      const date=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
      window.opener.postMessage({type:'thiepn:folio-hub-daily:v1',nonce,snapshot:{
        schema:'thiepn:folio-hub-daily',version:1,source:'folio-local-device',
        date,generatedAt:new Date().toISOString(),pendingCount:15,overdueCount:2,
        tasks:Array.from({length:12},(_,i)=>({id:'folio-task-'+i,title:'Folio task '+i,
          priority:'high',deadline:date,plannedToday:true})),
        events:[],notes:[],habits:[]
      }},location.origin);
    });</script></body></html>`
  }));
  await page.goto('/home/tasks/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  const projection=page.locator('[data-folio-task-preview]');
  await expect(projection).toContainText('No Folio tasks shared');
  const popupEvent=page.waitForEvent('popup');
  await projection.getByRole('button',{name:'Share from Folio'}).click();
  const popup=await popupEvent;
  await expect(projection).toContainText('Approve the one-time share');
  await popup.getByRole('button',{name:'Share Folio tasks'}).click();
  await expect(projection).toContainText('Showing 12 of 15 planned/due Folio tasks');
  await expect(projection).toContainText('remaining 3');
  await expect(projection).toContainText('Folio task 0');
  await expect(projection.locator('input[type="checkbox"]')).toHaveCount(0);
  await expect(projection.locator('[data-task-toggle]')).toHaveCount(0);
  await expect(page.locator('.ws-task-results')).not.toContainText('Folio task 0');
  await expect(projection.getByRole('link',{name:'Open Folio'})).toHaveAttribute('href','/folio/?view=today');
  await projection.getByRole('button',{name:'Clear share'}).click();
  await expect(projection).not.toContainText('Folio task 0');
  await popup.close();
});
