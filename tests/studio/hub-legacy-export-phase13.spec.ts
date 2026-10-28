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

for(const width of [320,390]){
 test('filtered 163-case mobile source review retains unfiltered selections and privacy '+width,async({page})=>{
  test.setTimeout(60_000);
  await page.setViewportSize({width,height:width===320?720:844});
  await page.goto('/home/legacy/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  const source=folio();
  source.data.tasks=Array.from({length:163},(_,i)=>({id:'filtered-folio-'+String(i).padStart(3,'0'),title:'PRIVATE FILTERED TITLE '+i}));
  await page.locator('[data-legacy-backup-file]').setInputFiles({
   name:'filtered-original.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))
  });
  const filter=page.locator('[data-original-owner-filter]');
  await expect(filter).toHaveValue('ALL');
  await page.locator('[data-original-owner-choice]').first().selectOption('REVIEW_SOURCE');
  await filter.selectOption('ID_COLLISION');
  await expect(page.locator('[data-original-owner-choice]')).toHaveCount(0);
  await expect(page.locator('[data-action=original-owner-page-keep]')).toBeDisabled();
  await expect(page.locator('[data-owner-casework]')).toContainText('No original cases match');
  await filter.selectOption('SOURCE_ONLY');
  await expect(page.locator('[data-original-owner-choice]')).toHaveCount(80);
  await expect(page.locator('[data-original-owner-choice]').first()).toHaveValue('REVIEW_SOURCE');
  await page.locator('[data-action=original-owner-page-keep]').click();
  await expect(page.locator('[data-owner-casework-receipt]')).toContainText('80 reviewed');
  await page.locator('[data-action=original-owner-page-next]').click();
  await expect(page.locator('[data-original-owner-choice]')).toHaveCount(80);
  await page.locator('[data-action=original-owner-page-next]').click();
  await expect(page.locator('[data-original-owner-choice]')).toHaveCount(3);
  await page.locator('[data-action=original-owner-page-keep]').click();
  await expect(page.locator('[data-owner-casework-receipt]')).toContainText('83 reviewed');
  await filter.selectOption('ALL');
  await expect(page.locator('[data-owner-casework-receipt]')).toContainText('83 reviewed');
  await expect(page.locator('[data-owner-casework]')).not.toContainText('PRIVATE FILTERED TITLE');
  const dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
  expect(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.includes('filtered-folio-')))).toBe(false);
  await page.locator('.ws-topbar [data-action=account]').click();
  await page.locator('[data-account-dialog] [data-connection-privacy]').click();
  await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
 });
}

for(const width of [320,390,1440]){
 test('Phase 25 owner decision queues stay private, independent and mobile-friendly '+width,async({page})=>{
  test.setTimeout(70_000);
  await page.setViewportSize({width,height:width===320?720:width===390?844:900});
  await page.goto('/home/legacy/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  const original=folio();
  original.data.tasks=Array.from({length:163},(_,i)=>({id:'original-phase25-'+String(i).padStart(3,'0'),title:'SECRET SOURCE TITLE '+i}));
  await page.locator('[data-legacy-backup-file]').setInputFiles({
   name:'original-phase25.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(original))
  });
  const review=page.locator('[data-original-owner-review-filter]'),status=page.locator('[data-original-owner-filter]');
  await expect(review).toHaveValue('ALL');
  await page.locator('[data-original-owner-choice]').first().selectOption('DEFER');
  await review.selectOption('UNREVIEWED');
  await expect(page.locator('[data-original-owner-choice]')).toHaveCount(80);
  await expect(page.locator('[data-owner-casework]')).toContainText('162 matching original records');
  await page.locator('[data-action=original-owner-page-keep]').click();
  await expect(page.locator('[data-owner-casework]')).toContainText('82 matching original records');
  await expect(page.locator('[data-owner-casework-receipt]')).toContainText('81 reviewed');
  await review.selectOption('DEFER');
  await expect(page.locator('[data-original-owner-choice]')).toHaveCount(1);
  await expect(page.locator('[data-original-owner-choice]')).toHaveValue('DEFER');
  await status.selectOption('ID_COLLISION');
  await expect(page.locator('[data-original-owner-choice]')).toHaveCount(0);
  await status.selectOption('ALL');
  await expect(page.locator('[data-original-owner-choice]')).toHaveCount(1);
  await page.locator('[data-original-owner-choice]').selectOption('REVIEW_HUB');
  await expect(page.locator('[data-original-owner-choice]')).toHaveCount(0);
  await review.selectOption('REVIEW_HUB');
  await expect(page.locator('[data-original-owner-choice]')).toHaveValue('REVIEW_HUB');
  await review.selectOption('UNREVIEWED');
  await page.locator('[data-action=original-owner-page-keep]').click();
  await expect(page.locator('[data-owner-casework]')).not.toContainText('SECRET SOURCE TITLE');
  const metrics=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(metrics.scroll).toBeLessThanOrEqual(metrics.width);
  expect(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.includes('original-phase25-')))).toBe(false);
  await page.locator('.ws-topbar [data-action=account]').click();
  await page.locator('[data-account-dialog] [data-connection-privacy]').click();
  await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
 });
}

for(const width of [320,390,1440]){
 test('Phase 26 selective 163-source marks survive pagination but not privacy or reimport '+width,async({page})=>{
  test.setTimeout(80_000);
  await page.setViewportSize({width,height:width===320?720:width===390?844:900});
  await page.goto('/home/legacy/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  const source=folio();
  source.data.tasks=Array.from({length:163},(_,i)=>({id:'phase26-source-'+String(i).padStart(3,'0'),title:'SECRET SOURCE TITLE '+i}));
  const input=page.locator('[data-legacy-backup-file]');
  await input.setInputFiles({name:'original-folio-163.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
  await expect(page.locator('[data-original-owner-mark]')).toHaveCount(80);
  await page.locator('[data-original-owner-choice]').first().selectOption('DEFER');
  await page.locator('[data-action=original-owner-mark-visible]').click();
  await expect(page.locator('[data-owner-casework]')).toContainText('80 marked across pages');
  await page.locator('[data-action=original-owner-page-next]').click();
  await expect(page.locator('[data-original-owner-mark]')).toHaveCount(80);
  await page.locator('[data-original-owner-mark]').first().check();
  await page.locator('[data-action=original-owner-page-next]').click();
  await expect(page.locator('[data-original-owner-mark]')).toHaveCount(3);
  await page.locator('[data-action=original-owner-mark-visible]').click();
  await expect(page.locator('[data-owner-casework]')).toContainText('84 marked across pages');
  await page.locator('[data-action=original-owner-marked-keep]').click();
  await expect(page.locator('[data-owner-casework-receipt]')).toContainText('84 reviewed');
  await page.locator('[data-action=original-owner-page-prev]').click();
  await page.locator('[data-action=original-owner-page-prev]').click();
  await expect(page.locator('[data-original-owner-choice]').first()).toHaveValue('KEEP_SEPARATE');
  await page.locator('[data-action=original-owner-unmark-visible]').click();
  await expect(page.locator('[data-owner-casework]')).toContainText('4 marked across pages');
  await page.locator('[data-action=original-owner-marked-clear]').click();
  await expect(page.locator('[data-owner-casework-receipt]')).toContainText('80 reviewed');
  await expect(page.locator('[data-original-owner-choice]').first()).toHaveValue('KEEP_SEPARATE');
  await page.locator('[data-action=original-owner-marked-reset]').click();
  await expect(page.locator('[data-owner-casework]')).toContainText('0 marked across pages');
  await expect(page.locator('[data-owner-casework]')).not.toContainText('SECRET SOURCE TITLE');
  const dims=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth}));
  expect(dims.s).toBeLessThanOrEqual(dims.w);
  expect(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.includes('phase26-source-')))).toBe(false);
  await page.locator('[data-original-owner-mark]').nth(1).check();
  await expect(page.locator('[data-owner-casework]')).toContainText('1 marked across pages');
  const next=folio();next.data.tasks=[{id:'replacement-only',title:'SECRET REPLACED SOURCE'}];
  await input.setInputFiles({name:'different-owner.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(next))});
  await expect(page.locator('[data-owner-casework]')).toContainText('0 marked across pages');
  await expect(page.locator('[data-owner-casework]')).not.toContainText('phase26-source-000');
  await page.locator('.ws-topbar [data-action=account]').click();
  await page.locator('[data-account-dialog] [data-connection-privacy]').click();
  await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
 });
}

for(const width of [320,390,1440]){
 test('Phase 27 stable physical taps and marked-only source review '+width,async({page})=>{
  test.setTimeout(90_000);
  await page.setViewportSize({width,height:width===320?720:width===390?844:900});
  await page.goto('/home/legacy/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  const source=folio();
  source.data.tasks=Array.from({length:163},(_,i)=>({id:'phase27-source-'+String(i).padStart(3,'0'),title:'PRIVATE PHASE27 TITLE '+i}));
  const file=page.locator('[data-legacy-backup-file]');
  await file.setInputFiles({name:'phase27-original.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
  await expect(page.locator('[data-original-owner-mark]')).toHaveCount(80);
  await page.locator('[data-action=original-owner-page-next]').click();
  await expect(page.locator('[data-original-owner-mark]')).toHaveCount(80);
  const first=page.locator('[data-original-owner-mark]').first();
  await first.check(); // actual physical pointer: no JS force or synthetic change
  await expect(first).toBeChecked();
  await expect(page.locator('[data-owner-casework]')).toContainText('1 marked across pages');
  await page.locator('[data-action=original-owner-page-next]').click();
  await expect(page.locator('[data-original-owner-mark]')).toHaveCount(3);
  await page.locator('[data-original-owner-mark]').last().check();
  await expect(page.locator('[data-owner-casework]')).toContainText('2 marked across pages');
  const markFilter=page.locator('[data-original-owner-mark-filter]');
  await markFilter.selectOption('MARKED');
  await expect(page.locator('[data-original-owner-mark]')).toHaveCount(2);
  await expect(page.locator('[data-original-owner-choice]').first()).toHaveValue('');
  await page.locator('[data-original-owner-choice]').first().selectOption('REVIEW_SOURCE');
  await expect(page.locator('[data-owner-casework-receipt]')).toContainText('1 reviewed');
  await page.locator('[data-action=original-owner-page-keep]').click();
  await expect(page.locator('[data-owner-casework-receipt]')).toContainText('2 reviewed');
  await markFilter.selectOption('UNMARKED');
  await expect(page.locator('[data-owner-casework]')).toContainText('161 matching original records');
  await expect(page.locator('[data-original-owner-choice]').first()).toHaveValue('');
  await markFilter.selectOption('ALL');
  await page.locator('[data-action=original-owner-marked-reset]').click();
  await expect(page.locator('[data-owner-casework]')).toContainText('0 marked across pages');
  await expect(page.locator('[data-owner-casework]')).not.toContainText('PRIVATE PHASE27 TITLE');
  const rect=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(rect.scroll).toBeLessThanOrEqual(rect.client);
  expect(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.includes('phase27-source-')))).toBe(false);
  await page.locator('.ws-topbar [data-action=account]').click();
  await page.locator('[data-account-dialog] [data-connection-privacy]').click();
  await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
 });
}

for(const width of [320,390,1440]){
 test('Phase 28 original provenance history and mobile physical review '+width,async({page})=>{
  test.setTimeout(90_000);
  await page.setViewportSize({width,height:width===320?720:width===390?844:900});
  await page.goto('/home/legacy/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  const source=folio();
  source.data.tasks=Array.from({length:163},(_,i)=>({id:'phase28-'+String(i).padStart(3,'0'),title:'PRIVATE ORIGINAL TITLE '+i}));
  const file=page.locator('[data-legacy-backup-file]');
  await file.setInputFiles({name:'original-phase28.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
  const undo=page.locator('[data-action=original-owner-undo]'),redo=page.locator('[data-action=original-owner-redo]');
  await expect(undo).toBeDisabled();await expect(redo).toBeDisabled();
  await expect(page.locator('[data-owner-history-provenance]')).toContainText('Fingerprint is not rights approval.');
  await page.locator('[data-original-owner-mark]').first().check();
  await expect(undo).toBeEnabled();
  await page.locator('[data-action=original-owner-page-next]').click();
  await page.locator('[data-original-owner-mark]').first().check();
  await expect(page.locator('[data-owner-casework]')).toContainText('2 marked across pages');
  await page.locator('[data-action=original-owner-marked-keep]').click();
  await expect(page.locator('[data-owner-casework-receipt]')).toContainText('2 reviewed');
  await undo.click();await expect(page.locator('[data-owner-casework-receipt]')).toContainText('0 reviewed');
  await redo.click();await expect(page.locator('[data-owner-casework-receipt]')).toContainText('2 reviewed');
  await undo.click();
  await page.locator('[data-original-owner-choice]').first().selectOption('DEFER');
  await expect(redo).toBeDisabled();
  await expect(page.locator('[data-owner-casework-receipt]')).toContainText('1 reviewed');
  await undo.click();await expect(page.locator('[data-owner-casework-receipt]')).toContainText('0 reviewed');
  await page.locator('[data-original-owner-mark-filter]').selectOption('MARKED');
  await expect(page.locator('[data-original-owner-mark]')).toHaveCount(2);
  await expect(page.locator('[data-owner-casework]')).not.toContainText('PRIVATE ORIGINAL TITLE');
  const dims=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(dims.scroll).toBeLessThanOrEqual(dims.width);
  expect(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.includes('phase28-')))).toBe(false);
  const next=folio();next.data.tasks=[{id:'replacement-only',title:'PRIVATE REPLACED SOURCE'}];
  await file.setInputFiles({name:'replaced-original.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(next))});
  await expect(undo).toBeDisabled();await expect(redo).toBeDisabled();
  await expect(page.locator('[data-owner-casework]')).toContainText('0 marked across pages');
  await page.locator('[data-original-owner-mark]').first().check();
  await page.locator('.ws-topbar [data-action=account]').click();
  await page.locator('[data-account-dialog] [data-connection-privacy]').click();
  await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
  await page.reload();await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
 });
}

for(const width of [320,390,1440]){
 test('Phase 29 reviewed marked decisions selectively recover without overwriting newer choices '+width,async({page})=>{
  test.setTimeout(90_000);
  await page.setViewportSize({width,height:width===320?720:width===390?844:900});
  await page.goto('/home/legacy/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  const owner=folio();owner.data.tasks=Array.from({length:163},(_,i)=>({id:'phase29-original-'+i,title:'PRIVATE SOURCE '+i}));
  await page.locator('[data-legacy-backup-file]').setInputFiles({name:'original29.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(owner))});
  const marks=page.locator('[data-original-owner-mark]'),choices=page.locator('[data-original-owner-choice]');
  await marks.nth(0).check();await marks.nth(1).check();
  await choices.nth(0).selectOption('KEEP_SEPARATE');
  await choices.nth(1).selectOption('DEFER');
  await choices.nth(0).selectOption('');
  await choices.nth(1).selectOption('REVIEW_HUB');
  await page.locator('[data-original-owner-recovery-step]').selectOption('2');
  await page.locator('[data-action=original-owner-recovery-preview]').click();
  await expect(page.locator('[data-owner-recovery-status]')).toContainText('1 restorable · 1 protected current');
  await page.locator('[data-action=original-owner-recovery-apply]').click();
  await expect(choices.nth(0)).toHaveValue('KEEP_SEPARATE');
  await expect(choices.nth(1)).toHaveValue('REVIEW_HUB');
  await expect(page.locator('[data-owner-casework-receipt]')).toContainText('2 reviewed');
  await page.locator('[data-action=original-owner-undo]').click();
  await expect(choices.nth(0)).toHaveValue('');
  await expect(choices.nth(1)).toHaveValue('REVIEW_HUB');
  await page.locator('[data-action=original-owner-redo]').click();
  await expect(choices.nth(0)).toHaveValue('KEEP_SEPARATE');
  await expect(page.locator('[data-owner-casework]')).not.toContainText('PRIVATE SOURCE ');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  expect(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.includes('phase29-original-')))).toBe(false);
  const replacement=folio();replacement.data.tasks=[{id:'new-source-phase29',title:'PRIVATE DIFFERENT'}];
  await page.locator('[data-legacy-backup-file]').setInputFiles({name:'original-changed29.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(replacement))});
  await expect(page.locator('[data-action=original-owner-recovery-preview]')).toBeDisabled();
  await expect(page.locator('[data-owner-casework]')).toContainText('0 marked across pages');
  await page.locator('.ws-topbar [data-action=account]').click();
  await page.locator('[data-account-dialog] [data-connection-privacy]').click();
  await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
 });
}

for(const width of [320,390,1440]){
 test('Phase 30 recover individual marked Folio source choices from several history visits '+width,async({page})=>{
  test.setTimeout(90_000);
  await page.setViewportSize({width,height:width===320?720:width===390?844:900});
  await page.goto('/home/legacy/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  const source=folio();source.data.tasks=Array.from({length:163},(_,i)=>({id:'phase30-original-'+i,title:'PRIVATE PHASE30 TITLE '+i}));
  const input=page.locator('[data-legacy-backup-file]');
  await input.setInputFiles({name:'original-phase30.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
  const choice=page.locator('[data-original-owner-choice]'),mark=page.locator('[data-original-owner-mark]');
  await mark.nth(0).check();await mark.nth(1).check();await mark.nth(2).check();
  await choice.nth(0).selectOption('KEEP_SEPARATE');
  await choice.nth(0).selectOption('');
  await choice.nth(1).selectOption('DEFER');
  await choice.nth(1).selectOption('');
  await expect(page.locator('[data-action=original-owner-cross-preview]')).toBeEnabled();
  await page.locator('[data-action=original-owner-cross-preview]').click();
  await expect(page.locator('[data-owner-cross-status]')).toContainText('2 missing decisions recoverable from 2 independent historical visits');
  await expect(page.locator('[data-owner-cross-status]')).toContainText('1 without historical evidence');
  await page.locator('[data-action=original-owner-cross-apply]').click();
  await expect(choice.nth(0)).toHaveValue('KEEP_SEPARATE');
  await expect(choice.nth(1)).toHaveValue('DEFER');
  await expect(choice.nth(2)).toHaveValue('');
  await page.locator('[data-action=original-owner-undo]').click();
  await expect(choice.nth(0)).toHaveValue('');
  await page.locator('[data-action=original-owner-redo]').click();
  await expect(choice.nth(0)).toHaveValue('KEEP_SEPARATE');
  await expect(page.locator('[data-owner-casework]')).not.toContainText('PRIVATE PHASE30 TITLE');
  const dims=await page.evaluate(()=>({w:document.documentElement.clientWidth,s:document.documentElement.scrollWidth}));
  expect(dims.s).toBeLessThanOrEqual(dims.w);
  expect(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.includes('phase30-original-')))).toBe(false);
  const replacement=folio();replacement.data.tasks=[{id:'different-phase30',title:'SECRET REPLACED ORIGINAL'}];
  await input.setInputFiles({name:'different-original30.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(replacement))});
  await expect(page.locator('[data-action=original-owner-cross-preview]')).toBeDisabled();
  await expect(page.locator('[data-owner-casework]')).toContainText('0 marked across pages');
  await page.locator('[data-original-owner-mark]').first().check();
  await page.locator('.ws-topbar [data-action=account]').click();
  await page.locator('[data-account-dialog] [data-connection-privacy]').click();
  await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
 });
}

for(const width of [320,390,1440]){
 test('Phase 31 independent marked history selections use real physical taps '+width,async({page})=>{
  test.setTimeout(90_000);
  await page.setViewportSize({width,height:width===320?720:width===390?844:900});
  await page.goto('/home/legacy/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  const source=folio();
  source.data.tasks=Array.from({length:163},(_,i)=>({id:'phase31-original-'+i,title:'PRIVATE SOURCE TITLE '+i}));
  const file=page.locator('[data-legacy-backup-file]');
  await file.setInputFiles({name:'source31-original.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(source))});
  const marked=page.locator('[data-original-owner-mark]'),choices=page.locator('[data-original-owner-choice]');
  await marked.nth(0).check();await marked.nth(1).check();await marked.nth(2).check();
  await choices.nth(0).selectOption('KEEP_SEPARATE');
  await choices.nth(0).selectOption('');
  await choices.nth(1).selectOption('DEFER');
  await choices.nth(1).selectOption('');
  await page.locator('[data-action=original-owner-cross-preview]').click();
  const option=page.locator('[data-original-owner-cross-select]');
  await expect(option).toHaveCount(2);
  await expect(option.first()).toBeChecked();
  await expect(option.last()).toBeChecked();
  await option.first().uncheck();
  await expect(option.first()).not.toBeChecked();
  await expect(page.locator('[data-owner-cross-status]')).toContainText('1 explicitly selected');
  await page.locator('[data-action=original-owner-cross-apply]').click();
  await expect(choices.nth(0)).toHaveValue('');
  await expect(choices.nth(1)).toHaveValue('DEFER');
  await page.locator('[data-action=original-owner-cross-preview]').click();
  await expect(page.locator('[data-original-owner-cross-select]')).toHaveCount(1);
  await page.locator('[data-action=original-owner-cross-apply]').click();
  await expect(choices.nth(0)).toHaveValue('KEEP_SEPARATE');
  await expect(choices.nth(1)).toHaveValue('DEFER');
  await page.locator('[data-action=original-owner-undo]').click();
  await expect(choices.nth(0)).toHaveValue('');
  await page.locator('[data-action=original-owner-redo]').click();
  await expect(choices.nth(0)).toHaveValue('KEEP_SEPARATE');
  const widthInfo=await page.evaluate(()=>({client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));
  expect(widthInfo.scroll).toBeLessThanOrEqual(widthInfo.client);
  expect(await page.evaluate(()=>Object.keys(localStorage).some(k=>k.includes('phase31-original-')))).toBe(false);
  const replacement=folio();replacement.data.tasks=[{id:'source31-changed',title:'SECRET DIFFERENT SOURCE'}];
  await file.setInputFiles({name:'source31-changed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(replacement))});
  await expect(page.locator('[data-action=original-owner-cross-preview]')).toBeDisabled();
  await expect(page.locator('[data-original-owner-cross-select]')).toHaveCount(0);
  await page.locator('.ws-topbar [data-action=account]').click();
  await page.locator('[data-account-dialog] [data-connection-privacy]').click();
  await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
  await page.reload();await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
 });
}

for(const width of [320,390,1440]){
 test('Phase 32 real physical older-generation selection respects exact original source '+width,async({page})=>{
  test.setTimeout(90_000);
  await page.setViewportSize({width,height:width===320?720:width===390?844:900});
  await page.goto('/home/legacy/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  const original=folio();
  original.data.tasks=Array.from({length:163},(_,i)=>({id:'phase32-original-'+i,title:'PRIVATE PHASE32 TITLE '+i}));
  const file=page.locator('[data-legacy-backup-file]');
  await file.setInputFiles({name:'source32.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(original))});
  const marks=page.locator('[data-original-owner-mark]'),choices=page.locator('[data-original-owner-choice]');
  await marks.nth(0).check();await marks.nth(1).check();
  await choices.nth(0).selectOption('DEFER');
  await choices.nth(0).selectOption('KEEP_SEPARATE');
  await choices.nth(0).selectOption('');
  await choices.nth(1).selectOption('REVIEW_HUB');
  await page.locator('[data-action=original-owner-cross-preview]').click();
  const historical=page.locator('[data-original-owner-cross-generation]');
  await expect(historical).toHaveCount(1);
  const options=await historical.locator('option').evaluateAll(all=>all.map(el=>({value:(el as HTMLOptionElement).value,text:el.textContent??''})));
  expect(options.some(v=>v.text.includes('DEFER'))).toBe(true);
  expect(options.some(v=>v.text.includes('KEEP SEPARATE'))).toBe(true);
  const older=options.find(v=>v.text.includes('DEFER'))!;
  await historical.selectOption(older.value);
  await expect(historical).toHaveValue(older.value);
  await page.locator('[data-action=original-owner-cross-apply]').click();
  await expect(choices.nth(0)).toHaveValue('DEFER');
  await expect(choices.nth(1)).toHaveValue('REVIEW_HUB');
  await page.locator('[data-action=original-owner-undo]').click();
  await expect(choices.nth(0)).toHaveValue('');
  await page.locator('[data-action=original-owner-redo]').click();
  await expect(choices.nth(0)).toHaveValue('DEFER');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  expect(await page.evaluate(()=>Object.keys(localStorage).some(key=>key.includes('phase32-original-')))).toBe(false);
  const replacement=folio();replacement.data.tasks=[{id:'different-phase32',title:'PRIVATE DIFFERENT ORIGINAL'}];
  await file.setInputFiles({name:'different-source32.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(replacement))});
  await expect(page.locator('[data-action=original-owner-cross-preview]')).toBeDisabled();
  await expect(page.locator('[data-original-owner-cross-generation]')).toHaveCount(0);
  await page.locator('.ws-topbar [data-action=account]').click();
  await page.locator('[data-account-dialog] [data-connection-privacy]').click();
  await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-owner-casework]')).toHaveCount(0);
 });
}
