import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
const popupHtml='<html><body><button id="share">Approve Notes reminders</button><script>'+
'document.getElementById("share").addEventListener("click",()=>{'+
'const nonce=new URL(location.href).searchParams.get("hubNotes");'+
'window.opener.postMessage({type:"thiepn:notes-hub-local:v1",nonce,'+
'snapshot:{schema:"thiepn:notes-hub-local",version:1,source:"notes-local-device",'+
'generatedAt:new Date().toISOString(),activeCount:1,'+
'notes:[{id:"owner-note-1",title:"Private source note",updatedAt:new Date().toISOString(),pinned:true}],'+
'reminders:[{id:"owner-next",noteId:"owner-note-1",title:"Private source-only reminder",dueAt:new Date(Date.now()+36*3600000).toISOString()}]'+
'}},location.origin);});</script></body></html>';

test('Calendar and native Today no longer advertise Notes or import owner reminders',async({page})=>{
  await page.goto('/home/calendar/?mode=week');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await expect(page.locator('[data-notes-reminder-continuity]')).toHaveCount(0);
  await page.goto('/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await page.locator('[data-action=unified-mode][data-id=today]').click();
  await expect(page.locator('[data-notes-reminder-horizon]')).toHaveCount(0);
  await expect(page.locator('[data-source-today-notes]')).toHaveCount(0);
  await expect(page.locator('[data-today-workbench] [data-workbench-source-actions]')).toHaveCount(0);
});

test('legacy owner-consent reminder stays in recovery, never Hub event/task writers',async({page,context})=>{
  await page.setViewportSize({width:390,height:844});
  await context.route('**/notes/?hubNotes=*',route=>route.fulfill({
    status:200,contentType:'text/html',body:popupHtml
  }));
  await page.goto('/home/legacy/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  const panel=page.locator('[data-source-today-notes]');
  await expect(panel).toContainText('Share from Notes');
  const open=page.waitForEvent('popup');
  await panel.locator('[data-action=connect-notes-source]').click();
  const popup=await open;
  await page.evaluate(()=>window.postMessage({type:'thiepn:notes-hub-local:v1',nonce:'fake',snapshot:{}},location.origin));
  await expect(panel).not.toContainText('Private source-only reminder');
  await popup.getByRole('button',{name:'Approve Notes reminders'}).click();
  await expect(panel).toContainText('Private source-only reminder');
  await expect(page.locator('[data-planner]')).not.toContainText('Private source-only reminder');
  await expect(panel.locator('[data-action=edit-task]')).toHaveCount(0);
  await panel.locator('[data-action=clear-notes-source]').click();
  await expect(panel).not.toContainText('Private source-only reminder');
  await popup.close();
});
