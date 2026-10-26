import {test,expect} from '@playwright/test';
test.use({serviceWorkers:'block'});
for(const width of [390,1440]){
 test('KEEP source absent fails closed without new storage or copied notes '+width,async({page})=>{
  await page.setViewportSize({width,height:width===390?844:900});
  await page.goto('/home/knowledge/');
  await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
  await page.locator('[data-action="edit-note"]').first().click();
  await page.getByLabel('Title',{exact:true}).fill('Hub local surviving note');
  await page.getByLabel('Note',{exact:true}).fill('Hub-owned original remains in its store');
  await page.locator('[data-dialog-submit]').click();
  page.once('dialog',d=>d.accept());
  await page.locator('[data-action="knowledge-native-start"]').click();
  await expect(page.locator('[data-workspace-toast]')).toContainText('No original KEEP B3 v1 database exists');
  expect(await page.evaluate(async()=> (await indexedDB.databases()).some(x=>x.name==='KeepNotesDB'))).toBe(false);
  await expect(page.locator('[data-keep-native-frame]')).toBeHidden();
  await expect(page.locator('[data-hub-knowledge]')).toContainText('Hub local surviving note');
  await page.reload();
  await expect(page.locator('[data-hub-knowledge]')).toContainText('Hub local surviving note');
 });
}
test('existing KEEP database never migrates or initializes from an unqualified build',async({page})=>{
 await page.goto('/home/knowledge/');
 await expect(page.locator('[data-workspace-status]')).toHaveText('Workspace saved locally');
 await page.evaluate(async()=>await new Promise<void>((resolve,reject)=>{
  const request=indexedDB.open('KeepNotesDB',1);
  request.onupgradeneeded=()=>request.result.createObjectStore('notes',{keyPath:'id'});
  request.onerror=()=>reject(request.error);
  request.onsuccess=()=>{
   const db=request.result,tx=db.transaction('notes','readwrite');
   tx.objectStore('notes').put({id:'keep-original-unchanged',title:'KEEP original',content:'preserve bytes'});
   tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);
  };
 }));
 page.once('dialog',d=>d.accept());
 await page.locator('[data-action="knowledge-native-start"]').click();
 await expect(page.locator('[data-workspace-toast]')).toContainText('Original KEEP React source has not been built');
 const record=await page.evaluate(async()=>await new Promise<unknown>((resolve,reject)=>{
  const req=indexedDB.open('KeepNotesDB');
  req.onsuccess=()=>{const db=req.result,read=db.transaction('notes').objectStore('notes').get('keep-original-unchanged');read.onsuccess=()=>{db.close();resolve(read.result);};read.onerror=()=>reject(read.error);};
  req.onerror=()=>reject(req.error);
 }));
 expect(record).toEqual({id:'keep-original-unchanged',title:'KEEP original',content:'preserve bytes'});
 await expect(page.locator('[data-keep-native-frame]')).toBeHidden();
});
