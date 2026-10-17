import { test, expect, type Page } from '@playwright/test';
test.use({serviceWorkers:'block'});
async function ready(page:Page,url='/home/calendar/?mode=week'){
  await page.goto(url);
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
}
async function addTask(page:Page,title:string){
  await page.locator('[data-action=new-task]').first().click();
  await page.getByLabel('Task',{exact:true}).fill(title);
  await page.getByLabel('Due date',{exact:true}).fill('');
  await page.locator('[data-dialog-submit]').click();
  await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
}
test('mobile reviewed week distribution updates native Hub tasks only and survives reload',async({page})=>{
  test.setTimeout(60000);
  await page.setViewportSize({width:390,height:844});
  await ready(page);
  await addTask(page,'First real task');
  await addTask(page,'Second real task');
  await addTask(page,'Third real task');
  await page.locator('[data-action=week-filter][data-id=inbox]').click();
  await expect(page.locator('[data-week-followthrough]')).toContainText('3 unfinished');
  await page.locator('[data-action=week-select-visible]').click();
  await expect(page.locator('[data-week-followthrough]')).toContainText('3 selected unfinished');
  await page.locator('[data-week-followthrough] [data-action=week-spread]').last().click();
  await expect(page.locator('[data-week-spread-review]')).toBeVisible();
  await expect(page.locator('[data-week-spread-preview]')).toContainText('due-date changes across 5 days');
  await page.locator('[data-week-spread-review] [name=confirm]').check();
  await page.locator('[data-dialog-submit]').click();
  await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await page.goto('/home/tasks/?filter=all');
  // Local-first fixtures may already contain other Hub tasks. The three selected
  // source records must each remain unique and gain reviewed due dates.
  for(const title of ['First real task','Second real task','Third real task']) {
    const original=page.locator('.ws-task-results .ws-task-entry').filter({hasText:title});
    await expect(original).toHaveCount(1);
    await expect(original).not.toContainText('Inbox');
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
test('task-owned reviewed calendar block can atomically align original task due date',async({page})=>{
  test.setTimeout(60000);
  await ready(page,'/home/tasks/?filter=all');
  await addTask(page,'Original review item');
  await page.locator('[data-action=plan-task-event]').first().click();
  await expect(page.locator('[data-task-calendar-review]')).toBeVisible();
  await page.getByLabel('Calendar date',{exact:true}).fill('2027-02-10');
  await page.getByLabel('Start time',{exact:true}).fill('09:00');
  await page.locator('[data-task-calendar-review] [name=alignDue]').check();
  await expect(page.locator('[data-task-calendar-preview]')).toContainText('move this task due date');
  await page.locator('[data-task-calendar-review] [name=confirm]').check();
  await page.locator('[data-dialog-submit]').click();
  await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await page.goto('/home/calendar/?date=2027-02-10');
  await expect(page.locator('[data-planning-review]')).toContainText('Original review item');
  await expect(page.locator('[data-planning-review]')).toContainText('Task due');
  await expect(page.locator('[data-planning-review]')).toContainText('Timed calendar blocks');
});
test('Today compares only explicitly approved Folio slots to real local Hub events',async({page,context})=>{
  test.setTimeout(60000);
  await ready(page,'/?mode=workspace');
  await page.locator('[data-action=new-event]').first().click();
  await page.getByLabel('Event',{exact:true}).fill('Hub meeting');
  await page.getByLabel('Start date',{exact:true}).fill('2027-02-10');
  await page.getByLabel('End date',{exact:true}).fill('2027-02-10');
  await page.getByLabel('Start time',{exact:true}).fill('09:00');
  await page.getByLabel('End time',{exact:true}).fill('10:00');
  await page.locator('[data-dialog-submit]').click();
  await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();
  await page.locator('[data-action=unified-mode][data-id=today]').click();
  await expect(page.locator('[data-source-today-folio]')).not.toContainText('possible timed overlap');
  await context.route('**/folio/?hubBridge=*',route=>route.fulfill({
    status:200,contentType:'text/html',body:
      '<!doctype html><html><body><button id="share">Approve Folio</button><script>'+
      'document.getElementById("share").onclick=()=>{'+
      'const nonce=new URL(location.href).searchParams.get("hubBridge");'+
      'window.opener.postMessage({type:"thiepn:folio-hub-daily:v1",nonce,'+
      'snapshot:{schema:"thiepn:folio-hub-daily",version:1,source:"folio-local-device",'+
      'generatedAt:new Date().toISOString(),date:new Date().toISOString().slice(0,10),'+
      'pendingCount:0,overdueCount:0,tasks:[],notes:[],habits:[],'+
      'events:[{id:"approved",title:"Folio appointment",kind:"event",allDay:false,'+
      'start:"2027-02-10T08:30:00.000Z",end:"2027-02-10T10:30:00.000Z"}]'+
      '}},location.origin);};</script></body></html>'
  }));
  const opening=page.waitForEvent('popup');
  await page.locator('[data-source-today-folio] [data-action=connect-folio]').click();
  const popup=await opening;
  await expect(page.locator('[data-source-today-folio]')).not.toContainText('possible timed overlap');
  await popup.getByRole('button',{name:'Approve Folio'}).click();
  await expect(page.locator('[data-source-today-folio]')).toContainText('possible timed overlap');
  await expect(page.locator('[data-source-today-folio]')).toContainText('Folio appointment');
  await page.locator('[data-source-today-folio] [data-action=disconnect-folio]').click();
  await expect(page.locator('[data-source-today-folio]')).not.toContainText('Folio appointment');
  await popup.close();
});

test('Folio owner share continues into Calendar week and optional reviewed Hub-only spread',async({page,context})=>{
 test.setTimeout(60000);
 await ready(page,'/home/calendar/?mode=week');
 await expect(page.locator('[data-folio-continuity]')).toContainText('Share a bounded Folio snapshot');
 await context.route('**/folio/?hubBridge=*',route=>route.fulfill({status:200,contentType:'text/html',body:
   '<!doctype html><html><body><button id="share">Approve Folio</button><script>'+
   'document.getElementById("share").onclick=()=>{const nonce=new URL(location.href).searchParams.get("hubBridge");'+
   'window.opener.postMessage({type:"thiepn:folio-hub-daily:v1",nonce,snapshot:{'+
   'schema:"thiepn:folio-hub-daily",version:1,source:"folio-local-device",'+
   'generatedAt:new Date().toISOString(),date:new Date().toISOString().slice(0,10),'+
   'pendingCount:1,overdueCount:0,notes:[],habits:[],tasks:[{id:"folio-one",title:"Source-owned Folio plan",'+
   'priority:"high",plannedToday:true}],events:[]}},location.origin);};</script></body></html>'
 }));
 const pop=page.waitForEvent('popup');
 await page.locator('[data-folio-continuity] [data-action=connect-folio]').click();
 const owned=await pop;
 await owned.getByRole('button',{name:'Approve Folio'}).click();
 await expect(page.locator('[data-folio-continuity]')).toContainText('Source-owned Folio plan');
 await addTask(page,'Hub original one');
 await addTask(page,'Hub original two');
 await page.locator('[data-action=week-filter][data-id=inbox]').click();
 await page.locator('[data-action=week-select-visible]').click();
 await page.locator('[data-week-followthrough] [data-action=week-spread]').last().click();
 await expect(page.locator('[data-week-spread-review] [name=includeFolio]')).toHaveCount(1);
 await page.locator('[data-week-spread-review] [name=includeFolio]').check();
 await expect(page.locator('[data-week-spread-preview]')).toContainText('Folio task hints');
 await page.locator('[data-action=close-dialog]').first().click();
 await page.locator('[data-folio-continuity] [data-action=disconnect-folio]').click();
 await expect(page.locator('[data-folio-continuity]')).not.toContainText('Source-owned Folio plan');
 await owned.close();
});
