import {test,expect} from '@playwright/test';

for(const width of [1440,390]){
 test('Hub native knowledge editor, backlinks, reload and same-shell navigation '+width, async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto('/home/knowledge/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  await expect(page.locator('[data-workspace]')).toHaveAttribute('data-view','knowledge');
  await page.locator('[data-action=knowledge-new]').click();
  await page.locator('[data-knowledge-form] [name=title]').fill('University index');
  await page.locator('[data-knowledge-form] [name=body]').fill('Lecture material and [[Second note]]');
  await page.locator('[data-knowledge-form] [type=submit]').click();
  await expect(page.locator('[data-knowledge-list]')).toContainText('University index');
  await page.locator('[data-action=knowledge-new]').click();
  await page.locator('[data-knowledge-form] [name=title]').fill('Second note');
  await page.locator('[data-knowledge-form] [name=body]').fill('Original theorem and proof');
  await page.locator('[data-knowledge-form] [type=submit]').click();
  await expect(page.locator('.ws-knowledge-relations')).toContainText('University index');
  await page.reload();
  await expect(page.locator('[data-knowledge-list]')).toContainText('Second note');
  await expect(page.locator('[data-knowledge-list]')).toContainText('University index');
  await page.locator('[data-action=knowledge-open]').filter({hasText:'University index'}).first().click();
  await expect(page.locator('.ws-knowledge-relations')).toContainText('Second note');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  expect(errors).toEqual([]);
 });
}

test('Hub knowledge unsaved draft cannot silently disappear through internal navigation',async({page})=>{
 await page.goto('/home/knowledge/');
 await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
 await page.locator('[data-action=knowledge-new]').click();
 await page.locator('[data-knowledge-form] [name=title]').fill('Unsaved study');
 page.once('dialog',dialog=>dialog.dismiss());
 await page.locator('.ws-nav a[href="/home/tasks/"]').click();
 await expect(page.locator('[data-workspace]')).toHaveAttribute('data-view','knowledge');
 await expect(page.locator('[data-knowledge-form] [name=title]')).toHaveValue('Unsaved study');
});

for(const width of [1440,390]){
 test('native KEEP-derived project tasks remain in original Hub note '+width,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto('/home/knowledge/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  await page.locator('[data-action=knowledge-new-project]').click();
  await page.locator('[data-knowledge-form] [name=title]').fill('Research project');
  await page.locator('[data-knowledge-form] [type=submit]').click();
  await expect(page.locator('.ws-knowledge-projects')).toContainText('Research project');
  await expect(page.locator('.ws-knowledge-relations')).toContainText('0%');
  await page.locator('[data-action=knowledge-toggle-task]').click();
  await expect(page.locator('.ws-knowledge-relations')).toContainText('100%');
  await page.reload();
  await page.locator('[data-action=knowledge-open]').filter({hasText:'Research project'}).first().click();
  await expect(page.locator('.ws-knowledge-relations')).toContainText('100%');
  await expect(page.locator('[data-knowledge-form] [name=body]')).toContainValue('- [x] First step');
  expect(errors).toEqual([]);
 });
}

for(const width of [1440,390]){
 test('original KEEP B3 source record edits without migration '+width,async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto('/home/knowledge/');
  await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
  await page.evaluate(async()=>{
    await new Promise<void>((resolve,reject)=>{
      const open=indexedDB.open('KeepNotesDB',1);
      open.onupgradeneeded=()=>{if(!open.result.objectStoreNames.contains('notes'))open.result.createObjectStore('notes',{keyPath:'id'});};
      open.onerror=()=>reject(open.error);
      open.onsuccess=()=>{
       const db=open.result,tx=db.transaction('notes','readwrite');
       tx.objectStore('notes').put({
         id:'keep-source-17',title:'University research',content:'---\ntype: project\nprogress: tasks\n---\n- [ ] Review chapter ^review',
         type:'text',checklist:[],color:'yellow',tags:['study'],folderId:null,pinned:true,
         archived:false,trashed:false,createdAt:'2026-10-16T18:00:00Z',updatedAt:'2026-10-16T18:01:00Z',
         reminderDate:null,images:[],linkedNoteIds:[]
       });
       tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
      };
    });
  });
  await page.locator('[data-action=knowledge-mode][data-id=keep]').click();
  await page.locator('[data-action=knowledge-keep-connect]').click();
  await expect(page.locator('[data-keep-owner]')).toContainText('University research');
  await expect(page.locator('[data-keep-owner]')).toContainText('0%');
  await page.locator('[data-action=knowledge-keep-task]').click();
  await expect(page.locator('[data-keep-owner]')).toContainText('100%');
  await page.locator('[data-keep-owner-form] [name=title]').fill('Renamed research');
  await page.locator('[data-keep-owner-form] [type=submit]').click();
  await expect(page.locator('[data-keep-owner]')).toContainText('Renamed research');
  const source=await page.evaluate(async()=>{
    return await new Promise<any>((resolve,reject)=>{
      const req=indexedDB.open('KeepNotesDB');req.onerror=()=>reject(req.error);
      req.onsuccess=()=>{const db=req.result,r=db.transaction('notes').objectStore('notes').get('keep-source-17');r.onsuccess=()=>{db.close();resolve(r.result)};r.onerror=()=>reject(r.error);};
    });
  });
  expect(source.id).toBe('keep-source-17');
  expect(source.color).toBe('yellow');
  expect(source.tags).toEqual(['study']);
  expect(source.content).toContain('- [x] Review chapter ^review');
  await page.reload();
  await page.locator('[data-action=knowledge-mode][data-id=keep]').click();
  await page.locator('[data-action=knowledge-keep-connect]').click();
  await expect(page.locator('[data-keep-owner]')).toContainText('Renamed research');
  expect(errors).toEqual([]);
 });
}
test('encrypted KEEP B3 vault header fails closed in Hub',async({page})=>{
 await page.goto('/home/knowledge/');
 await page.evaluate(()=>localStorage.setItem('keepnotes_vault_enc_header','{"format":"keepnotes-vault-enc","version":"1.0.0"}'));
 await page.locator('[data-action=knowledge-mode][data-id=keep]').click();
 await page.locator('[data-action=knowledge-keep-connect]').click();
 await expect(page.locator('.ws-keep-owner-empty')).toContainText('KEEP encryption is enabled');
 await expect(page.locator('[data-keep-owner-form]')).toHaveCount(0);
});

test('original KEEP creation retains native schema and existing owner DB',async({page})=>{
 await page.goto('/home/knowledge/');
 await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
 await page.evaluate(async()=>{
  await new Promise<void>((resolve,reject)=>{
   const o=indexedDB.open('KeepNotesDB',1);
   o.onupgradeneeded=()=>o.result.createObjectStore('notes',{keyPath:'id'});
   o.onsuccess=()=>{o.result.close();resolve();};o.onerror=()=>reject(o.error);
  });
 });
 await page.locator('[data-action=knowledge-mode][data-id=keep]').click();
 await page.locator('[data-action=knowledge-keep-connect]').click();
 await page.locator('[data-action=knowledge-keep-new]').click();
 await page.locator('[data-keep-owner-form] [name=title]').fill('My native KEEP note');
 await page.locator('[data-keep-owner-form] [name=content]').fill('# Theorem');
 await page.locator('[data-keep-owner-form] [type=submit]').click();
 await expect(page.locator('[data-keep-owner]')).toContainText('My native KEEP note');
 const notes=await page.evaluate(async()=>{
  return await new Promise<any[]>((resolve,reject)=>{
   const o=indexedDB.open('KeepNotesDB');o.onerror=()=>reject(o.error);
   o.onsuccess=()=>{
    const db=o.result,r=db.transaction('notes').objectStore('notes').getAll();
    r.onsuccess=()=>{db.close();resolve(r.result);};r.onerror=()=>reject(r.error);
   };
  });
 });
 expect(notes).toHaveLength(1);
 expect(notes[0]).toMatchObject({title:'My native KEEP note',content:'# Theorem',type:'text',pinned:false,archived:false,trashed:false});
 expect(notes[0].id.length).toBeGreaterThan(8);
});
test('native KEEP original checklist completion retains original item ID',async({page})=>{
 await page.goto('/home/knowledge/');
 await expect(page.locator('[data-workspace-status]')).toContainText('saved locally');
 await page.evaluate(async()=>{
  await new Promise<void>((resolve,reject)=>{
   const o=indexedDB.open('KeepNotesDB',1);
   o.onupgradeneeded=()=>o.result.createObjectStore('notes',{keyPath:'id'});
   o.onsuccess=()=>{
    const db=o.result,tx=db.transaction('notes','readwrite');
    tx.objectStore('notes').put({id:'checklist-original',title:'Source checklist',content:'Original body',type:'checklist',
     checklist:[{id:'item-original',text:'Read notes',completed:false}],color:'green',tags:['study'],folderId:null,
     pinned:false,archived:false,trashed:false,createdAt:'2026-10-16T12:00:00Z',
     updatedAt:'2026-10-16T12:00:01Z',reminderDate:null,images:[]});
    tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
   };o.onerror=()=>reject(o.error);
  });
 });
 await page.locator('[data-action=knowledge-mode][data-id=keep]').click();
 await page.locator('[data-action=knowledge-keep-connect]').click();
 await expect(page.locator('[data-keep-owner]')).toContainText('Read notes');
 await page.locator('[data-action=knowledge-keep-checklist][data-id=item-original]').click();
 await expect(page.locator('[data-keep-owner]')).toContainText('✓ Read notes');
 const record=await page.evaluate(async()=>await new Promise<any>((resolve,reject)=>{
  const o=indexedDB.open('KeepNotesDB');o.onsuccess=()=>{
    const db=o.result,r=db.transaction('notes').objectStore('notes').get('checklist-original');
    r.onsuccess=()=>{db.close();resolve(r.result);};r.onerror=()=>reject(r.error);
  };o.onerror=()=>reject(o.error);
 }));
 expect(record.checklist).toEqual([{id:'item-original',text:'Read notes',completed:true}]);
 expect(record.content).toBe('Original body');
 expect(record.tags).toEqual(['study']);
});
