import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
const manifest=JSON.parse(fs.readFileSync('src/generated/launch-manifest.json','utf8'));
const hub={excluded:manifest.excluded,projects:manifest.entries.map((e:{id:string})=>({slug:e.id})),expectedCount:manifest.entries.filter((e:{id:string})=>e.id!=='notes').length,historicalCount:manifest.entries.length,expectedCategoryCounts:Object.fromEntries(manifest.categories.map((c:{id:string})=>[c.id,manifest.entries.filter((e:{category:string,id:string})=>e.id!=='notes'&&e.category===c.id).length]))};
async function ready(page:Page){await page.goto('/?mode=workspace');await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');}
async function save(page:Page){await page.locator('[data-workspace-dialog]').getByRole('button',{name:'Save',exact:true}).click();await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');}
async function task(page:Page,title='Read chapter six'){await page.locator('[data-planner] [data-action=new-task]').first().click();await page.getByLabel('Task',{exact:true}).fill(title);await save(page);}
test('tasks, notes and tracker logs persist through layout edits and reload',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await ready(page);await task(page);
 await page.locator('[data-capture-draft]').fill('Study notes\nUseful ideas from chapter six.');await page.locator('[data-capture-form]').getByRole('button',{name:'Capture',exact:true}).click();await expect(page.getByRole('button',{name:'Open',exact:true}).first()).toBeVisible();
 await page.getByRole('button',{name:'Create a tracker',exact:true}).first().click();await page.getByLabel('Name',{exact:true}).fill('Reading');await save(page);
 await page.getByRole('button',{name:'+ Log',exact:true}).first().click();await page.getByLabel('Amount (sessions)').fill('2');await save(page);await expect(page.locator('.ws-tracker-table')).toContainText('2 / 5');
 await page.getByRole('button',{name:'Customize',exact:true}).click();const handle=page.locator('[data-drag]').nth(1);await handle.focus();await page.keyboard.press('ArrowDown');await page.getByRole('button',{name:'Done',exact:true}).click();await expect(page.getByRole('button',{name:'Customize',exact:true})).toBeVisible();
 await page.reload();await expect(page.locator('.ws-task-title')).toHaveText('Read chapter six');await expect(page.locator('.ws-tracker-table')).toContainText('2 / 5');await expect(page.locator('[data-widget-type=continue]')).toContainText('Study notes');expect(errors).toEqual([]);
});
test('layout Cancel and Undo preserve data, and removing a widget leaves notes recoverable',async({page})=>{
 await ready(page);await page.locator('[data-capture-draft]').fill('Keep this note');await page.locator('[data-capture-form]').getByRole('button',{name:'Capture',exact:true}).click();await expect(page.locator('[data-widget-type=continue]')).toContainText('Keep this note');
 await page.getByRole('button',{name:'Customize',exact:true}).click();const cells=page.locator('[data-widget-id]');const before=await cells.first().getAttribute('style');await page.locator('[data-resize]').first().focus();await page.keyboard.press('ArrowDown');await page.locator('[data-action=undo-layout]').click();await expect(cells.first()).toHaveAttribute('style',before!);await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.locator('[data-widget-type=continue] [data-action=configure-widget]').click();await page.getByRole('button',{name:'Remove widget',exact:true}).click();await page.getByRole('button',{name:'Done',exact:true}).click();await expect(page.locator('[data-widget-type=continue]')).toHaveCount(0);
 await page.getByRole('button',{name:'Customize',exact:true}).click();await page.getByRole('button',{name:'+ Add widget',exact:true}).click();await page.locator('[data-action=add-type][data-id=continue]').click();await page.getByRole('button',{name:'Done',exact:true}).click();await expect(page.locator('[data-widget-type=continue]')).toContainText('Keep this note');
});
test('the rail, presets and named workspaces are independent from shared content',async({page})=>{
 await ready(page);await task(page,'Shared task');await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();await expect(page.locator('[data-workspace]')).toHaveAttribute('data-rail','collapsed');await expect(page.locator('.ws-planner')).toBeVisible();await page.reload();await expect(page.locator('[data-workspace]')).toHaveAttribute('data-rail','collapsed');
 await page.getByRole('button',{name:'Layouts',exact:true}).click();await page.getByLabel('Layout',{exact:true}).selectOption('1');await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.locator('#ws-title')).toHaveText('Focus console');const shortcut=(await page.locator('.ws-app').first().boundingBox())!,shortcutBody=(await page.locator('[data-widget-type=app-shortcuts] .ws-widget-body').boundingBox())!;expect(shortcut.y+shortcut.height).toBeLessThanOrEqual(shortcutBody.y+shortcutBody.height);await expect(page.locator('.ws-task-title')).toHaveText('Shared task');await expect(page.locator('[data-widget-type=tracker-history]')).toHaveCount(1);await page.getByRole('button',{name:'Expand sidebar',exact:true}).click();await page.locator('[data-workspace-id]').first().click();await expect(page.locator('#ws-title')).toHaveText('Personal workspace');
});
test('pointer drag and resize commit logical placement that survives reflow',async({page})=>{
 await ready(page);await page.getByRole('button',{name:'Customize',exact:true}).click();const handle=page.locator('[data-drag]').nth(1),cell=page.locator('[data-widget-id]').nth(1),before=await cell.getAttribute('style');const box=(await handle.boundingBox())!;await page.mouse.move(box.x+8,box.y+8);await page.mouse.down();await page.mouse.move(box.x+8,box.y+88,{steps:5});await page.mouse.up();await expect(cell).not.toHaveAttribute('style',before!);const after=await cell.getAttribute('style');await page.getByRole('button',{name:'Done',exact:true}).click();await page.setViewportSize({width:390,height:844});await page.setViewportSize({width:1440,height:1024});await expect(cell).toHaveAttribute('style',after!);await page.reload();await expect(page.locator('[data-widget-id]').nth(1)).toHaveAttribute('style',after!);
});
test('another tab cannot silently overwrite an active layout edit',async({page,context})=>{
 await ready(page);const other=await context.newPage();await other.goto('/?mode=workspace');await expect(other.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');await page.getByRole('button',{name:'Customize',exact:true}).click();await page.locator('[data-resize]').first().focus();await page.keyboard.press('ArrowDown');await task(other,'From another tab');await expect(page.locator('[data-workspace-notice]')).toContainText('Another tab changed');await page.getByRole('button',{name:'Done',exact:true}).click();await expect(page.getByText('Editing layout',{exact:true})).toBeVisible();await expect(page.locator('[data-workspace-notice]')).toContainText('saved layout changed');await other.reload();await expect(other.locator('.ws-task-title')).toHaveText('From another tab');await other.close();
});
test('blocked IndexedDB keeps content in memory and never claims it was saved',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{get(){throw new DOMException('Blocked','SecurityError');}});});await page.goto('/?mode=workspace');await expect(page.locator('[data-workspace-status]')).toContainText('Unsaved');await taskWithoutSave(page);await expect(page.locator('.ws-task-title')).toHaveText('Unsaved task');await expect(page.locator('[data-workspace-status]')).toContainText('Unsaved');const download=page.waitForEvent('download');await page.locator('[data-action=export]').first().click();expect((await download).suggestedFilename()).toContain('thiepn-workspace');
});
async function taskWithoutSave(page:Page){await page.locator('[data-action=new-task]').first().click();await page.getByLabel('Task',{exact:true}).fill('Unsaved task');await page.locator('[data-dialog-submit]').click();}
test('identity changes clear private local content and do not import it into a guest',async({page})=>{
 await ready(page);await task(page,'Guest task');const owner='11111111-1111-4111-8111-111111111111';await page.evaluate(id=>window.dispatchEvent(new CustomEvent('hub:identity',{detail:{status:'signed-in',id,label:'Test owner'}})),owner);await expect(page.locator('[data-workspace-content]')).not.toContainText('Guest task');await page.locator('[data-action=unified-mode][data-id=workspace]').click();await expect(page.locator('.ws-task-title')).toHaveCount(0);await task(page,'Owner task');await page.evaluate(()=>window.dispatchEvent(new CustomEvent('hub:identity',{detail:{status:'checking'}})));await expect(page.locator('[data-workspace-content]')).not.toContainText('Owner task');await expect(page.locator('[data-planner]')).toBeEmpty();await page.evaluate(()=>window.dispatchEvent(new CustomEvent('hub:identity',{detail:{status:'signed-out'}})));await expect(page.locator('[data-home-mode=today]')).toBeVisible();await expect(page.locator('[data-workspace-content]')).not.toContainText('Owner task');await page.locator('[data-action=unified-mode][data-id=workspace]').click();await expect(page.locator('.ws-task-title')).toHaveText('Guest task');
});
test('layout edit draft resumes after navigation and local search opens real notes',async({page})=>{
 await ready(page);await page.locator('[data-capture-draft]').fill('Resume this note');await page.locator('[data-capture-form]').getByRole('button',{name:'Capture',exact:true}).click();await page.getByRole('button',{name:'Customize',exact:true}).click();await page.locator('[data-resize]').first().focus();await page.keyboard.press('ArrowDown');await page.reload();await page.getByRole('button',{name:'Resume edit',exact:true}).click();await expect(page.getByText('Editing layout',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Done',exact:true}).click();await page.locator('[data-action=search]').click();await page.locator('#workspace-search').fill('Resume this note');await page.locator('[data-command=edit-note][data-palette-primary]').click();await expect(page.getByLabel('Note',{exact:true})).toHaveValue('Resume this note');
});
test('event dates, task completion and undo are consistent between planner and full pages',async({page})=>{
 await ready(page);await task(page);await page.locator('[data-task-toggle]').check();await expect(page.locator('.ws-task.completed')).toHaveCount(1);await page.getByRole('button',{name:'Undo',exact:true}).click();await expect(page.locator('[data-task-toggle]')).not.toBeChecked();await page.locator('[data-action=new-event]').first().click();await page.getByLabel('Event',{exact:true}).fill('Weekly planning');await save(page);await expect(page.locator('.ws-agenda')).toContainText('Weekly planning');await page.goto('/home/calendar/');await expect(page.locator('.ws-main')).toContainText('Weekly planning');await expect(page.locator('.ws-main')).toContainText('Read chapter six');
});
test('export/import previews counts, preserves content and supports replacement recovery',async({page})=>{
 await ready(page);await task(page,'Backup task');const downloadPromise=page.waitForEvent('download');await page.locator('[data-action=export]').first().click();const download=await downloadPromise;const file=await download.path();await page.goto('/home/settings/');await page.getByRole('button',{name:'Import backup',exact:true}).click();await page.locator('[data-workspace-form] input[type=file]').setInputFiles(file!);await page.getByLabel('Import mode',{exact:true}).selectOption('replace');await page.locator('[data-dialog-submit]').click();await expect(page.locator('#ws-dialog-title')).toHaveText('Review import');await expect(page.locator('[data-dialog-fields]')).toContainText('1 tasks');await page.getByRole('button',{name:'Replace local data',exact:true}).click();await expect(page.locator('[data-workspace-dialog]')).not.toBeVisible();await page.goto('/home/tasks/');await expect(page.locator('.ws-main .ws-task-title')).toHaveText('Backup task');
});
test('future saved documents are exported for recovery and never overwritten',async({page})=>{
 await ready(page);const raw=JSON.stringify({schemaVersion:99,privateData:'keep this document'});
 await page.evaluate(async raw=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('thiepn-adaptive-workspace',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});await new Promise<void>((resolve,reject)=>{const tx=db.transaction('records','readwrite');tx.objectStore('records').put(raw,'guest');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();},raw);
 await page.reload();await expect(page.locator('[data-workspace-notice]')).toContainText('Unsupported workspace version');await expect(page.locator('[data-workspace-status]')).toHaveText('Saved record left untouched');await expect(page.locator('[data-widget-id]')).toHaveCount(0);
 const saved=await page.evaluate(async()=>{const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('thiepn-adaptive-workspace',1);r.onsuccess=()=>resolve(r.result);});const value=await new Promise<string>(resolve=>{const r=db.transaction('records').objectStore('records').get('guest');r.onsuccess=()=>resolve(r.result);});db.close();return value;});expect(saved).toBe(raw);
});
test('the public workspace shell reloads offline without caching auth or connections',async({page,context,browserName})=>{
 test.skip(browserName!=='chromium','Chromium offline shell scenario');await ready(page);await task(page,'Offline task');
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.reload();await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await page.goto('/');await expect(page.locator('[data-home-mode=today]')).toBeVisible();await context.setOffline(true);await page.reload();await expect(page.locator('[data-workspace-content]')).toContainText('Offline task');await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
 const cached=await page.evaluate(async()=>{const keys=await caches.keys();const cache=await caches.open(keys.find(k=>k.startsWith('thiepn-workspace-'))!);return (await cache.keys()).map(r=>new URL(r.url).pathname);});expect(cached).not.toContain('/home/auth/callback/');expect(cached).not.toContain('/home/connections/');expect(cached.filter(p=>/auth\/v1|rest\/v1/.test(p))).toEqual([]);await context.setOffline(false);
});
test('populated workspace remains readable and keyboard scrollable in both themes',async({page})=>{
 await ready(page);await page.locator('[data-planner] [data-action=new-task]').first().click();await page.getByLabel('Task',{exact:true}).fill('Priority task');await page.getByLabel('Time (optional)',{exact:true}).fill('10:00');await page.getByLabel('Priority',{exact:true}).selectOption('high');await save(page);await expect(page.locator('[data-planner] [data-action=new-task]').first()).toBeFocused();
 await page.addScriptTag({path:process.env.AXE_PATH||'/tmp/audit-tools/node_modules/axe-core/axe.min.js'});
 for(const colorScheme of ['light','dark'] as const){await page.emulateMedia({colorScheme,reducedMotion:'reduce'});await expect.poll(()=>page.evaluate(()=>document.documentElement.dataset.theme)).toBe(colorScheme);expect(await page.evaluate(async()=>(await (window as any).axe.run(document)).violations.map((v:any)=>({id:v.id,targets:v.nodes.map((n:any)=>n.target)})))).toEqual([]);}
 await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();await expect(page.locator('.ws-nav a.active .ws-icon')).toBeVisible();await page.setViewportSize({width:390,height:844});expect((await page.locator('#ws-title').boundingBox())!.width).toBeGreaterThan(200);
});

test('root workspace, Apps catalogue and legacy Home share navigation and saved data', async ({page}) => {
 await page.goto('/home/?mode=workspace'); await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
 const origin = new URL(page.url()).origin;
 await task(page, 'Keep existing Home data');
 await page.locator('.ws-brand a').click(); await expect(page).toHaveURL(url=>url.pathname==='/');
 await page.locator('[data-action=unified-mode][data-id=workspace]').click();await expect(page.locator('.ws-task-title')).toHaveText('Keep existing Home data');
 await expect(page.locator('[data-library-pilot]')).toHaveCount(0);
 await page.locator('.ws-nav').getByRole('link',{name:'Apps',exact:true}).click();
 await expect(page).toHaveURL(origin + '/apps/'); expect(hub.historicalCount).toBe(31); await expect(page.locator('[data-hub-item]')).toHaveCount(hub.expectedCount);
 await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href','https://thiepn.dev/apps/');
 await page.locator('.ws-nav').getByRole('link',{name:'Today',exact:true}).click();
 await expect(page).toHaveURL(url=>url.pathname==='/');await page.locator('[data-action=unified-mode][data-id=workspace]').click();await expect(page.locator('.ws-task-title')).toHaveText('Keep existing Home data');
 await page.locator('.ws-topbar [data-action=account]').click();
 await page.getByRole('link',{name:'Open reading connection',exact:true}).click();
 await expect(new URL(page.url()).pathname).toBe('/home/');
 await expect(page.locator('[data-account-dialog]')).toBeVisible();
 await expect(page.locator('[data-reading-shell]')).toHaveAttribute('data-library-host-route','/home/');
 await expect(page.locator('.ws-task-title')).toHaveText('Keep existing Home data');
});

test('foreign revisions invalidate content Undo without deleting either tab’s work',async({page,context})=>{
 await ready(page);
 const other=await context.newPage();await ready(other);
 await task(page,'Task A — keep');
 await expect(page.locator('[data-workspace-toast] [data-action=undo-content]')).toBeVisible();
 await expect(other.locator('.ws-task-title')).toHaveText('Task A — keep');
 await task(other,'Task B — keep');
 await expect(page.locator('.ws-task-title')).toHaveText(['Task A — keep','Task B — keep']);
 await expect(page.locator('[data-workspace-toast] [data-action=undo-content]')).toHaveCount(0);
 // Even a delayed/stale click must not restore the old snapshot.
 await page.evaluate(()=>{const b=document.createElement('button');b.dataset.action='undo-content';document.querySelector('[data-workspace]')!.append(b);b.click();b.remove();});
 await page.reload();
 await expect(page.locator('.ws-task-title')).toHaveText(['Task A — keep','Task B — keep']);
});

test('a later preference change removes an obsolete Undo control',async({page})=>{
 await ready(page);await task(page,'Keep after rail change');
 await expect(page.locator('[data-workspace-toast] [data-action=undo-content]')).toBeVisible();
 await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();
 await expect(page.locator('[data-workspace]')).toHaveAttribute('data-rail','collapsed');
 await expect(page.locator('[data-workspace-toast] [data-action=undo-content]')).toHaveCount(0);
 await page.reload();await expect(page.locator('.ws-task-title')).toHaveText('Keep after rail change');
});

test('a capacity validation failure preserves the form and subsequent saves still work',async({page})=>{
 await ready(page);
 await page.evaluate(async()=>{
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('thiepn-adaptive-workspace',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
  await new Promise<void>((resolve,reject)=>{const tx=db.transaction('records','readwrite'),store=tx.objectStore('records'),r=store.get('guest');r.onsuccess=()=>{const s=JSON.parse(r.result);s.trackers=Array.from({length:100},(_,i)=>({id:'tracker-'+i,title:'Existing tracker '+i,kind:'count',unit:'sessions',goal:5,cadence:'weekly'}));store.put(JSON.stringify(s),'guest');};tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();
 });
 await page.goto('/home/trackers/');
 await page.getByRole('button',{name:'+ Create tracker',exact:true}).click();
 await page.getByLabel('Name',{exact:true}).fill('Keep this tracker input');
 await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-workspace-dialog]')).toBeVisible();
 await expect(page.locator('[data-dialog-error]')).toContainText('100 trackers');
 await expect(page.getByLabel('Name',{exact:true})).toHaveValue('Keep this tracker input');
 await expect(page.locator('[data-dialog-submit]')).toBeEnabled();
 await page.locator('[data-workspace-dialog]').getByRole('button',{name:'Cancel',exact:true}).click();
 await task(page,'Valid save after failed tracker');await page.reload();
 await expect(page.locator('.ws-task-title')).toHaveText('Valid save after failed tracker');
});

test('a failed storage write keeps the form and retry creates only one task',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  const put=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(...args:Parameters<IDBObjectStore['put']>){
   if((window as any).__failWorkspaceWrite&&this.name==='records'&&args[1]==='guest')throw new DOMException('Audit write failure','QuotaExceededError');
   return put.apply(this,args);
  };
 });
 await ready(page);
 await page.evaluate(()=>{(window as any).__failWorkspaceWrite=true;});
 await page.locator('[data-planner] [data-action=new-task]').first().click();
 await page.getByLabel('Task',{exact:true}).fill('One task after retry');
 await page.locator('[data-dialog-submit]').click();
 await expect(page.locator('[data-dialog-error]')).toContainText('could not be saved');
 await expect(page.locator('[data-workspace-dialog]')).toBeVisible();
 await expect(page.getByLabel('Task',{exact:true})).toHaveValue('One task after retry');
 await page.evaluate(()=>{(window as any).__failWorkspaceWrite=false;});
 await save(page);await page.reload();
 await expect(page.locator('.ws-task-title')).toHaveText('One task after retry');
 expect(errors).toEqual([]);
});

test('Undo cannot overwrite a newer persisted revision when cross-tab messages are unavailable',async({page,context})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(window,'BroadcastChannel',{value:class{onmessage=null;postMessage(){}close(){}}});
 });
 await ready(page);await task(page,'Original task');
 const other=await context.newPage();await ready(other);await task(other,'Newer task');
 await page.locator('[data-workspace-toast] [data-action=undo-content]').click();
 await expect(page.locator('[data-workspace-notice]')).toContainText('changed');
 await expect(page.locator('.ws-task-title')).toHaveText('Original task');
 await page.reload();
 await expect(page.locator('.ws-task-title')).toHaveText(['Original task','Newer task']);
});

test('draft autosave cannot move Capture away during a pointer press',async({page})=>{
 await page.setViewportSize({width:1440,height:1024});
 await ready(page);
 await page.clock.install({time:new Date('2026-10-17T10:00:00Z')});
 await page.clock.pauseAt(new Date('2026-10-17T10:01:00Z'));
 await page.locator('[data-capture-draft]').fill('Capture through autosave');
 const submit=page.locator('[data-capture-form] button[type=submit]');
 await submit.scrollIntoViewIfNeeded();
 const before=(await submit.boundingBox())!;
 await page.mouse.move(before.x+before.width/2,before.y+before.height/2);await page.mouse.down();
 await page.clock.runFor(600);
 await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
 const after=(await submit.boundingBox())!;
 await page.mouse.up();
 expect(after.y,'Autosave must not shift the active Capture control').toBeCloseTo(before.y,0);
 await expect(page.locator('[data-widget-type=continue]')).toContainText('Capture through autosave');
 await page.reload();await expect(page.locator('[data-widget-type=continue]')).toContainText('Capture through autosave');
});
