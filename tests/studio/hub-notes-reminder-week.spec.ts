import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
const popupHtml='<html><body><button id="share">Approve Notes reminders</button><script>'+
'document.getElementById("share").addEventListener("click",()=>{'+
'const nonce=new URL(location.href).searchParams.get("hubNotes");'+
'window.opener.postMessage({type:"thiepn:notes-hub-local:v1",nonce,'+
'snapshot:{schema:"thiepn:notes-hub-local",version:1,source:"notes-local-device",'+
'generatedAt:new Date().toISOString(),activeCount:7,'+
'notes:[{id:"owner-note-1",title:"Private source note",updatedAt:new Date().toISOString(),pinned:true}],'+
'reminders:['+
'{id:"owner-static",noteId:"owner-note-1",title:"Notes-owner <coursework>",dueAt:"2027-02-10T08:30:00.000Z"},'+
'{id:"owner-next",noteId:"owner-note-1",title:"Next reading reminder",dueAt:new Date(Date.now()+36*3600000).toISOString()},'+
'{id:"owner-earlier",noteId:"owner-note-1",title:"Prior reading reminder",dueAt:new Date(Date.now()-36*3600000).toISOString()}'+
']}},location.origin);});</script></body></html>';
test('mobile Calendar week compares Notes-owned reminders without creating local events',async({page,context})=>{
 test.setTimeout(60_000);
 await page.setViewportSize({width:390,height:844});
 await context.route('**/notes/?hubNotes=*',route=>route.fulfill({
  status:200,contentType:'text/html',body:popupHtml
 }));
 await page.goto('/home/calendar/?mode=week&date=2027-02-10');
 await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
 const owner=page.locator('[data-notes-reminder-continuity]');
 await expect(owner).toContainText('Share a bounded Notes summary explicitly');
 const opening=page.waitForEvent('popup');
 await owner.locator('[data-action=connect-notes-source]').click();
 const popup=await opening;
 await popup.getByRole('button',{name:'Approve Notes reminders'}).click();
 await expect(owner).toContainText('Notes-owner <coursework>');
 await expect(owner.locator('[data-notes-reminder-day="2027-02-10"]'))
   .toContainText('Notes-owner <coursework>');
 await expect(owner).toContainText('not calendar reservations');
 await expect(page.locator('[data-planning-review]')).not.toContainText('Notes-owner <coursework>');
 await expect(owner.locator('[data-action=edit-task]')).toHaveCount(0);
 await expect(owner.locator('[data-action=review-event-time]')).toHaveCount(0);
 await owner.locator('[data-action=clear-notes-source]').click();
 await expect(owner).not.toContainText('Notes-owner <coursework>');
 const w=await page.evaluate(()=>document.documentElement.scrollWidth);
 expect(w).toBeLessThanOrEqual(390);
 await popup.close();
});
test('Today seven-day Notes reading reminders stay owner-only and clear on revoke',async({page,context})=>{
 test.setTimeout(60_000);
 await page.setViewportSize({width:1440,height:900});
 await context.route('**/notes/?hubNotes=*',route=>route.fulfill({
  status:200,contentType:'text/html',body:popupHtml
 }));
 await page.goto('/');
 await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
 // State can retain an explicit Workspace preference; request native Today.
 await page.locator('[data-action=unified-mode][data-id=today]').click();
 const owner=page.locator('[data-notes-reminder-horizon]');
 await expect(owner).toContainText('Share from Notes');
 const opening=page.waitForEvent('popup');
 await owner.locator('[data-action=connect-notes-source]').click();
 const popup=await opening;
 await popup.getByRole('button',{name:'Approve Notes reminders'}).click();
 await expect(owner).toContainText('Next reading reminder');
 await expect(owner).toContainText('Prior reading reminder');
 await expect(owner).not.toContainText('Notes-owner <coursework>'); // outside 7 days
 await expect(owner).toContainText('Notes owns every reminder');
 await expect(page.locator('[data-today-workbench] [data-action=edit-task][data-id=owner-next]')).toHaveCount(0);
 await owner.locator('[data-action=clear-notes-source]').click();
 await expect(owner).not.toContainText('Next reading reminder');
 await expect(owner).toContainText('Share from Notes');
 await popup.close();
});
