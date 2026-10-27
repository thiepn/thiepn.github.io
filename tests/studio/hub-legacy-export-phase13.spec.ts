import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
const folio=()=>({format:'folio-backup',version:24,exportedAt:'2026-10-26T10:00:00Z',
 data:Object.fromEntries(['tasks','projects','habits','habitEntries','timeBlocks','dailyPlans','dailyPlanItems',
 'focusSessions','recurringSeries','settings','importBatches','reviewRecords','reminders','reminderOccurrences',
 'folders','lists','sections','tags','notes','attachments','habitGroups','habitTemplates'].map(k=>[k,[]])) as Record<string,unknown[]>});
const notes=()=>({format:'thiepn.notes.backup',formatVersion:2,databaseVersion:3,
 exportedAt:Date.parse('2026-10-26T10:00:00Z'),data:{notes:[],checklistItems:[],labels:[],noteLabels:[],
 attachments:[],reminders:[],revisions:[],settings:[]}});
for(const width of [390,1440]){
 test('legacy export preflight is local-only, nonwriting and private-title-free '+width,async({page})=>{
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto('/home/legacy/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  const original=folio();original.data.tasks=[{id:'historical-folio-task',title:'PRIVATE FOLIO TASK'}];
  const bytes=Buffer.from(JSON.stringify(original));
  await page.locator('[data-legacy-backup-file]').setInputFiles({name:'original-folio.json',mimeType:'application/json',buffer:bytes});
  const preview=page.locator('[data-owner-export-result]');
  await expect(preview).toContainText('Folio export');
  await expect(preview).toContainText('tasks: 1');
  await expect(preview).not.toContainText('PRIVATE FOLIO TASK');
  await expect(preview).toContainText('Source authenticity not verified');
  const cases=page.locator('[data-original-owner-choice]');
  await expect(cases).toHaveCount(1);
  await cases.first().selectOption('KEEP_SEPARATE');
  await expect(page.locator('[data-owner-casework-receipt]')).toContainText('1 reviewed');
  await expect(page.locator('[data-owner-casework-receipt]')).toContainText('Migration blocked');
  await expect(preview).not.toContainText('PRIVATE FOLIO TASK');
  expect(await page.evaluate(()=>[...Object.keys(localStorage)].filter(x=>x.includes('legacy-backup-file')))).toEqual([]);
  await page.reload();
  await expect(page.locator('[data-owner-export-result]')).toHaveCount(0);
 });
}
test('malformed original Notes backup fails closed; does not replace earlier Hub notes',async({page})=>{
 await page.goto('/home/legacy/');
 await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
 const candidate=notes();candidate.data.notes=[{id:'note-a',title:'Private title'}] as never[];
 candidate.data.reminders=[{id:'rem-a',noteId:'deleted-source',title:'Private reminder'}] as never[];
 await page.locator('[data-legacy-backup-file]').setInputFiles({
  name:'invalid-notes.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(candidate))
 });
 await expect(page.locator('[data-legacy-backup-status]')).toContainText('missing original note');
 await expect(page.locator('[data-owner-export-result]')).toHaveCount(0);
 await expect(page.locator('[data-legacy-backup-status]')).not.toContainText('Private reminder');
 await page.locator('[data-legacy-backup-file]').setInputFiles({
  name:'wrong-notes.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'not-notes',data:{}}))
 });
 await expect(page.locator('[data-legacy-backup-status]')).toContainText('Unsupported owner backup');
 await expect(page.locator('[data-owner-export-result]')).toHaveCount(0);
});

test('private original-owner casework is removed from the DOM on Hub privacy lock',async({page})=>{
 await page.goto('/home/legacy/');
 await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
 const exportFile=folio();exportFile.data.notes=[{id:'source-private-id-16',title:'Hidden original title'}];
 await page.locator('[data-legacy-backup-file]').setInputFiles({
  name:'source-owner.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exportFile))
 });
 await expect(page.locator('[data-original-owner-choice]')).toHaveCount(1);
 await expect(page.locator('[data-owner-casework]')).toContainText('source-private-id-16');
 await page.locator('[data-original-owner-choice]').selectOption('REVIEW_SOURCE');
 await expect(page.locator('[data-owner-casework-receipt]')).toContainText('1 reviewed');
 await page.locator('.ws-topbar [data-action=account]').click();
 await expect(page.locator('[data-account-dialog]')).toBeVisible();
 await page.locator('[data-account-dialog] [data-connection-privacy]').click();
 await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
 await expect(page.locator('[data-legacy-backup-result]')).not.toContainText('source-private-id-16');
 await expect(page.locator('[data-legacy-backup-file]')).toHaveValue('');
});

test('85 original Folio records remain reviewable across page changes without persistent choices',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/home/legacy/');
 await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
 const source=folio();
 source.data.tasks=Array.from({length:85},(_,i)=>({id:'folio-original-'+String(i).padStart(3,'0'),title:'PRIVATE CASE TITLE '+i}));
 await page.locator('[data-legacy-backup-file]').setInputFiles({
  name:'many-original-folio.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))
 });
 await expect(page.locator('[data-original-owner-choice]')).toHaveCount(80);
 await expect(page.locator('[data-owner-casework]')).toContainText('Records 1–80 of 85');
 await page.locator('[data-original-owner-choice]').first().selectOption('KEEP_SEPARATE');
 await expect(page.locator('[data-owner-casework-receipt]')).toContainText('1 reviewed');
 await page.locator('[data-action=original-owner-page-next]').click();
 await expect(page.locator('[data-original-owner-choice]')).toHaveCount(5);
 await expect(page.locator('[data-owner-casework]')).toContainText('folio-original-084');
 await expect(page.locator('[data-owner-casework]')).not.toContainText('PRIVATE CASE TITLE');
 await expect(page.locator('[data-owner-casework-receipt]')).toContainText('1 reviewed');
 await page.locator('[data-original-owner-choice]').last().selectOption('REVIEW_SOURCE');
 await expect(page.locator('[data-owner-casework-receipt]')).toContainText('2 reviewed');
 await page.locator('[data-action=original-owner-page-prev]').click();
 await expect(page.locator('[data-original-owner-choice]').first()).toHaveValue('KEEP_SEPARATE');
 await expect(page.locator('[data-owner-casework-receipt]')).toContainText('2 reviewed');
 expect(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.includes('folio-original-084')))).toBe(false);
 await page.locator('.ws-topbar [data-action=account]').click();
 await page.locator('[data-account-dialog] [data-connection-privacy]').click();
 await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
 await expect(page.locator('[data-legacy-backup-result]')).not.toContainText('folio-original-084');
 await page.reload();
 await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
});


for (const width of [320,390,1440]) {
 test('163 original Folio cases preserve cross-page choices and private IDs on '+width,async({page})=>{
  test.setTimeout(60_000);
  await page.setViewportSize({width,height:width===320?720:width===390?844:900});
  await page.goto('/home/legacy/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  const source=folio();
  source.data.tasks=Array.from({length:163},(_,i)=>({
    id:'original-owner-'+String(i).padStart(3,'0'),
    title:'PRIVATE SOURCE '+i
  }));
  await page.locator('[data-legacy-backup-file]').setInputFiles({
   name:'163-source-records.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify(source))
  });
  await expect(page.locator('[data-original-owner-choice]')).toHaveCount(80);
  await page.locator('[data-original-owner-choice]').first().selectOption('KEEP_SEPARATE');
  await page.locator('[data-action=original-owner-next-unreviewed]').click();
  await expect(page.locator('[data-original-owner-choice]').nth(1)).toBeFocused();
  await page.locator('[data-action=original-owner-page-next]').click();
  await expect(page.locator('[data-original-owner-choice]')).toHaveCount(80);
  await page.locator('[data-original-owner-choice]').first().selectOption('REVIEW_HUB');
  await page.locator('[data-action=original-owner-page-next]').click();
  await expect(page.locator('[data-original-owner-choice]')).toHaveCount(3);
  await page.locator('[data-original-owner-choice]').last().selectOption('DEFER');
  await expect(page.locator('[data-owner-casework-receipt]')).toContainText('3 reviewed');
  await page.locator('[data-action=original-owner-page-prev]').click();
  await expect(page.locator('[data-original-owner-choice]').first()).toHaveValue('REVIEW_HUB');
  await page.locator('[data-action=original-owner-page-prev]').click();
  await expect(page.locator('[data-original-owner-choice]').first()).toHaveValue('KEEP_SEPARATE');
  await expect(page.locator('[data-owner-casework-receipt]')).toContainText('3 reviewed');
  await expect(page.locator('[data-owner-casework]')).not.toContainText('PRIVATE SOURCE');
  const layout=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(layout.scroll).toBeLessThanOrEqual(layout.width);
  await page.locator('.ws-topbar [data-action=account]').click();
  await page.locator('[data-account-dialog] [data-connection-privacy]').click();
  await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
  await expect(page.locator('[data-legacy-backup-result]')).not.toContainText('original-owner-000');
  await page.reload();
  await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
 });
}
test('older asynchronous Folio preview cannot overwrite newer source-owner decisions',async({page})=>{
 await page.addInitScript(()=>{
  const original=File.prototype.arrayBuffer;
  File.prototype.arrayBuffer=async function(){
    if(this.name==='slow-original.json')await new Promise(resolve=>setTimeout(resolve,700));
    return original.call(this);
  };
 });
 await page.goto('/home/legacy/');
 await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
 const slow=folio();slow.data.tasks=[{id:'OLD-OWNER-PROVENANCE',title:'Private old'}];
 const current=folio();current.data.tasks=[{id:'NEW-OWNER-PROVENANCE',title:'Private current'}];
 const input=page.locator('[data-legacy-backup-file]');
 await input.setInputFiles({name:'slow-original.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(slow))});
 await input.setInputFiles({name:'current-original.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(current))});
 await expect(page.locator('[data-owner-casework]')).toContainText('NEW-OWNER-PROVENANCE');
 await page.waitForTimeout(800); // allows the deliberately delayed prior byte read to settle
 await expect(page.locator('[data-owner-casework]')).not.toContainText('OLD-OWNER-PROVENANCE');
 await page.locator('[data-original-owner-choice]').selectOption('KEEP_SEPARATE');
 await expect(page.locator('[data-owner-casework-receipt]')).toContainText('1 reviewed');
 await expect(page.locator('[data-legacy-backup-status]')).toContainText('no migration was performed');
});
