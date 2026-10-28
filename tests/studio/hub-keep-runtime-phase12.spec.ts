import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
test.skip(process.env.KEEP_NATIVE_BUILT !== '1','Original KEEP assets are absent in the regular Hub profile. Run dedicated Bun/crypto source qualification.');
for(const width of [390,1440]){
 test('authentic KEEP B3 compiled React mounts and securely releases original owner '+width,async({page})=>{
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto('/home/knowledge/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await page.evaluate(async()=>{
   await new Promise<void>((resolve,reject)=>{
    const req=indexedDB.open('KeepNotesDB',1);
    req.onupgradeneeded=()=>{
     const db=req.result;
     db.createObjectStore('notes',{keyPath:'id'});
     db.createObjectStore('folders',{keyPath:'id'});
     db.createObjectStore('saved_searches',{keyPath:'id'});
     db.createObjectStore('settings',{keyPath:'key'});
    };
    req.onerror=()=>reject(req.error);
    req.onsuccess=()=>{
     const db=req.result,tx=db.transaction('notes','readwrite');
     tx.objectStore('notes').add({
      id:'authentic-existing-keep-note',title:'Original KEEP record',
      content:'Original KEEP body',type:'text',checklist:[],color:'yellow',
      tags:['keep'],folderId:null,pinned:false,archived:false,trashed:false,
      createdAt:'2026-10-25T10:00:00Z',updatedAt:'2026-10-25T10:00:00Z',
      reminderDate:null,images:[],linkedNoteIds:[]
     });
     tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
    };
   });
  });
  page.once('dialog',d=>d.accept());
  await page.locator('[data-action="knowledge-native-start"]').click();
  await expect(page.locator('[data-keep-original-react-active="true"]')).toBeVisible({timeout:30000});
  await expect(page.locator('[data-keep-native-exit]')).toBeVisible();
  await expect(page.locator('[data-workspace-content]')).toBeHidden();
  await page.locator('[data-keep-native-exit]').click();
  await expect(page.locator('[data-keep-original-react-active="true"]')).toHaveCount(0);
  await expect(page.locator('[data-keep-native-frame]')).toBeHidden();
  await expect(page.locator('[data-hub-knowledge]')).toBeVisible();
  const notes=await page.evaluate(async()=>await new Promise<unknown[]>((resolve,reject)=>{
   const o=indexedDB.open('KeepNotesDB');
   o.onerror=()=>reject(o.error);
   o.onsuccess=()=>{const db=o.result,r=db.transaction('notes').objectStore('notes').getAll();r.onerror=()=>reject(r.error);
    r.onsuccess=()=>{db.close();resolve(r.result);};};
  }));
  expect(notes.some((note:any)=>note.id==='authentic-existing-keep-note'&&note.content==='Original KEEP body')).toBe(true);
 });
}
